import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const SUPER_ADMIN_EMAIL = "michellebaiyun@gmail.com";

const createStudentSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128)
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return fail("Forbidden", 403);
  return null;
}

export async function POST(request: Request) {
  try {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    const body = createStudentSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("Email is already registered", 409);

    const passwordHash = await hash(body.password, 12);
    const student = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash,
        role: "STUDENT",
        profile: {
          create: {
            displayName: body.name.trim()
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profile: { select: { displayName: true } }
      }
    });

    return NextResponse.json({ data: student }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
