import Link from "next/link";
import { notFound } from "next/navigation";
import { PracticeClient } from "@/components/practice-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPracticePage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const [user, lesson] = await Promise.all([
    getCurrentUser(),
    prisma.lesson.findFirst({
      where: {
        OR: [{ id: lessonId }, { slug: lessonId }],
        course: { OR: [{ id: courseId }, { slug: courseId }] }
      },
      include: {
        course: true,
        exercises: { orderBy: { order: "asc" } },
        vocabulary: { orderBy: { sourceOrder: "asc" } }
      }
    })
  ]);

  if (!lesson) notFound();

  return (
    <main className="main">
      <div className="crumbs">
        <Link href={`/courses/${lesson.course.slug}`}>{lesson.course.title}</Link>
        <span>/</span>
        <span>{lesson.title}</span>
      </div>
      <h1 className="page-title">{lesson.title}</h1>
      <p className="lede">
        {user ? "本次答题会自动同步到你的学习记录与错题本。" : "当前是游客练习；登录后才会保存进度和错题。"}
      </p>

      <section className="section">
        <h2>本课词汇</h2>
        <div className="vocab-strip">
          {lesson.vocabulary.slice(0, 12).map((item) => (
            <span key={item.id}>
              <strong>{item.word}</strong> {item.definition}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <PracticeClient courseId={lesson.courseId} exercises={lesson.exercises} isLoggedIn={Boolean(user)} lessonId={lesson.id} />
      </section>
    </main>
  );
}
