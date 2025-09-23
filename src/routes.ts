import { FastifyInstance } from "fastify";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/path", async () => ({ message: "Hello from /path" }));

  app.get("/path/another", async () => ({
    message: "Hello from /path/another",
  }));

  app.get("/path/:id/another", async (req, reply) => {
    const { id } = req.params as { id: string };
    return { message: `Hello from /path/${id}/another` };
  });
}
