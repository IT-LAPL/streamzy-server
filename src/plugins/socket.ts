import fp from "fastify-plugin";
import fastifySocketIO from "fastify-socket.io";
import { Socket } from "socket.io";

export default fp(async (fastify) => {
  fastify.register(fastifySocketIO, {
    cors: { origin: "*" }
  });

  fastify.after(() => {
    const io = fastify.io;

    io.on("connection", (socket: Socket) => {
      fastify.log.info(`✅ Client connected: ${socket.id}`);

      socket.on("join-room", (room: string) => {
        fastify.log.info(`🚪 ${socket.id} joined room ${room}`);
        socket.join(room);
      });

      socket.on("offer", (data: { sdp: string }) => {
        fastify.log.info(
          `📡 Offer from ${socket.id}: ${data.sdp.slice(0, 30)}...`
        );
        socket.to("stream-room").emit("offer", { sdp: data.sdp });
      });

      socket.on("answer", (data: { sdp: string }) => {
        fastify.log.info(`🎯 Answer from ${socket.id}`);
        socket.to("stream-room").emit("answer", { sdp: data.sdp });
      });

      socket.on(
        "ice-candidate",
        (data: {
          candidate: string;
          sdpMid: string;
          sdpMLineIndex: number;
        }) => {
          fastify.log.info(`❄️ ICE candidate from ${socket.id}`);
          socket.to("stream-room").emit("ice-candidate", data);
        }
      );

      socket.on("disconnect", () => {
        fastify.log.info(`⛔ Client disconnected: ${socket.id}`);
      });
    });
  });
});
