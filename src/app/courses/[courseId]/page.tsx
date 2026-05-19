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
        gameLevels: { orderBy: { order: "asc" } },
        _count: { select: { knowledge: true, vocabulary: true, exercises: true } }
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
        <div className="legacy-label">LatinFun</div>
        <h1>{course.title}</h1>
        <div className="legacy-subtitle">{course.subtitle ?? "经典文学词汇学习中心"}</div>
        <div className="legacy-gold-line" />
        <p>拉丁词根 · 词汇进阶 · 互动闯关</p>
      </section>

      <section className="legacy-container">
        <h2 className="legacy-section-title">功能模块</h2>
        <div className="legacy-module-grid">
          <Link href={`/courses/${course.slug}/latin-stems`} className="legacy-module-card">
            <span>🌿</span>
            <strong>Latin Stems</strong>
            <p>完整拉丁词根、词根含义和现代英文例词。</p>
            <em>{course.knowledge.length} stems</em>
          </Link>
          <Link href={`/courses/${course.slug}/classic-words`} className="legacy-module-card">
            <span>📚</span>
            <strong>Classic Words</strong>
            <p>按单元查看经典词汇、读音、英文释义、文学出处和同反义词。</p>
            <em>{course._count.vocabulary} words</em>
          </Link>
          <Link href={`/courses/${course.slug}/analogies-antonyms`} className="legacy-module-card">
            <span className="analogy-module-icon" aria-hidden="true">
              <i>A</i>
              <b>A</b>
            </span>
            <strong>Analogies &amp; Antonyms</strong>
            <p>按课整理 Caesar&apos;s Analogies 和 Caesar&apos;s Antonyms 练习题。</p>
            <em>类比 · 反义词</em>
          </Link>
          <Link href={`/courses/${course.slug}/workbook`} className="legacy-module-card">
            <span>✍️</span>
            <strong>精简练习册</strong>
            <p>按单元快速浏览核心词汇和典型题目。</p>
            <em>简组版</em>
          </Link>
          <Link href={`/courses/${course.slug}/battle`} className="legacy-module-card">
            <span>🎮</span>
            <strong>Stem Battle</strong>
            <p>通过多种互动题型反复训练 Latin Stems，逐步掌握词根、含义和例词。</p>
            <em>词根闯关</em>
          </Link>
          <Link href={`/courses/${course.slug}/vocab-practice?type=latin-stems`} className="legacy-module-card">
            <span>✏️</span>
            <strong>Roots of Power</strong>
            <p>按课练习 Latin Stems：连线、上下文选择和即时反馈。</p>
            <em>{latinStemLessons.length} stem lessons</em>
          </Link>
          <Link href={`/courses/${course.slug}/vocab-practice?type=classic-words`} className="legacy-module-card">
            <span>📝</span>
            <strong>Classic Word Treasury</strong>
            <p>按课练习 Classic Words：上下文选词、同义词、反义词和即时反馈。</p>
            <em>{classicWordLessons.length} word lessons</em>
          </Link>
        </div>
      </section>

      <section className="legacy-container legacy-metrics">
        <div><strong>{course._count.knowledge}</strong><span>knowledge points</span></div>
        <div><strong>{course.lessons.length}</strong><span>lessons</span></div>
        <div><strong>{course._count.vocabulary}</strong><span>vocabulary items</span></div>
        <div><strong>{course._count.exercises}</strong><span>exercises</span></div>
      </section>

      <section className="legacy-container">
        <h2 className="legacy-section-title">Lessons</h2>
        <div className="list">
          {course.lessons.map((lesson) => (
            <Link
              className="row"
              href={`/courses/${course.slug}/lessons/${lesson.slug}/practice`}
              key={lesson.id}
            >
              <div>
                <strong>{lesson.title}</strong>
                <br />
                <small>{lesson.kind ?? "lesson"}</small>
              </div>
              <small>开始练习</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="legacy-container">
        <h2 className="legacy-section-title">Game Levels</h2>
        <div className="grid">
          {course.gameLevels.map((level) => (
            <article className="card" key={level.id}>
              <h3>{level.title}</h3>
              <p>{level.description}</p>
              <small>{level.type}{level.isBoss ? " · boss" : ""}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
