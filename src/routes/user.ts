import type { FastifyPluginAsync } from "fastify";

const userRoute: FastifyPluginAsync = async (fastify) => {
  fastify.register(
    async (userScope) => {
      // GET /user/:uid - fetch from Firebase Auth
      userScope.get("/:uid", async (request, reply) => {
        const { uid } = request.params as { uid: string };

        try {
          const userRecord = await fastify.firebase.auth().getUser(uid);

          return reply.send({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            disabled: userRecord.disabled
          });
        } catch (error) {
          request.log.error(error);
          return reply.status(404).send({ error, msg: "User not found" });
        }
      });

      // POST /user - save to Firestore
      userScope.post("/", async (request, reply) => {
        const body = request.body as {
          uid: string;
          name?: string;
          email?: string;
        };

        if (!body.uid) {
          return reply
            .status(400)
            .send({ error: "Missing uid in request body" });
        }

        try {
          await fastify.db
            .collection("users")
            .doc(body.uid)
            .set({
              name: body.name || null,
              email: body.email || null,
              createdAt: fastify.firebase.firestore.FieldValue.serverTimestamp()
            });

          return reply.send({ message: "User saved to database" });
        } catch (err) {
          request.log.error(err);
          return reply.status(500).send({ error: "Failed to save user" });
        }
      });
    },
    { prefix: "/user" }
  );
};

export default userRoute;
