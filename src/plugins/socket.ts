import fp from "fastify-plugin";
import fastifySocketIO from "fastify-socket.io";
import { Socket } from "socket.io";

export default fp(async (fastify) => {
  fastify.register(fastifySocketIO, { cors: { origin: "*" } });

  fastify.after(() => {
    const io = fastify.io;
    let streamerSocket: Socket | null = null;
    const viewerConnections = new Map<string, boolean>(); // track if viewer has active offer

    io.on("connection", (socket: Socket) => {
      fastify.log.info(`✅ Client connected: ${socket.id}`);

      socket.on("join-room", (role: string) => {
        if (role === "streamer") {
          streamerSocket = socket;
          fastify.log.info(`🎥 ${socket.id} registered as streamer`);
        } else if (role === "viewer") {
          if (!viewerConnections.has(socket.id)) {
            viewerConnections.set(socket.id, false);
          }
          fastify.log.info(`👀 ${socket.id} joined as viewer`);

          // Only create offer if streamer exists & viewer is not already in process
          if (streamerSocket && viewerConnections.get(socket.id) === false) {
            viewerConnections.set(socket.id, true);
            streamerSocket.emit("create-offer", { viewerId: socket.id });
          }
        }
      });

      socket.on("offer", ({ sdp, viewerId }) => {
        fastify.log.info(`📡 Offer from streamer to ${viewerId}`);
        io.to(viewerId).emit("offer", { sdp });
      });

      socket.on("answer", ({ sdp, viewerId }) => {
        fastify.log.info(`🎯 Answer from ${socket.id} to streamer`);
        streamerSocket?.emit("answer", { sdp, viewerId: socket.id });

        // Mark viewer as fully connected
        viewerConnections.set(socket.id, true);
      });

      socket.on("ice-candidate", (data) => {
        if (data.to) {
          // Handle routing ICE candidates
          if (data.to === "streamer" && streamerSocket) {
            // Viewer sending to streamer
            streamerSocket.emit("ice-candidate", {
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
              from: socket.id
            });
            fastify.log.info(`🧊 ICE from viewer ${socket.id} to streamer`);
          } else {
            // Streamer sending to specific viewer
            io.to(data.to).emit("ice-candidate", {
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
              from: socket.id
            });
            fastify.log.info(`🧊 ICE from streamer to viewer ${data.to}`);
          }
        }
      });

      socket.on("disconnect", () => {
        fastify.log.info(`⛔ Disconnected: ${socket.id}`);

        if (streamerSocket?.id === socket.id) {
          streamerSocket = null;
          fastify.log.info(`🚨 Streamer disconnected`);
        }

        if (viewerConnections.has(socket.id)) {
          viewerConnections.delete(socket.id);
          fastify.log.info(`🗑 Removed viewer ${socket.id} from active map`);
        }
      });
    });
  });
});
