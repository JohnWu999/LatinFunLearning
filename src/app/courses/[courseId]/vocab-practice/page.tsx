import { notFound } from "next/navigation";
import { VocabPracticeClient } from "@/components/legacy/vocab-practice-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function VocabPracticePage({ params }: Props) {
  const { courseId } = await params;
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

  return (
    <VocabPracticeClient
      courseId={course.id}
      courseSlug={course.slug}
      isLoggedIn={Boolean(user)}
      lessons={course.lessons}
    />
  );
}
