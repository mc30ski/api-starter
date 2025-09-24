import { prisma } from "../db/prisma";
import type { Services } from "../types/services";
import { Role } from "../types/services";
import { Prisma, PrismaClient, EquipmentStatus } from "@prisma/client";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { Role as RoleVal } from "@prisma/client";
import { ServiceError } from "../lib/errors";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY for server-side Clerk client");
}
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ---- helpers ---------------------------------------------------------------

function parseBootstrapList() {
  return (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------

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
    // Implements a GET /me endpoint that authenticates with Clerk (via header or cookie),
    // ensures there’s a matching user in your Prisma DB, optionally bootstraps ADMIN/WORKER roles based on an env list,
    // then returns a normalized “me” object.
    async me(token: string) {
      // Verify token with Clerk
      let clerkUserId: string;
      try {
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        clerkUserId = String((payload as any).sub);
        if (!clerkUserId) throw new Error("Missing sub in token");
      } catch (err) {
        throw new ServiceError("UNAUTHORIZED", "Invalid token", 401);
      }

      // Fetch Clerk profile (for email/displayName + bootstrap check)
      let fetchedEmail: string | undefined;
      let fetchedDisplayName: string | undefined;
      try {
        if (clerk) {
          const u = await clerk.users.getUser(clerkUserId);
          fetchedEmail =
            u.primaryEmailAddress?.emailAddress ??
            u.emailAddresses?.[0]?.emailAddress ??
            undefined;
          const name = [u.firstName, u.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          fetchedDisplayName = (name || u.username || undefined) ?? undefined;
        }
      } catch (e) {
        console.warn(
          { clerkUserId, error: (e as Error).message },
          "[/me] Clerk profile fetch failed (continuing)"
        );
      }

      // Ensure local DB user exists (create if missing)
      let user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: { roles: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkUserId,
            email: fetchedEmail,
            displayName: fetchedDisplayName,
            isApproved: false,
          },
          include: { roles: true },
        });
      } else if (
        (!user.email || !user.displayName) &&
        (fetchedEmail || fetchedDisplayName)
      ) {
        user = await prisma.user.update({
          where: { clerkUserId },
          data: {
            email: user.email ?? fetchedEmail,
            displayName: user.displayName ?? fetchedDisplayName,
          },
          include: { roles: true },
        });
      }

      // Bootstrap admins via ADMIN_BOOTSTRAP_EMAILS (idempotent)
      const bootstrapEmails = parseBootstrapList();
      const normalizedEmail = (user.email ?? fetchedEmail ?? "").toLowerCase();
      const shouldBootstrap =
        normalizedEmail && bootstrapEmails.includes(normalizedEmail);

      if (shouldBootstrap) {
        await prisma.$transaction(async (tx) => {
          if (!user!.isApproved) {
            await tx.user.update({
              where: { id: user!.id },
              data: { isApproved: true },
            });
          }
          await tx.userRole.upsert({
            where: { userId_role: { userId: user!.id, role: RoleVal.WORKER } },
            update: {},
            create: { userId: user!.id, role: RoleVal.WORKER },
          });
          await tx.userRole.upsert({
            where: { userId_role: { userId: user!.id, role: RoleVal.ADMIN } },
            update: {},
            create: { userId: user!.id, role: RoleVal.ADMIN },
          });
        });
        user = await prisma.user.findUnique({
          where: { clerkUserId },
          include: { roles: true },
        });
      }

      // Respond
      const me = {
        id: user!.id,
        isApproved: !!user!.isApproved,
        roles: (user!.roles ?? []).map((r) => r.role) as Role[],
        email: user!.email ?? null,
        displayName: user!.displayName ?? null,
      };

      return me;
    },
  },

  currentUser: {
    // The “current user” (aka "me") service.
    // Given a Clerk user ID, it loads or lazily creates a matching User row in your DB (with isApproved: false by default),
    // pulls email/display name from Clerk on first sight, and returns a normalized shape with the user’s roles.
    // Note: Not a route, used by the 'rbac.ts' Fastify plugin.
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
