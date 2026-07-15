import { z } from "zod";

export const createVehicleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  plate: z.string().max(20).default(""),
  description: z.string().max(500).default(""),
});

export const updateVehicleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plate: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
