import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { services } from "../services";
import { Role as RoleVal } from "@prisma/client";

export default async function adminRoutes(app: FastifyInstance) {
  const adminGuard = {
    //TODO:
    //preHandler: (req: FastifyRequest, reply: FastifyReply) =>
    //  app.requireRole(req, reply, RoleVal.ADMIN),
  };

  app.get("/admin/equipment", adminGuard, async () =>
    services.equipment.listAvailable()
  );
}
