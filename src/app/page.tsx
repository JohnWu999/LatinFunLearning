import Link from "next/link";
import { ArrowRight, Database, Gamepad2, Users } from "lucide-react";

const foundations = [
  {
    title: "多用户与跨端同步",
    body: "认证、用户 Profile、学习进度、答题记录和错题记录已经进入后端数据模型。"
  },
  {
    title: "课程数据化",
    body: "旧 HTML/JS 中的 Caesar's English II 内容已抽取为结构化 seed，后续课程可复用同一套模型。"
  },
  {
    title: "游戏引擎预留",
    body: "闯关、Boss、错题模式被建模为 GameLevel，后续可接 React、Phaser、Pixi、Three 或 Cocos Web。"
  }
];

export default function Home() {
  return (
    <main className="main">
      <section className="hero">
        <div>
          <h1>从静态练习页升级为多人学习平台。</h1>
          <p>
            这个 Next.js 版本先完成平台地基：结构化课程数据、PostgreSQL 数据模型、登录 API、Profile、学习记录和错题同步。
          </p>
          <div className="actions">
            <Link className="button primary" href="/dashboard">
              进入学生端 <ArrowRight size={17} />
            </Link>
            <Link className="button" href="/admin">
              查看管理端
            </Link>
          </div>
        </div>
        <div className="panel platform-card">
          <div className="status">
            <Database size={16} />
            Stage 1-3 platform foundation
          </div>
          <div className="metric-grid">
            <div className="metric">
              <strong>77</strong>
              <span>legacy stems extracted</span>
            </div>
            <div className="metric">
              <strong>20</strong>
              <span>lessons ready to seed</span>
            </div>
            <div className="metric">
              <strong>395</strong>
              <span>structured exercises</span>
            </div>
            <div className="metric">
              <strong>7</strong>
              <span>game levels modeled</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section grid">
        {foundations.map((item, index) => (
          <article className="card" key={item.title}>
            {index === 0 ? <Users size={22} /> : index === 1 ? <Database size={22} /> : <Gamepad2 size={22} />}
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
