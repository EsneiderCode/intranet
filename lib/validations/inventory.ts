import { z } from "zod";

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).optional().default(""),
  status: z.enum(["AVAILABLE", "IN_USE", "IN_REPAIR", "DECOMMISSIONED"]).default("AVAILABLE"),
  assignedToId: z.string().optional().nullable(),
  isElectronic: z.boolean().default(false),
  checklistBrokenParts: z.boolean({ required_error: "Indica si tiene partes rotas" }),
  checklistCase: z.boolean({ required_error: "Indica si tiene estuche" }),
  checklistCharger: z.boolean().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "IN_REPAIR", "DECOMMISSIONED"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

export const createTransferRequestSchema = z.object({
  itemId: z.string().min(1),
  toUserId: z.string().min(1, "Debes seleccionar un técnico destinatario"),
  reason: z.string().min(1, "El motivo es requerido").max(500),
  location: z.string().max(200).optional().default(""),
});

export const resolveTransferRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(500).optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type CreateTransferRequestInput = z.infer<typeof createTransferRequestSchema>;
export type ResolveTransferRequestInput = z.infer<typeof resolveTransferRequestSchema>;
