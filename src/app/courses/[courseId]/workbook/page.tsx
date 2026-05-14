import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

function previewAnswer(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

export default async function WorkbookPage({ params }: Props) {
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          vocabulary: { orderBy: { sourceOrder: "asc" }, take: 8 },
          exercises: { orderBy: { order: "asc" }, take: 6 }
        }
      }
    }
  });

  if (!course) notFound();

  return (
    <main className="legacy-page">
      <section className="legacy-cover">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>精简练习册</h1>
        <div className="legacy-subtitle">核心词汇快速浏览与检索</div>
        <div className="legacy-gold-line" />
        <p>重点词汇 · 典型题目 · 快速复习入口</p>
      </section>

      <div className="legacy-container">
        <Link className="legacy-back" href={`/courses/${course.slug}`}>← 返回学习中心首页</Link>
        <h2 className="legacy-section-title">按单元快速复习</h2>
        <div className="workbook-list">
          {course.lessons.map((lesson) => (
            <article className="workbook-lesson" key={lesson.id}>
              <header>
                <div>
                  <span>Lesson {lesson.order}</span>
                  <h3>{lesson.title}</h3>
                </div>
                <Link href={`/courses/${course.slug}/vocab-practice`}>互动练习</Link>
              </header>
              <div className="workbook-vocab">
                {lesson.vocabulary.map((item) => (
                  <span key={item.id}><strong>{item.word}</strong> {item.definition}</span>
                ))}
              </div>
              <div className="workbook-exercises">
                {lesson.exercises.map((item, index) => (
                  <p key={item.id}>
                    <b>{index + 1}. {item.group}</b> {item.prompt}
                    <small>答案：{previewAnswer(item.correctAnswer)}</small>
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
