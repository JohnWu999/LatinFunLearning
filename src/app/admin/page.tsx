import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let courseCount = 0;
  let userCount = 0;
  let vocabularyCount = 0;
  let exerciseCount = 0;
  let generatedJobs: Awaited<ReturnType<typeof prisma.generatedContentJob.findMany>> = [];
  let databaseReady = true;

  try {
    [courseCount, userCount, vocabularyCount, exerciseCount, generatedJobs] = await Promise.all([
      prisma.course.count(),
      prisma.user.count(),
      prisma.vocabularyItem.count(),
      prisma.exercise.count(),
      prisma.generatedContentJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);
  } catch {
    databaseReady = false;
  }

  return (
    <main className="main">
      <h1 className="page-title">课程管理控制台</h1>
      <p className="lede">
        阶段 1-3 先提供数据地基和管理入口。后续阶段会在这里加入教材上传、自动生成、人工审核与发布流程。
      </p>

      {!databaseReady ? (
        <section className="section card">
          <h3>数据库还没有连接</h3>
          <p>启动 PostgreSQL 后运行下面的初始化命令即可看到真实课程、词汇、练习和用户数据。</p>
        </section>
      ) : null}

      <section className="section grid">
        <div className="metric">
          <strong>{courseCount}</strong>
          <span>courses</span>
        </div>
        <div className="metric">
          <strong>{userCount}</strong>
          <span>users</span>
        </div>
        <div className="metric">
          <strong>{vocabularyCount}</strong>
          <span>vocabulary</span>
        </div>
        <div className="metric">
          <strong>{exerciseCount}</strong>
          <span>exercises</span>
        </div>
      </section>

      <section className="section">
        <h2>生成任务占位</h2>
        <div className="list">
          {generatedJobs.length > 0 ? (
            generatedJobs.map((job) => (
              <div className="row" key={job.id}>
                <strong>{job.status}</strong>
                <small>{job.createdAt.toLocaleString()}</small>
              </div>
            ))
          ) : (
            <div className="card">
              <h3>还没有生成任务</h3>
              <p>教材导入与 AI 生成题库会在下一阶段接入这个任务表。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h2>本地初始化命令</h2>
        <pre className="code">{`cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev`}</pre>
        <div className="actions">
          <Link className="button" href="/dashboard">
            查看学生端
          </Link>
        </div>
      </section>
    </main>
  );
}
