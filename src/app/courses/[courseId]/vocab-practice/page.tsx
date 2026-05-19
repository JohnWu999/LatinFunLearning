import { notFound, redirect } from "next/navigation";
import { VocabPracticeClient } from "@/components/legacy/vocab-practice-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ type?: string }>;
};

type PracticeType = "latin-stems" | "classic-words" | "all";

function practiceTypeFromParam(value: string | undefined): PracticeType {
  if (value === "latin-stems" || value === "classic-words") return value;
  return "all";
}

function lessonMatchesPracticeType(lesson: { kind: string | null; order: number }, practiceType: PracticeType) {
  if (practiceType === "latin-stems") return lesson.kind === "LATIN_STEMS" || lesson.order % 2 === 1;
  if (practiceType === "classic-words") return lesson.kind === "CLASSIC_WORDS" || lesson.order % 2 === 0;
  return true;
}

export default async function VocabPracticePage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const { type } = await searchParams;
  const practiceType = practiceTypeFromParam(type);
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } }
        }
      }
    })
  ]);

  if (!course) notFound();
  const practicePath = `/courses/${course.slug}/vocab-practice${practiceType === "all" ? "" : `?type=${practiceType}`}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(practicePath)}`);

  const lessons = course.lessons.filter((lesson) => lessonMatchesPracticeType(lesson, practiceType));

  return (
    <VocabPracticeClient
      courseId={course.id}
      courseSlug={course.slug}
      isLoggedIn={Boolean(user)}
      lessons={lessons}
      practiceType={practiceType}
    />
  );
}
