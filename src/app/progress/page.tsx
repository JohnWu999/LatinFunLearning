import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="main narrow">
        <h1 className="page-title">学习进度</h1>
        <p className="lede">登录后才能查看跨设备同步的进度。</p>
        <Link className="button primary" href="/login">
          去登录
        </Link>
      </main>
    );
  }

  const [progress, attempts] = await Promise.all([
    prisma.learningProgress.findMany({
      where: { userId: user.id },
      include: { course: true, lesson: true, knowledgePoint: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.answerAttempt.findMany({
      where: { userId: user.id },
      include: { course: true, lesson: true, exercise: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <main className="main">
      <h1 className="page-title">学习进度</h1>
      <p className="lede">按课程、Lesson 和知识点记录掌握度。当前掌握度模型是基础版，后续可升级为间隔复习算法。</p>

      <section className="section">
        <h2>掌握度</h2>
        <div className="list">
          {progress.length ? (
            progress.map((item) => (
              <div className="row" key={item.id}>
                <div>
                  <strong>{item.lesson?.title ?? item.knowledgePoint?.title ?? item.course.title}</strong>
                  <br />
                  <small>{item.status}</small>
                </div>
                <strong>{Math.round(item.masteryScore * 100)}%</strong>
              </div>
            ))
          ) : (
            <div className="card">
              <h3>还没有进度</h3>
              <p>先完成一组练习，这里会自动出现记录。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h2>最近答题</h2>
        <div className="list">
          {attempts.map((attempt) => (
            <div className="row" key={attempt.id}>
              <div>
                <strong>{attempt.exercise?.prompt ?? "答题记录"}</strong>
                <br />
                <small>
                  {attempt.course.title} · {attempt.lesson?.title ?? "全课程"} · {attempt.gameMode ?? "practice"}
                </small>
              </div>
              <span className={attempt.isCorrect ? "pill success" : "pill danger"}>{attempt.isCorrect ? "正确" : "错误"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
