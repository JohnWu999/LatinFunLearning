import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const SUPER_ADMIN_EMAIL = "michellebaiyun@gmail.com";

const updateStudentSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(128).optional().or(z.literal(""))
});

type Params = {
  params: Promise<{ studentId: string }>;
};

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return fail("Forbidden", 403);
  return null;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    const { studentId } = await params;
    const body = updateStudentSchema.parse(await request.json());
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true }
    });
    if (!student || student.role !== "STUDENT") return fail("Student account not found", 404);

    const email = body.email?.trim().toLowerCase();
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== studentId) return fail("Email is already registered", 409);
    }

    const nextName = body.name?.trim();
    const passwordHash = body.password ? await hash(body.password, 12) : undefined;
    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        ...(email ? { email } : {}),
        ...(nextName ? { name: nextName } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        profile: nextName
          ? {
              upsert: {
                create: { displayName: nextName },
                update: { displayName: nextName }
              }
            }
          : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profile: { select: { displayName: true } }
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    const { studentId } = await params;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true }
    });
    if (!student || student.role !== "STUDENT") return fail("Student account not found", 404);

    await prisma.user.delete({ where: { id: studentId } });
    return NextResponse.json({ data: { id: studentId } });
  } catch (error) {
    return handleApiError(error);
  }
}
