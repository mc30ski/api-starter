import { FastifyInstance } from "fastify";
import adminRoutes from "./routes/admin";

export async function registerRoutes(app: FastifyInstance) {
  await app.register((app: FastifyInstance) =>
    app.get("/", async () => "Use /api")
  );

  await app.register(
    async (api) => {
      await api.register(adminRoutes);
    },
    { prefix: "/api" }
  );
}
