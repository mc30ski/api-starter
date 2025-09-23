import type { Services } from "../types/services";

export const services: Services = {
  equipment: {
    async listAvailable() {
      return [{ name: "mower", description: "gas powered" }];
    },
  },
};
