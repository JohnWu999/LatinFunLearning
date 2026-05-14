import { notFound } from "next/navigation";
import legacyCourse from "../../../../../data/legacy/caesars-english-ii.course.json";
import { StemBattleClient } from "@/components/legacy/stem-battle-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function BattlePage({ params }: Props) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] },
      include: {
        knowledge: {
          where: { type: "STEM" },
          orderBy: { sourceOrder: "asc" }
        },
        gameLevels: { orderBy: { order: "asc" } }
      }
    })
  ]);

  if (!course) notFound();

  const stems = course.knowledge.map((item) => ({
    id: item.id,
    key: item.key,
    meaning: item.meaning,
    examples: Array.isArray(item.examples) ? item.examples.map(String) : [],
    sourceOrder: item.sourceOrder
  }));

  return (
    <StemBattleClient
      buildQuestions={legacyCourse.buildQuestions}
      courseId={course.id}
      courseSlug={course.slug}
      isLoggedIn={Boolean(user)}
      levels={course.gameLevels}
      stems={stems}
      userName={user?.profile?.displayName ?? user?.name ?? "Guest"}
    />
  );
}
