import type { Equipment } from "@prisma/client";

export type Role = "ADMIN" | "WORKER";

export type Services = {
  equipment: {
    listAvailable(): Promise<Equipment[]>;
  };
  users: {
    me(token: string): Promise<{
      id: string;
      isApproved: boolean;
      roles: Role[];
      email?: string | null;
      displayName?: string | null;
    }>;
  };
  currentUser: {
    me(clerkUserId: string): Promise<{
      id: string;
      isApproved: boolean;
      roles: Role[];
      email?: string | null;
      displayName?: string | null;
    }>;
  };
};
