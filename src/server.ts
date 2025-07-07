import { buildServer } from "./app";
import { env } from "./config/env";

const start = async () => {
  const fastify = buildServer();
  try {
    await fastify.listen({ port: parseInt(env.PORT), host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
