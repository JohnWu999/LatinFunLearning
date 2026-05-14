import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(user.profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = profileSchema.parse(await request.json());
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...body
      },
      update: body
    });
    return ok(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
