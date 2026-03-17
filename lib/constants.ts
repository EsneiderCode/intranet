export const GERMAN_STATES = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

export type GermanState = (typeof GERMAN_STATES)[number];

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

export const ROLES = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
} as const;

export const ITEM_STATUS = {
  AVAILABLE: "AVAILABLE",
  IN_USE: "IN_USE",
  IN_REPAIR: "IN_REPAIR",
  DECOMMISSIONED: "DECOMMISSIONED",
} as const;

export const ITEM_STATUS_COLORS = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  IN_USE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_REPAIR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DECOMMISSIONED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
} as const;

export const ITEM_STATUS_LABELS_ES = {
  AVAILABLE: "Disponible",
  IN_USE: "En uso",
  IN_REPAIR: "En reparación",
  DECOMMISSIONED: "Dado de baja",
} as const;

export const VACATION_STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
} as const;

export const APP_NAME = "Umtelkomd";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://umtelkomd.net";

export const NAV_LINKS = {
  dashboard: "/",
  inventory: "/inventory",
  vacations: "/vacations",
  users: "/users",
  reports: "/reports",
  settings: "/settings",
  profile: "/profile",
} as const;
