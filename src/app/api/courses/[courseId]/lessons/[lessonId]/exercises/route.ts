import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { courseId, lessonId } = await params;
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: {
        OR: [{ id: lessonId }, { slug: lessonId }],
        course: {
          OR: [{ id: courseId }, { slug: courseId }]
        }
      }
    });
    const exercises = await prisma.exercise.findMany({
      where: { lessonId: lesson.id },
      orderBy: { order: "asc" }
    });
    return ok({ lesson, exercises });
  } catch (error) {
    return handleApiError(error);
  }
}
