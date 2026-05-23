import { notFound, redirect } from "next/navigation";
import { ClassicWordQuestClient } from "@/components/legacy/classic-word-quest-client";
import { getCurrentUser } from "@/lib/auth";
import { lessonVocabulary } from "@/lib/lesson-vocabulary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function SentenceForgePage({ params }: Props) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}/classic-word-quest/sentence-forge`);

  const words = Object.entries(lessonVocabulary).flatMap(([lesson, items]) =>
    items.map((item) => ({ ...item, lesson: Number(lesson) }))
  );

  return (
    <ClassicWordQuestClient
      courseId={course.id}
      courseSlug={course.slug}
      initialMode="sentence"
      userName={user.profile?.displayName ?? user.name}
      words={words}
    />
  );
}
