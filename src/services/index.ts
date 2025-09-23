import { prisma } from "../db/prisma";
import type { Services } from "../types/services";
//import { Prisma, PrismaClient, EquipmentStatus } from "@prisma/client";

export const services: Services = {
  equipment: {
    async listAvailable() {
      return [];
    },
  },
};
