import { prisma } from "../db/prisma";
import type { Services } from "../types/services";
import { Role } from "../types/services";
import { Prisma, PrismaClient, EquipmentStatus } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY for server-side Clerk client");
}
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const services: Services = {
  equipment: {
    async listAvailable() {
      return prisma.equipment.findMany({
        where: {
          status: EquipmentStatus.AVAILABLE,
          checkouts: { none: { releasedAt: null } },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  },

  users: {
    async me(clerkUserId: string) {
      if (!clerkUserId) {
        return {
          id: "",
          isApproved: false,
          roles: [] as Role[],
          email: undefined,
          displayName: undefined,
        };
      }

      let user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: { roles: true },
      });

      if (!user) {
        let email: string | null = null;
        let displayName: string | null = null;

        try {
          const u = await clerk.users.getUser(clerkUserId);
          email =
            u.primaryEmailAddress?.emailAddress ??
            u.emailAddresses?.[0]?.emailAddress ??
            null;

          const name = [u.firstName, u.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          displayName = name || u.username || null;
        } catch {}

        await prisma.user.create({
          data: {
            clerkUserId,
            email: email ?? undefined,
            displayName: displayName ?? undefined,
            isApproved: false,
          },
        });

        user = await prisma.user.findUnique({
          where: { clerkUserId },
          include: { roles: true },
        });
      }

      return {
        id: user!.id,
        isApproved: !!user!.isApproved,
        roles: (user!.roles ?? []).map((r) => r.role) as Role[],
        email: user!.email ?? undefined,
        displayName: user!.displayName ?? undefined,
      };
    },
  },
};
