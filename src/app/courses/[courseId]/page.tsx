import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      lessons: { orderBy: { order: "asc" } },
      gameLevels: { orderBy: { order: "asc" } },
      _count: { select: { knowledge: true, vocabulary: true, exercises: true } }
    }
  });

  if (!course) notFound();

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
          <Link href={`/courses/${course.slug}/learning`} className="legacy-module-card">
            <span>📚</span>
            <strong>完整词汇资料</strong>
            <p>完整拉丁词根、词汇表、练习题与答案键。</p>
            <em>资料全集</em>
          </Link>
          <Link href={`/courses/${course.slug}/workbook`} className="legacy-module-card">
            <span>✍️</span>
            <strong>精简练习册</strong>
            <p>按单元快速浏览核心词汇和典型题目。</p>
            <em>简组版</em>
          </Link>
          <Link href={`/courses/${course.slug}/battle`} className="legacy-module-card">
            <span>🎮</span>
            <strong>单词闯关</strong>
            <p>复刻原词根闯关、Boss、错题练习和连击计分。</p>
            <em>互动游戏</em>
          </Link>
          <Link href={`/courses/${course.slug}/vocab-practice`} className="legacy-module-card">
            <span>✏️</span>
            <strong>词汇练习</strong>
            <p>连线题、上下文选词、同义词、反义词即时反馈。</p>
            <em>互动练习</em>
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
