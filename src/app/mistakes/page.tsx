import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="main narrow">
        <h1 className="page-title">错题本</h1>
        <p className="lede">登录后才能查看跨设备同步的错题。</p>
        <Link className="button primary" href="/login">
          去登录
        </Link>
      </main>
    );
  }

  const mistakes = await prisma.mistakeRecord.findMany({
    where: { userId: user.id, mastered: false },
    include: {
      course: true,
      lesson: true,
      exercise: true,
      knowledgePoint: true
    },
    orderBy: { lastSeenAt: "desc" }
  });

  return (
    <main className="main">
      <h1 className="page-title">错题本</h1>
      <p className="lede">这里记录仍未掌握的错题。连续复习答对后，系统会自动标记为已掌握。</p>
      <section className="section list">
        {mistakes.length ? (
          mistakes.map((mistake) => (
            <article className="row tall" key={mistake.id}>
              <div>
                <strong>{mistake.exercise?.prompt ?? mistake.knowledgePoint?.title ?? "错题"}</strong>
                <br />
                <small>
                  {mistake.course.title} · {mistake.lesson?.title ?? "全课程"} · 错 {mistake.wrongCount} 次
                </small>
                {mistake.exercise ? <p>答案：{String(mistake.exercise.correctAnswer)}</p> : null}
              </div>
              {mistake.lesson ? (
                <Link className="button" href={`/courses/${mistake.course.slug}/lessons/${mistake.lesson.slug}/practice`}>
                  复习本课
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <div className="card">
            <h3>暂无错题</h3>
            <p>完成练习后，答错的题会自动进入这里。</p>
          </div>
        )}
      </section>
    </main>
  );
}
