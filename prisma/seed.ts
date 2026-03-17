import { PrismaClient, Role, ShirtSize } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GERMAN_STATES = [
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
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@umtelkomd.de" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "Umtelkomd",
      birthDate: new Date("1990-01-01"),
      email: "admin@umtelkomd.de",
      password: hashedPassword,
      phone: "+49 000 0000000",
      shirtSize: ShirtSize.L,
      pantsSize: "32x32",
      role: Role.ADMIN,
      state: "Berlin",
      mustChangePassword: true,
      isActive: true,
    },
  });

  console.log(`✅ Admin creado: ${admin.email}`);
  console.log(`📍 Estados disponibles: ${GERMAN_STATES.length} estados alemanes`);
  console.log("✅ Seed completado exitosamente.");
  console.log("\n🔑 Credenciales iniciales:");
  console.log("   Email: admin@umtelkomd.de");
  console.log("   Password: Admin1234!");
  console.log("   ⚠️  Cambia la contraseña en el primer login.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
