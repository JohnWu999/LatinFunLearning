import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ game?: string }>;
};

export default async function ClassicWordQuestHubPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const query = await searchParams;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}/classic-word-quest`);
  if (query?.game === "detective") redirect(`/courses/${course.slug}/classic-word-quest/word-detective`);
  if (query?.game === "sentence") redirect(`/courses/${course.slug}/classic-word-quest/sentence-forge`);

  return (
    <main className="word-quest-page classic-word-quest-hub">
      <Link className="legacy-back battle-home-link" href={`/courses/${course.slug}`}>
        ← Learning Center
      </Link>

      <section className="word-quest-cover">
        <div className="battle-user">👤 {user.profile?.displayName ?? user.name ?? "player"}</div>
        <h1>Classic Word Quest</h1>
        <p>Practice classic words through fast play, clues, spelling, and gems.</p>
      </section>

      <section className="classic-word-quest-grid">
        <Link href={`/courses/${course.slug}/classic-word-quest/whack-a-word`}>
          <span>🔨</span>
          <strong>Whack-a-Word</strong>
          <p>Listen to the word, read three meanings, and strike the right one fast.</p>
          <em>Listening · meaning</em>
        </Link>
        <Link href={`/courses/${course.slug}/classic-word-quest/word-detective`}>
          <span>🕵</span>
          <strong>Word Detective</strong>
          <p>Use clues to identify the word, then spell it to solve the case.</p>
          <em>Meaning · spelling</em>
        </Link>
        <Link href={`/courses/${course.slug}/classic-word-quest/sentence-forge`}>
          <span>⚒</span>
          <strong>Sentence Forge</strong>
          <p>Read literary context and choose the classic word that completes the sentence.</p>
          <em>Context · application</em>
        </Link>
      </section>
    </main>
  );
}
