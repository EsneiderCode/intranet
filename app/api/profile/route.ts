import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/user";
import { uploadAvatar } from "@/lib/cloudinary";

// PATCH /api/profile — update own profile (any authenticated user)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // Avatar upload
    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG o WEBP" }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadAvatar(buffer, file.name);

      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: url },
        select: { avatarUrl: true },
      });

      return NextResponse.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al subir la imagen";
      console.error("[profile/avatar]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // JSON profile update
  const body = await req.json();
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? "",
      birthDate: new Date(data.birthDate),
      shirtSize: data.shirtSize,
      pantsSize: data.pantsSize ?? "",
      shoeSize: data.shoeSize ?? "",
      state: data.state ?? "",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      shirtSize: true,
      pantsSize: true,
      shoeSize: true,
      state: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(user);
}

// GET /api/profile — get own profile
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      shirtSize: true,
      pantsSize: true,
      shoeSize: true,
      state: true,
      avatarUrl: true,
      role: true,
      vacationDaysPerYear: true,
      vacationDaysCarryOver: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}
