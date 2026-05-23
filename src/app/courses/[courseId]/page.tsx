import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] },
      include: {
        knowledge: {
          where: { type: "STEM" },
          select: { id: true }
        },
        lessons: { orderBy: { order: "asc" } },
        _count: { select: { vocabulary: true } }
      }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}`);

  const latinStemLessons = course.lessons.filter((lesson) => lesson.kind === "LATIN_STEMS");
  const classicWordLessons = course.lessons.filter((lesson) => lesson.kind === "CLASSIC_WORDS");

  return (
    <main className="legacy-page embedded">
      <section className="legacy-cover compact">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>Classic WordLab</h1>
        <div className="legacy-subtitle">Classical Vocabulary Studio</div>
        <div className="legacy-gold-line" />
        <p>Classical Vocabulary · Latin Stems · Interactive Quests</p>
      </section>

      <section className="legacy-container">
        <div className="legacy-module-grid">
          <div className="legacy-module-row-label latin-track">
            <span>Latin Stem Track</span>
            <strong>Build root power first, then train through games.</strong>
          </div>
          <Link href={`/courses/${course.slug}/latin-stems`} className="legacy-module-card">
            <span>🌿</span>
            <strong>Latin Stem</strong>
            <p>Explore Latin stems, meanings, and modern English examples.</p>
            <em>{course.knowledge.length} stems</em>
          </Link>
          <Link href={`/courses/${course.slug}/vocab-practice?type=latin-stems`} className="legacy-module-card">
            <span>✏️</span>
            <strong>Roots of Power</strong>
            <p>Practice Latin stems by lesson with matching, context choices, and instant feedback.</p>
            <em>{latinStemLessons.length} stem lessons</em>
          </Link>
          <Link href={`/courses/${course.slug}/battle`} className="legacy-module-card">
            <span>🎮</span>
            <strong>Stem Battle</strong>
            <p>Master stems, meanings, and examples through interactive game challenges.</p>
            <em>Stem quests</em>
          </Link>
          <div className="legacy-module-row-label classic-track">
            <span>Classic Words Track</span>
            <strong>Move from word study to understanding, practice, and application.</strong>
          </div>
          <Link href={`/courses/${course.slug}/classic-words`} className="legacy-module-card">
            <span>📚</span>
            <strong>Classic Words</strong>
            <p>Study classic words by unit with pronunciation, definitions, literary sources, synonyms, and antonyms.</p>
            <em>{course._count.vocabulary} words</em>
          </Link>
          <Link href={`/courses/${course.slug}/vocab-practice?type=classic-words`} className="legacy-module-card">
            <span>📝</span>
            <strong>Classic Word Treasury</strong>
            <p>Practice classic words by lesson through context choices, synonyms, antonyms, and instant feedback.</p>
            <em>{classicWordLessons.length} word lessons</em>
          </Link>
          <Link href={`/courses/${course.slug}/classic-word-quest`} className="legacy-module-card">
            <span>🧭</span>
            <strong>Classic Word Quest</strong>
            <p>Build recognition, meaning, spelling, and sentence use through word games.</p>
            <em>Classic Words games</em>
          </Link>
          <Link href={`/courses/${course.slug}/analogies-antonyms`} className="legacy-module-card">
            <span className="analogy-module-icon" aria-hidden="true">
              <i>A</i>
              <b>A</b>
            </span>
            <strong>Analogies &amp; Antonyms</strong>
            <p>Practice Caesar&apos;s Analogies and Caesar&apos;s Antonyms by lesson.</p>
            <em>Analogies · Antonyms</em>
          </Link>
        </div>
      </section>
    </main>
  );
}
