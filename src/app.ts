import Fastify from "fastify";
import firebase from "./plugins/firebase";
import healthRoute from "./routes/health";
import userRoute from "./routes/user";

export function buildServer() {
  const fastify = Fastify({
    logger: {
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
  });

  fastify.register(firebase);
  fastify.register(healthRoute);
  fastify.register(userRoute);

  return fastify;
}
