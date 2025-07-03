import fs from "node:fs";
import fp from "fastify-plugin";
import admin from "firebase-admin";
import { env } from "../config/env";

export default fp(async (fastify) => {
  const serviceAccountPath = env.FIREBASE_CREDENTIALS;
  if (!serviceAccountPath) {
    throw new Error("Missing FIREBASE_CREDENTIALS in .env");
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  fastify.decorate("firebase", admin);
  fastify.decorate("db", admin.firestore());
});

declare module "fastify" {
  interface FastifyInstance {
    firebase: typeof admin;
    db: admin.firestore.Firestore;
  }
}
