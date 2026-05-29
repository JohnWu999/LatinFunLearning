import { hash } from "bcryptjs";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { handleApiError, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

const PURPOSE = "register";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("Email is already registered", 409);

    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: PURPOSE,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!verification) return fail("Verification code is missing or expired", 400);
    const validCode = await compare(body.verificationCode, verification.codeHash);
    if (!validCode) return fail("Verification code is incorrect", 400);

    const passwordHash = await hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash,
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
        profile: true
      }
    });
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() }
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
