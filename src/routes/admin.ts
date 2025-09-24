import { FastifyInstance } from "fastify";
import { services } from "../services";

export default async function adminRoutes(app: FastifyInstance) {
  //TODO:
  const adminGuard = {
    preHandler: [
      (app as any).requireRole.bind(app, undefined, undefined, "ADMIN"),
    ],
  };

  app.get("/admin/equipment", adminGuard, async () =>
    services.equipment.listAvailable()
  );
}
