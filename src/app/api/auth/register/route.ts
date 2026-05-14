import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { handleApiError, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return fail("Email is already registered", 409);

    const passwordHash = await hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        profile: {
          create: {
            displayName: body.name
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profile: true
      }
    });

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const response = NextResponse.json({ data: user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
