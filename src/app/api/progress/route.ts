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

    const practiceLessonProgress = courseId
      ? await completedPracticeLessons(user.id, courseId)
      : { rootsOfPower: [], classicWordTreasury: [] };

    return ok({ progress, practiceLessonProgress });
  } catch (error) {
    return handleApiError(error);
  }
}

async function completedPracticeLessons(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    include: { exercises: { select: { id: true, group: true } } },
    orderBy: { order: "asc" }
  });
  const lessonIds = lessons.map((lesson) => lesson.id);
  if (!lessonIds.length) return { rootsOfPower: [], classicWordTreasury: [] };

  const correctAttempts = await prisma.answerAttempt.findMany({
    where: {
      userId,
      courseId,
      lessonId: { in: lessonIds },
      isCorrect: true,
      gameMode: "vocab-practice"
    },
    select: { lessonId: true, exerciseId: true }
  });

  const correctByLesson = new Map<string, Set<string>>();
  correctAttempts.forEach((attempt) => {
    if (!attempt.lessonId || !attempt.exerciseId) return;
    const set = correctByLesson.get(attempt.lessonId) ?? new Set<string>();
    set.add(attempt.exerciseId);
    correctByLesson.set(attempt.lessonId, set);
  });

  const completed = lessons
    .filter((lesson) => {
      const requiredGroups = new Map<string, string[]>();
      lesson.exercises.forEach((exercise) => {
        const group = exercise.group ?? "context";
        if (!["matching", "context", "synonym", "antonym"].includes(group)) return;
        requiredGroups.set(group, [...(requiredGroups.get(group) ?? []), exercise.id]);
      });
      if (!requiredGroups.size) return false;
      const correctIds = correctByLesson.get(lesson.id) ?? new Set<string>();
      return [...requiredGroups.values()].every((exerciseIds) => exerciseIds.every((id) => correctIds.has(id)));
    })
    .map((lesson) => lesson.id);

  const rootsOfPower = lessons.filter((lesson) => completed.includes(lesson.id) && lesson.kind === "latin-stems").map((lesson) => lesson.id);
  const classicWordTreasury = lessons.filter((lesson) => completed.includes(lesson.id) && lesson.kind === "classic-words").map((lesson) => lesson.id);

  return { rootsOfPower, classicWordTreasury };
}
