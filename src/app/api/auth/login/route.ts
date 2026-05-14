import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { handleApiError, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { profile: true }
    });
    if (!user) return fail("Invalid email or password", 401);

    const validPassword = await compare(body.password, user.passwordHash);
    if (!validPassword) return fail("Invalid email or password", 401);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    const response = NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile
      }
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
