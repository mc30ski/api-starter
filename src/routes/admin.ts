import { FastifyInstance } from "fastify";
import { services } from "../services";
import { Role as RoleVal } from "@prisma/client";

export default async function adminRoutes(app: FastifyInstance) {
  //TODO:
  const adminGuard = {
    preHandler: [
      (app as any).requireRole.bind(app, undefined, undefined, RoleVal.ADMIN),
    ],
  };

  app.get("/admin/equipment", adminGuard, async () =>
    services.equipment.listAvailable()
  );
}
