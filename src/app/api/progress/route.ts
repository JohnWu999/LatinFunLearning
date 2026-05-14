import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId") ?? undefined;

    const progress = await prisma.learningProgress.findMany({
      where: { userId: user.id, courseId },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        lesson: { select: { id: true, slug: true, title: true } },
        knowledgePoint: true
      },
      orderBy: { updatedAt: "desc" }
    });

    return ok(progress);
  } catch (error) {
    return handleApiError(error);
  }
}
