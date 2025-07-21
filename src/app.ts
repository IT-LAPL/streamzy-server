import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import firebase from "./plugins/firebase";
import healthRoute from "./routes/health";
import userRoute from "./routes/user";
import signaling from "./plugins/socket";

export function buildServer() {
  const isDev = process.env.NODE_ENV !== "production";

  const fastify = Fastify({
    logger: isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              singleLine: true
            }
          }
        }
      : true // simple production logger
  });

  fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });

  fastify.register(firebase);
  fastify.register(signaling);
  fastify.register(healthRoute);
  fastify.register(userRoute);

  return fastify;
}
