import type { Equipment } from "@prisma/client";

export type Role = "ADMIN" | "WORKER";

export type Services = {
  equipment: {
    listAvailable(): Promise<Equipment[]>;
  };
  users: {
    // Snapshot for user for the client application.
    me(clerkUserId: string): Promise<{
      id: string;
      isApproved: boolean;
      roles: Role[];
      email?: string | null;
      displayName?: string | null;
    }>;
  };
};
