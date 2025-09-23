export type Equipment = {
  name: string;
  description: string;
};

export type Services = {
  equipment: {
    listAvailable(): Promise<Equipment[]>;
  };
};
