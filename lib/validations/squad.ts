import { z } from "zod";

export const createSquadSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).default(""),
});

export const updateSquadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateSquadMembersSchema = z.object({
  memberIds: z.array(z.string()),
});
