import fp from "fastify-plugin";
import fastifySocketIO from "fastify-socket.io";
import { Socket } from "socket.io";

export default fp(async (fastify) => {
  fastify.register(fastifySocketIO, {
    cors: { origin: "*" }
  });

  fastify.after(() => {
    const io = fastify.io;

    let streamerSocket: Socket | null = null;

    io.on("connection", (socket: Socket) => {
      fastify.log.info(`✅ Client connected: ${socket.id}`);

      socket.on("join-room", (role: string) => {
        if (role === "streamer") {
          fastify.log.info(`📹 ${socket.id} registered as streamer`);
          streamerSocket = socket;
        } else if (role === "viewer") {
          fastify.log.info(`👀 ${socket.id} registered as viewer`);
          socket.emit("request-offer");
          if (streamerSocket) {
            streamerSocket.emit("create-offer", { viewerId: socket.id });
          }
        }
      });

      socket.on("offer", ({ sdp, viewerId }) => {
        fastify.log.info(`📡 Offer from streamer for viewer ${viewerId}`);
        io.to(viewerId).emit("offer", { sdp });
      });

      socket.on("answer", ({ sdp, viewerId }) => {
        fastify.log.info(`🎯 Answer from viewerId: ${socket.id} to streamer`);
        if (streamerSocket) {
          streamerSocket.emit("answer", { sdp, viewerId: socket.id });
        }
      });

      socket.on("ice-candidate", (data) => {
        if (data.to) {
          io.to(data.to).emit("ice-candidate", {
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex,
            from: socket.id
          });
        }
      });

      socket.on("disconnect", () => {
        fastify.log.info(`⛔ Client disconnected: ${socket.id}`);
        if (streamerSocket?.id === socket.id) {
          streamerSocket = null;
        }
      });
    });
  });
});
