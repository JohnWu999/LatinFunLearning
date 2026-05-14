import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

function asOptions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asAnswer(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

export default async function LearningPage({ params }: Props) {
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      knowledge: {
        where: { type: "STEM" },
        orderBy: { sourceOrder: "asc" }
      },
      lessons: {
        orderBy: { order: "asc" },
        include: {
          vocabulary: { orderBy: { sourceOrder: "asc" } },
          exercises: { orderBy: { order: "asc" } }
        }
      }
    }
  });

  if (!course) notFound();

  return (
    <main className="legacy-page">
      <section className="legacy-cover">
        <div className="legacy-label">LatinFun</div>
        <h1>完整词汇资料</h1>
        <div className="legacy-subtitle">Caesar&apos;s English II 学习资料全集</div>
        <div className="legacy-gold-line" />
        <p>拉丁词根 · 词汇表 · 近反义词练习 · 答案键</p>
      </section>

      <div className="legacy-container wide">
        <Link className="legacy-back" href={`/courses/${course.slug}`}>← 返回学习中心首页</Link>

        <h2 className="legacy-section-title">拉丁词根总表</h2>
        <div className="learning-stem-grid">
          {course.knowledge.map((stem) => (
            <article className="learning-stem" key={stem.id}>
              <strong>{stem.key}</strong>
              <span>{stem.meaning}</span>
              <small>{Array.isArray(stem.examples) ? stem.examples.map(String).join(" · ") : ""}</small>
            </article>
          ))}
        </div>

        <h2 className="legacy-section-title">20 个单元完整资料</h2>
        {course.lessons.map((lesson) => {
          const matching = lesson.exercises.filter((item) => item.group === "matching");
          const context = lesson.exercises.filter((item) => item.group === "context");
          const synonym = lesson.exercises.filter((item) => item.group === "synonym");
          const antonym = lesson.exercises.filter((item) => item.group === "antonym");

          return (
            <section className="learning-lesson" key={lesson.id}>
              <header>
                <h3>{lesson.title}</h3>
                <Link href={`/courses/${course.slug}/vocab-practice`}>进入互动练习</Link>
              </header>

              {lesson.vocabulary.length > 0 ? (
                <div className="learning-vocab-list">
                  {lesson.vocabulary.map((item) => (
                    <article key={item.id}>
                      <strong>{item.word}</strong>
                      <span>{item.partOfSpeech}</span>
                      <p>{item.definition}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {matching.length > 0 ? (
                <div className="learning-block">
                  <h4>练习一：连线题 — 将左侧的英文解释与右侧的单词进行匹配</h4>
                  <div className="learning-two-col">
                    <div>{matching.map((item) => <span key={item.id}>{item.prompt}</span>)}</div>
                    <div>{matching.map((item) => <span key={item.id}>{asAnswer(item.correctAnswer)}</span>)}</div>
                  </div>
                </div>
              ) : null}

              {[
                ["练习二：上下文选词题", context],
                ["练习三：同义词选择题", synonym],
                ["练习四：反义词选择题", antonym]
              ].map(([title, items]) => (
                Array.isArray(items) && items.length > 0 ? (
                  <div className="learning-block" key={String(title)}>
                    <h4>{String(title)}</h4>
                    {items.map((item, index) => (
                      <div className="learning-q" key={item.id}>
                        <strong>{index + 1}. {item.prompt}</strong>
                        <div>{asOptions(item.options).map((option) => <span key={option}>{option}</span>)}</div>
                      </div>
                    ))}
                  </div>
                ) : null
              ))}

              <div className="legacy-answer-key always">
                <h4>答案键</h4>
                <div className="legacy-answer-row"><strong>连线</strong><span>{matching.map((item, index) => `${index + 1}-${asAnswer(item.correctAnswer)}`).join(", ")}</span></div>
                <div className="legacy-answer-row"><strong>上下文</strong><span>{context.map((item, index) => `${index + 1}.${asAnswer(item.correctAnswer).match(/^([a-z])\./i)?.[1] ?? ""}`).join(", ")}</span></div>
                <div className="legacy-answer-row"><strong>同义</strong><span>{synonym.map((item, index) => `${index + 1}.${asAnswer(item.correctAnswer).match(/^([a-z])\./i)?.[1] ?? ""}`).join(", ")}</span></div>
                <div className="legacy-answer-row"><strong>反义</strong><span>{antonym.map((item, index) => `${index + 1}.${asAnswer(item.correctAnswer).match(/^([a-z])\./i)?.[1] ?? ""}`).join(", ")}</span></div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
