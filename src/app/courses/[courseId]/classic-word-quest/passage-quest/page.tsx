import { notFound, redirect } from "next/navigation";
import { ClassicWordQuestClient } from "@/components/legacy/classic-word-quest-client";
import { getCurrentUser } from "@/lib/auth";
import { lessonVocabulary } from "@/lib/lesson-vocabulary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ target?: string; targets?: string; returnTo?: string; reviewCategory?: string }>;
};

export default async function PassageQuestPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const query = await searchParams;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] }
    })
  ]);

  if (!course) notFound();
  const reviewWordKeys = reviewKeysFromQuery(query);
  const targetQuery = reviewQueryString(query);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/courses/${course.slug}/classic-word-quest/passage-quest${targetQuery}`)}`);

  const words = Object.entries(lessonVocabulary).flatMap(([lesson, items]) =>
    items.map((item) => ({ ...item, lesson: Number(lesson) }))
  );

  return (
    <ClassicWordQuestClient
      courseId={course.id}
      courseSlug={course.slug}
      initialMode="passage"
      reviewWordKey={query?.target}
      reviewWordKeys={reviewWordKeys}
      returnTo={query?.returnTo}
      reviewCategory={reviewCategoryFromQuery(query)}
      userName={user.profile?.displayName ?? user.name}
      words={words}
    />
  );
}

function reviewKeysFromQuery(query?: { target?: string; targets?: string }) {
  return [query?.target, ...(query?.targets?.split(",") ?? [])]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key));
}

function reviewQueryString(query?: { target?: string; targets?: string; returnTo?: string; reviewCategory?: string }) {
  const params = new URLSearchParams();
  if (query?.target) params.set("target", query.target);
  if (query?.targets) params.set("targets", query.targets);
  if (query?.returnTo) params.set("returnTo", query.returnTo);
  if (query?.reviewCategory) params.set("reviewCategory", query.reviewCategory);
  const search = params.toString();
  return search ? `?${search}` : "";
}

function reviewCategoryFromQuery(query?: { reviewCategory?: string }) {
  return query?.reviewCategory === "Sentence Writing" ? "Sentence Writing" : "Classic Words";
}
