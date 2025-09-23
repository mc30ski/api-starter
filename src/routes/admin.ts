import { FastifyInstance } from "fastify";
import { services } from "../services";

export default async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/equipment", async () => services.equipment.listAvailable());
}
