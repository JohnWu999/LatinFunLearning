import { notFound, redirect } from "next/navigation";
import { ClassicWordsVideoPreview } from "@/components/classic-words-video-preview";
import { getCurrentUser } from "@/lib/auth";
import { lessonVocabulary } from "@/lib/lesson-vocabulary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function LessonOneVideoPreviewPage({ params }: Props) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}/classic-words/lesson-1-video`);

  const newWords = (lessonVocabulary[1] ?? []).filter((word) => word.group === "new");

  return (
    <main className="cw-video-page">
      <ClassicWordsVideoPreview words={newWords} />
    </main>
  );
}
