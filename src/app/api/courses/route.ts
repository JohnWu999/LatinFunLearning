import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            lessons: true,
            knowledge: true,
            vocabulary: true,
            exercises: true,
            gameLevels: true
          }
        }
      }
    });
    return ok(courses);
  } catch (error) {
    return handleApiError(error);
  }
}
