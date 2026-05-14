import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CourseSummary = Prisma.CourseGetPayload<{
  include: {
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

type ProgressSummary = Prisma.LearningProgressGetPayload<{
  include: {
    course: true;
    lesson: true;
  };
}>;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  let courses: CourseSummary[] = [];
  let progress: ProgressSummary[] = [];
  let databaseReady = true;

  try {
    courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
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

    progress = user
      ? await prisma.learningProgress.findMany({
          where: { userId: user.id },
          include: { course: true, lesson: true },
          orderBy: { updatedAt: "desc" },
          take: 6
        })
      : [];
  } catch {
    databaseReady = false;
  }

  const primaryCourse = courses.find((course) => course.slug === "caesars-english-ii") ?? courses[0];

  return (
    <main className="legacy-page embedded">
      <section className="legacy-cover">
        <div className="legacy-label">LatinFun</div>
        <h1>Caesar&apos;s English II</h1>
        <div className="legacy-subtitle">经典文学词汇学习中心</div>
        <div className="legacy-gold-line" />
        <p>
          拉丁词根 · 词汇进阶 · 互动闯关
          <br />
          {user ? `欢迎回来，${user.profile?.displayName ?? user.name}` : "登录后同步进度、错题和游戏记录"}
        </p>
      </section>

      {!databaseReady ? (
        <section className="legacy-container">
          <h3>数据库还没有连接</h3>
          <p>请先启动 PostgreSQL，然后运行 migration 和 seed。命令在管理端和 docs/platform-foundation.md 里。</p>
        </section>
      ) : null}

      {primaryCourse ? (
        <section className="legacy-container">
          <h2 className="legacy-section-title">功能模块</h2>
          <div className="legacy-module-grid">
            <Link href={`/courses/${primaryCourse.slug}/learning`} className="legacy-module-card">
              <span>📚</span>
              <strong>完整词汇资料</strong>
              <p>包含全部拉丁词根、词汇表、近反义词对照、练习题与答案。适合系统学习与复习。</p>
              <em>资料 · {primaryCourse._count.vocabulary} words</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/workbook`} className="legacy-module-card">
              <span>✍️</span>
              <strong>精简练习册</strong>
              <p>核心词汇精简版练习册，重点突出高频词汇与典型例句，快速浏览与检索。</p>
              <em>静态资料 · 简组版</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/battle`} className="legacy-module-card">
              <span>🎮</span>
              <strong>单词闯关</strong>
              <p>拉丁词根互动闯关挑战，包含拼写补全、拆词、连线、真假、闪电战和 Boss 挑战。</p>
              <em>互动游戏 · {primaryCourse._count.gameLevels} levels</em>
            </Link>
            <Link href={`/courses/${primaryCourse.slug}/vocab-practice`} className="legacy-module-card">
              <span>✏️</span>
              <strong>词汇练习</strong>
              <p>20 个单元全部覆盖。连线题、上下文选词、同义词、反义词，点击即时反馈，自动评分。</p>
              <em>互动练习 · {primaryCourse._count.exercises} exercises</em>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="legacy-container">
        <h2 className="legacy-section-title">快捷入口</h2>
        <div className="legacy-quick-links">
          {primaryCourse ? (
            <>
              <Link href={`/courses/${primaryCourse.slug}/learning`}>完整词汇学习资料</Link>
              <Link href={`/courses/${primaryCourse.slug}/workbook`}>精简练习册</Link>
              <Link href={`/courses/${primaryCourse.slug}/battle`}>单词闯关（互动版）</Link>
              <Link href={`/courses/${primaryCourse.slug}/vocab-practice`}>词汇练习（互动版）</Link>
              <Link href={`/courses/${primaryCourse.slug}`}>课程数据总览</Link>
            </>
          ) : null}
        </div>
      </section>

      <section className="legacy-container">
        <h2 className="legacy-section-title">最近进度</h2>
        <div className="list">
          {progress.length > 0 ? (
            progress.map((item) => (
              <div className="row" key={item.id}>
                <div>
                  <strong>{item.lesson?.title ?? item.course.title}</strong>
                  <br />
                  <small>{item.status} · mastery {Math.round(item.masteryScore * 100)}%</small>
                </div>
                <small>{item.updatedAt.toLocaleDateString()}</small>
              </div>
            ))
          ) : (
            <div className="card">
              <h3>还没有同步进度</h3>
              <p>完成登录并提交答题记录后，这里会展示每个课程和 lesson 的学习状态。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
