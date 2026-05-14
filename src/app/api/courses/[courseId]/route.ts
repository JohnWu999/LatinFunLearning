import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { courseId } = await params;
    const course = await prisma.course.findFirstOrThrow({
      where: {
        OR: [{ id: courseId }, { slug: courseId }]
      },
      include: {
        units: { orderBy: { order: "asc" } },
        lessons: { orderBy: { order: "asc" } },
        gameLevels: { orderBy: { order: "asc" } },
        _count: {
          select: {
            knowledge: true,
            vocabulary: true,
            exercises: true
          }
        }
      }
    });
    return ok(course);
  } catch (error) {
    return handleApiError(error);
  }
}
