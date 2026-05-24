import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CourseSummary = Prisma.CourseGetPayload<{
  include: {
    knowledge: {
      where: { type: "STEM" };
      select: { id: true };
    };
    _count: {
      select: {
        lessons: true;
        vocabulary: true;
        exercises: true;
        gameLevels: true;
      };
    };
  };
}>;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  let courses: CourseSummary[] = [];
  let databaseReady = true;

  try {
    courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        knowledge: {
          where: { type: "STEM" },
          select: { id: true }
        },
        _count: {
          select: {
            lessons: true,
            vocabulary: true,
            exercises: true,
            gameLevels: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

  } catch {
    databaseReady = false;
  }

  const primaryCourse = courses.find((course) => course.slug === "caesars-english-ii") ?? courses[0];

  return (
    <main className="legacy-page embedded">
      <section className="legacy-cover">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>Classic WordLab</h1>
        <div className="legacy-subtitle">Classical Vocabulary Studio</div>
        <div className="legacy-gold-line" />
        <p>
          Classical Vocabulary · Latin Stems · Interactive Quests
          <br />
          {user ? `Welcome back, ${user.profile?.displayName ?? user.name}` : "Sign in to sync progress, mistakes, and game records."}
        </p>
      </section>

      {!databaseReady ? (
        <section className="legacy-container">
          <h3>Database is not connected</h3>
          <p>Start PostgreSQL, then run the migration and seed steps.</p>
        </section>
      ) : null}

      {primaryCourse ? (
        <section className="legacy-container">
          <div className="legacy-module-grid">
            <div className="legacy-module-row-label latin-track">
              <span>Latin Stem Track</span>
              <strong>Build root power first, then train through games.</strong>
            </div>
            <Link href={`/courses/${primaryCourse.slug}/latin-stems`} className="legacy-module-card">
              <span>🌿</span>
              <strong>Latin Stem</strong>
              <p>Explore Latin stems, meanings, and modern English examples.</p>
              <em>{primaryCourse.knowledge.length} stems</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/vocab-practice?type=latin-stems`} className="legacy-module-card">
              <span>✏️</span>
              <strong>Roots of Power</strong>
              <p>Practice Latin stems by lesson with matching, context choices, and instant feedback.</p>
              <em>Stem lessons</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/battle`} className="legacy-module-card">
              <span>🎮</span>
              <strong>Stem Battle</strong>
              <p>Master stems, meanings, and examples through interactive game challenges.</p>
              <em>Stem quests</em>
            </Link>
            <div className="legacy-module-row-label classic-track">
              <span>Classic Words Track</span>
              <strong>Move from word study to understanding, practice, and application.</strong>
            </div>
            <Link href={`/courses/${primaryCourse.slug}/classic-words`} className="legacy-module-card">
              <span>📚</span>
              <strong>Classic Words</strong>
              <p>Study classic words by unit with pronunciation, definitions, literary sources, synonyms, and antonyms.</p>
              <em>{primaryCourse._count.vocabulary} words</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/vocab-practice?type=classic-words`} className="legacy-module-card">
              <span>📝</span>
              <strong>Classic Word Treasury</strong>
              <p>Practice classic words by lesson through context choices, synonyms, antonyms, and instant feedback.</p>
              <em>Word lessons</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/classic-word-quest`} className="legacy-module-card">
              <span>🧭</span>
              <strong>Classic Word Quest</strong>
              <p>Build recognition, meaning, spelling, and sentence use through word games.</p>
              <em>Classic Words games</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/analogies-antonyms`} className="legacy-module-card">
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
      ) : null}
    </main>
  );
}
