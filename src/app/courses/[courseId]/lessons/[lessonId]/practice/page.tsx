import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

function practiceTypeForLesson(lesson: { kind: string | null; order: number }) {
  if (lesson.kind === "LATIN_STEMS" || lesson.order % 2 === 1) return "latin-stems";
  if (lesson.kind === "CLASSIC_WORDS" || lesson.order % 2 === 0) return "classic-words";
  return "all";
}

export default async function LessonPracticeRedirectPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const [user, lesson] = await Promise.all([
    getCurrentUser(),
    prisma.lesson.findFirst({
      where: {
        OR: [{ id: lessonId }, { slug: lessonId }],
        course: { OR: [{ id: courseId }, { slug: courseId }] }
      },
      include: { course: true }
    })
  ]);

  if (!lesson) notFound();

  const target = `/courses/${lesson.course.slug}/vocab-practice?type=${practiceTypeForLesson(lesson)}&lesson=${lesson.slug}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  redirect(target);
}
