import { z } from "zod";
import { GERMAN_STATES, SHIRT_SIZES } from "@/lib/constants";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(50),
  lastName: z.string().min(1, "El apellido es requerido").max(50),
  email: z.string().email("Email inválido"),
  phone: z.string().max(30).optional().default(""),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  shirtSize: z.enum(SHIRT_SIZES),
  pantsSize: z.string().max(20).optional().default(""),
  shoeSize: z.string().max(10).optional().default(""),
  role: z.enum(["ADMIN", "TECHNICIAN"]).default("TECHNICIAN"),
  state: z.enum(GERMAN_STATES as unknown as [string, ...string[]]).or(z.literal("")),
  vacationDaysPerYear: z.coerce.number().int().min(0).max(365).default(25),
  vacationDaysCarryOver: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateUserSchema = createUserSchema.partial().omit({ email: true });

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(50),
  lastName: z.string().min(1, "El apellido es requerido").max(50),
  phone: z.string().max(30).optional().default(""),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  shirtSize: z.enum(SHIRT_SIZES),
  pantsSize: z.string().max(20).optional().default(""),
  shoeSize: z.string().max(10).optional().default(""),
  state: z.enum(GERMAN_STATES as unknown as [string, ...string[]]).or(z.literal("")),
});

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
      .regex(/[0-9]/, "Debe tener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
