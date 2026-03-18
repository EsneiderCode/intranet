import { z } from "zod";

export const createVacationRequestSchema = z
  .object({
    startDate: z.string().min(1, "La fecha de inicio es requerida"),
    endDate: z.string().min(1, "La fecha de fin es requerida"),
    description: z.string().max(500).optional().default(""),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    {
      message: "La fecha de fin debe ser igual o posterior a la de inicio",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.startDate) return true;
      const today = new Date().toISOString().slice(0, 10);
      return data.startDate >= today;
    },
    {
      message: "La fecha de inicio no puede ser en el pasado",
      path: ["startDate"],
    }
  );

export const resolveVacationRequestSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    adminNote: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.adminNote?.trim()) return false;
      return true;
    },
    {
      message: "El motivo de rechazo es obligatorio",
      path: ["adminNote"],
    }
  );

export const createHolidaySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  date: z.string().min(1, "La fecha es requerida"),
  states: z.array(z.string()).default([]),
});

export const assignHolidaySchema = z.object({
  holidayId: z.string().min(1),
  userIds: z.array(z.string()),
});

export type CreateVacationRequestInput = z.infer<typeof createVacationRequestSchema>;
export type ResolveVacationRequestInput = z.infer<typeof resolveVacationRequestSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export type AssignHolidayInput = z.infer<typeof assignHolidaySchema>;
