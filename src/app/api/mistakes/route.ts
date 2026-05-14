import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId") ?? undefined;

    const mistakes = await prisma.mistakeRecord.findMany({
      where: {
        userId: user.id,
        courseId,
        mastered: false
      },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        lesson: { select: { id: true, slug: true, title: true } },
        exercise: true,
        knowledgePoint: true
      },
      orderBy: { lastSeenAt: "desc" }
    });

    return ok(mistakes);
  } catch (error) {
    return handleApiError(error);
  }
}
