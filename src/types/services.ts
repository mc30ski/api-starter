import type { Equipment } from "@prisma/client";

export type Services = {
  equipment: {
    listAvailable(): Promise<Equipment[]>;
  };
};
