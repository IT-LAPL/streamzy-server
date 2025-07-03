import { type FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_, reply) => {
    const healthInfo = {
      status: "ok",
      uptime: process.uptime(),
      memory:
        Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100 +
        "MB",
      timestamp: new Date().toISOString()
    };

    reply.header("Cache-Control", "no-store").send(healthInfo);
  });
};

export default healthRoute;
