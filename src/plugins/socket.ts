import fp from "fastify-plugin";
import fastifySocketIO from "fastify-socket.io";
import type { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import { Socket } from "socket.io";

interface StreamRoom {
  streamerId: string;
  streamerSocket: Socket;
  viewers: Map<string, Socket>;
}

export default fp(async (fastify) => {
  fastify.register(fastifySocketIO, { cors: { origin: "*" } });

  fastify.after(() => {
    const io = fastify.io;
    const activeStreams = new Map<string, StreamRoom>(); // streamerId -> StreamRoom

    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token as string;
      if (!token) return next(new Error("Authentication Required"));

      try {
        const decoded = await fastify.firebase.auth().verifyIdToken(token);

        socket.data.user = decoded;
        next();
      } catch (error) {
        fastify.log.error("socket auth failed: ", error);
        return next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket: Socket) => {
      const user = socket.data.user as DecodedIdToken;
      fastify.log.info(`✅ Client connected: ${socket.id} | UID: ${user.uid}`);

      socket.on("join-room", (data: { role: string; streamerId: string }) => {
        const { role, streamerId } = data;

        if (role === "streamer") {
          // Create new stream room
          const streamRoom: StreamRoom = {
            streamerId,
            streamerSocket: socket,
            viewers: new Map()
          };

          activeStreams.set(streamerId, streamRoom);
          socket.join(`stream_${streamerId}`);

          fastify.log.info(
            `🎥 Streamer ${socket.id} started stream ${streamerId}`
          );
        } else if (role === "viewer") {
          const streamRoom = activeStreams.get(streamerId);

          if (!streamRoom) {
            fastify.log.warn(
              `❌ Viewer ${socket.id} tried to join non-existent stream ${streamerId}`
            );
            socket.emit("error", { message: "Stream not found" });
            return;
          }

          // Add viewer to stream room
          streamRoom.viewers.set(socket.id, socket);
          socket.join(`stream_${streamerId}`);

          fastify.log.info(
            `👀 Viewer ${socket.id} joined stream ${streamerId}`
          );

          // Request offer from streamer for this viewer
          streamRoom.streamerSocket.emit("create-offer", {
            viewerId: socket.id
          });
        }
      });

      socket.on("offer", ({ sdp, viewerId, streamerId }) => {
        const streamRoom = activeStreams.get(streamerId);
        if (!streamRoom) {
          fastify.log.warn(`❌ Offer for non-existent stream ${streamerId}`);
          return;
        }

        const viewerSocket = streamRoom.viewers.get(viewerId);
        if (viewerSocket) {
          fastify.log.info(
            `📡 Offer from streamer ${streamerId} to viewer ${viewerId}`
          );
          viewerSocket.emit("offer", { sdp, streamerId });
        }
      });

      socket.on("answer", ({ sdp, viewerId, streamerId }) => {
        const streamRoom = activeStreams.get(streamerId);
        if (!streamRoom) {
          fastify.log.warn(`❌ Answer for non-existent stream ${streamerId}`);
          return;
        }

        fastify.log.info(
          `🎯 Answer from viewer ${socket.id} to streamer ${streamerId}`
        );
        streamRoom.streamerSocket.emit("answer", {
          sdp,
          viewerId: socket.id,
          streamerId
        });
      });

      socket.on("ice-candidate", (data) => {
        const { streamerId } = data;
        const streamRoom = activeStreams.get(streamerId);

        if (!streamRoom) {
          fastify.log.warn(
            `❌ ICE candidate for non-existent stream ${streamerId}`
          );
          return;
        }

        if (data.to === streamerId) {
          // Viewer sending ICE to streamer
          streamRoom.streamerSocket.emit("ice-candidate", {
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex,
            from: socket.id,
            streamerId
          });
          fastify.log.info(
            `🧊 ICE from viewer ${socket.id} to streamer ${streamerId}`
          );
        } else {
          // Streamer sending ICE to specific viewer
          const viewerSocket = streamRoom.viewers.get(data.to);
          if (viewerSocket) {
            viewerSocket.emit("ice-candidate", {
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
              from: socket.id,
              streamerId
            });
            fastify.log.info(
              `🧊 ICE from streamer ${streamerId} to viewer ${data.to}`
            );
          }
        }
      });

      socket.on("disconnect", () => {
        fastify.log.info(`⛔ Disconnected: ${socket.id}`);

        // Check if disconnected socket was a streamer
        for (const [streamerId, streamRoom] of activeStreams.entries()) {
          if (streamRoom.streamerSocket.id === socket.id) {
            // Streamer disconnected - notify all viewers and clean up
            fastify.log.info(`🚨 Streamer ${streamerId} disconnected`);

            // Notify all viewers that stream ended
            streamRoom.viewers.forEach((viewerSocket) => {
              viewerSocket.emit("stream-ended", { streamerId });
            });

            // Clean up stream room
            activeStreams.delete(streamerId);
            break;
          }
        }

        // Check if disconnected socket was a viewer
        for (const streamRoom of activeStreams.values()) {
          if (streamRoom.viewers.has(socket.id)) {
            streamRoom.viewers.delete(socket.id);
            fastify.log.info(
              `🗑 Removed viewer ${socket.id} from stream ${streamRoom.streamerId}`
            );
            break;
          }
        }
      });

      // Handle stream ending explicitly
      socket.on("end-stream", (data: { streamerId: string }) => {
        const streamRoom = activeStreams.get(data.streamerId);
        if (streamRoom && streamRoom.streamerSocket.id === socket.id) {
          fastify.log.info(`🛑 Stream ${data.streamerId} ended by streamer`);

          // Notify all viewers
          streamRoom.viewers.forEach((viewerSocket) => {
            viewerSocket.emit("stream-ended", { streamerId: data.streamerId });
          });

          // Clean up
          activeStreams.delete(data.streamerId);
        }
      });
    });

    // Periodic cleanup of inactive streams (optional)
    setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds timeout

      for (const [streamerId, streamRoom] of activeStreams.entries()) {
        if (!streamRoom.streamerSocket.connected) {
          fastify.log.info(`🧹 Cleaning up inactive stream ${streamerId}`);
          activeStreams.delete(streamerId);
        }
      }
    }, 10000); // Check every 10 seconds
  });
});
