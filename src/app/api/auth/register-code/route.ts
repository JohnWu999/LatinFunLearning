import { hash } from "bcryptjs";
import { randomInt } from "crypto";
import { handleApiError, fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { emailVerificationRequestSchema } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";

const PURPOSE = "register";
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(request: Request) {
  try {
    const body = emailVerificationRequestSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return fail("Email is already registered", 409);

    const recentCode = await prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: PURPOSE,
        consumedAt: null,
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) }
      },
      orderBy: { createdAt: "desc" }
    });
    if (recentCode) return fail("Please wait before requesting another code", 429);

    const code = String(randomInt(100000, 1000000));
    const codeHash = await hash(code, 12);
    await prisma.emailVerification.create({
      data: {
        email,
        codeHash,
        purpose: PURPOSE,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)
      }
    });

    const result = await sendVerificationEmail({ email, code });
    return ok({
      delivered: result.delivered,
      message: result.delivered
        ? "Verification code sent."
        : "Verification code created. SMTP is not configured in this environment."
    });
  } catch (error) {
    return handleApiError(error);
  }
}
