import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { GEM_LEDGER_MODE } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = "michellebaiyun@gmail.com";

type Props = {
  searchParams?: Promise<{ studentId?: string }>;
};

type ModuleKey =
  | "Roots of Power"
  | "Stem Battle"
  | "Classic Word Treasury"
  | "Classic Word Quest"
  | "Analogies & Antonyms"
  | "Sentence Forge";

const MODULES: Array<{ key: ModuleKey; icon: string; note: string }> = [
  { key: "Roots of Power", icon: "🌿", note: "Latin stem lesson practice" },
  { key: "Stem Battle", icon: "🎮", note: "Root games and boss loops" },
  { key: "Classic Word Treasury", icon: "📚", note: "Classic word lesson practice" },
  { key: "Classic Word Quest", icon: "🔎", note: "Word games and context play" },
  { key: "Analogies & Antonyms", icon: "⚖", note: "Analogy and antonym sets" },
  { key: "Sentence Forge", icon: "✍", note: "Sentence and context writing" }
];

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(value);
}

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseRewardAnswer(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { amount: 0, source: "" };
  const record = value as { amount?: unknown; source?: unknown };
  return {
    amount: Number(record.amount ?? 0),
    source: typeof record.source === "string" ? record.source : ""
  };
}

function moduleFromSource(source: string): ModuleKey | null {
  if (source === "roots-of-power") return "Roots of Power";
  if (source === "classic-word-treasury") return "Classic Word Treasury";
  if (source === "classic-word-quest") return "Classic Word Quest";
  if (source === "analogies-antonyms") return "Analogies & Antonyms";
  if (["build-a-word", "boss-challenge", "jeopardy", "root-matching", "complete-the-stem"].includes(source)) return "Stem Battle";
  return null;
}

function moduleFromAttempt(attempt: {
  gameMode: string | null;
  answer: Prisma.JsonValue;
  lesson: { kind: string | null } | null;
}): ModuleKey | null {
  const reward = parseRewardAnswer(attempt.answer);
  const rewardModule = moduleFromSource(reward.source);
  if (rewardModule) return rewardModule;

  if (attempt.gameMode === "vocab-practice") {
    return attempt.lesson?.kind === "CLASSIC_WORDS" ? "Classic Word Treasury" : "Roots of Power";
  }
  if (attempt.gameMode?.startsWith("battle") || attempt.gameMode === "battle") return "Stem Battle";
  if (attempt.gameMode === "practice") return "Roots of Power";
  return null;
}

function moduleFromMistake(sourceModule: string | null, category: string | null): ModuleKey | null {
  if (sourceModule === "Roots of Power") return "Roots of Power";
  if (sourceModule === "Classic Word Treasury") return "Classic Word Treasury";
  if (sourceModule === "Analogies & Antonyms") return "Analogies & Antonyms";
  if (sourceModule === "Sentence Forge") return "Sentence Forge";
  if (["Whack-a-Word", "Word Detective", "Passage Quest"].includes(sourceModule ?? "")) return "Classic Word Quest";
  if (["Build-a-Word", "Jeopardy", "Stem Battle", "Boss Challenge"].includes(sourceModule ?? "")) return "Stem Battle";
  if (category === "Sentence Writing") return "Sentence Forge";
  if (category === "Classic Words") return "Classic Word Quest";
  if (category === "Latin Stems") return "Stem Battle";
  return null;
}

function chartPoints(values: number[], width = 320, height = 88) {
  const max = Math.max(1, ...values);
  return values
    .map((value, index) => {
      const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 12) - 6;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function statusLabel(accuracy: number, count: number) {
  if (count === 0) return "No Data";
  if (accuracy >= 85) return "Strong";
  if (accuracy >= 65) return "Improving";
  return "Review";
}

function gradeReference(accuracy: number, activities: number) {
  const score = clamp(Math.round(accuracy * 0.7 + Math.min(activities, 50) * 0.6), 1, 99);
  if (score >= 85) return "Estimated Grade 7+ classical vocabulary readiness";
  if (score >= 65) return "Estimated Grade 6-7 classical vocabulary readiness";
  if (score >= 45) return "Estimated Grade 5-6 classical vocabulary readiness";
  return "Building toward middle-grade classical vocabulary readiness";
}

function weeklyLearningMs(attempts: Array<{ createdAt: Date; timeSpentMs: number | null }>) {
  return attempts.reduce((sum, attempt, index) => {
    if (attempt.timeSpentMs && attempt.timeSpentMs > 0) {
      return sum + clamp(attempt.timeSpentMs, 5000, 10 * 60 * 1000);
    }
    const previous = attempts[index - 1];
    if (!previous) return sum + 30 * 1000;
    const gap = attempt.createdAt.getTime() - previous.createdAt.getTime();
    if (gap > 0 && gap <= 5 * 60 * 1000) return sum + clamp(gap, 8000, 2 * 60 * 1000);
    return sum + 30 * 1000;
  }, 0);
}

function formatLearningTime(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

export default async function WeeklyReportPage({ searchParams }: Props) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin/reports/weekly")}`);
  if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) redirect("/dashboard");

  const today = startOfDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekEnd = new Date(today);
  weekEnd.setHours(23, 59, 59, 999);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      profile: { select: { displayName: true } }
    }
  });
  const selectedStudent = students.find((student) => student.id === query?.studentId) ?? students[0] ?? null;

  if (!selectedStudent) {
    return (
      <main className="main admin-dashboard">
        <Link className="button" href="/admin">Back to Admin</Link>
        <section className="weekly-report-shell">
          <h1>No student accounts yet</h1>
          <p>Create student accounts first, then weekly reports will appear here.</p>
        </section>
      </main>
    );
  }

  const [attempts, mistakes, allWeeklyAttempts] = await Promise.all([
    prisma.answerAttempt.findMany({
      where: {
        userId: selectedStudent.id,
        createdAt: { gte: weekStart, lte: weekEnd }
      },
      include: {
        lesson: { select: { kind: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.mistakeRecord.findMany({
      where: {
        userId: selectedStudent.id,
        mastered: false
      },
      orderBy: [{ wrongCount: "desc" }, { lastSeenAt: "desc" }],
      take: 8
    }),
    prisma.answerAttempt.findMany({
      where: {
        createdAt: { gte: weekStart, lte: weekEnd }
      },
      select: {
        userId: true,
        isCorrect: true,
        gameMode: true,
        answer: true
      }
    })
  ]);

  const scoredAttempts = attempts.filter((attempt) => attempt.gameMode !== GEM_LEDGER_MODE);
  const correctAttempts = scoredAttempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = percent(correctAttempts, scoredAttempts.length);
  const learningTime = formatLearningTime(weeklyLearningMs(scoredAttempts));

  const dailyCounts = weekDays.map((date) => {
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    return scoredAttempts.filter((attempt) => attempt.createdAt >= date && attempt.createdAt < next).length;
  });
  const dailyAccuracy = weekDays.map((date) => {
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const dayAttempts = scoredAttempts.filter((attempt) => attempt.createdAt >= date && attempt.createdAt < next);
    return percent(dayAttempts.filter((attempt) => attempt.isCorrect).length, dayAttempts.length);
  });

  const modules = MODULES.map((module) => {
    const moduleAttempts = scoredAttempts.filter((attempt) => moduleFromAttempt(attempt) === module.key);
    const moduleMistakes = mistakes.filter((mistake) => moduleFromMistake(mistake.sourceModule, mistake.category) === module.key);
    const moduleAccuracy = percent(moduleAttempts.filter((attempt) => attempt.isCorrect).length, moduleAttempts.length);
    return {
      ...module,
      attempts: moduleAttempts.length,
      accuracy: moduleAccuracy,
      mistakes: moduleMistakes.length,
      status: statusLabel(moduleAccuracy, moduleAttempts.length)
    };
  });
  const activeModules = modules.filter((module) => module.attempts > 0).length;

  const weeklyGemsByUser = new Map<string, number>();
  allWeeklyAttempts.forEach((attempt) => {
    const current = weeklyGemsByUser.get(attempt.userId) ?? 0;
    if (attempt.gameMode === GEM_LEDGER_MODE) {
      weeklyGemsByUser.set(attempt.userId, current + parseRewardAnswer(attempt.answer).amount);
    } else if (attempt.isCorrect) {
      weeklyGemsByUser.set(attempt.userId, current + 1);
    }
  });
  const weeklyRanked = [...weeklyGemsByUser.entries()].sort((a, b) => b[1] - a[1]);
  const rankIndex = weeklyRanked.findIndex(([studentId]) => studentId === selectedStudent.id);
  const platformPercentile = weeklyRanked.length <= 1 || rankIndex < 0
    ? 50
    : clamp(Math.round(((weeklyRanked.length - rankIndex) / weeklyRanked.length) * 100), 1, 99);

  const displayName = selectedStudent.profile?.displayName ?? selectedStudent.name ?? selectedStudent.email.split("@")[0];
  const revisitWords = mistakes.slice(0, 6).map((mistake) => mistake.itemLabel ?? mistake.itemKey ?? "Review item");

  return (
    <main className="main admin-dashboard">
      <div className="admin-report-nav">
        <Link className="button" href="/admin">Back to Admin</Link>
      </div>

      <section className="weekly-report-shell">
        <header className="weekly-report-hero">
          <span>{shortDate(weekStart)} - {shortDate(weekEnd)}</span>
          <h1>{displayName}&apos;s Classic WordLab accomplishments</h1>
          <div className="weekly-accomplishment-row" aria-label="Weekly accomplishments summary">
            <div className="weekly-accomplishment-item answered">
              <i>✎</i>
              <div>
                <small>Answered</small>
                <strong>{scoredAttempts.length.toLocaleString()}</strong>
                <em>questions</em>
              </div>
            </div>
            <div className="weekly-accomplishment-item time">
              <i>◷</i>
              <div>
                <small>Spent</small>
                <strong>{learningTime}</strong>
                <em>learning</em>
              </div>
            </div>
            <div className="weekly-accomplishment-item progress">
              <i>🧩</i>
              <div>
                <small>Made progress in</small>
                <strong>{activeModules}</strong>
                <em>modules</em>
              </div>
            </div>
          </div>
        </header>

        <section className="weekly-kpi-grid">
          <div className="weekly-kpi-card">
            <span>🎯</span>
            <small>Accuracy</small>
            <strong>{accuracy}%</strong>
          </div>
          <div className="weekly-kpi-card">
            <span>✅</span>
            <small>Correct Answers</small>
            <strong>{correctAttempts}</strong>
          </div>
          <div className="weekly-kpi-card">
            <span>🛠</span>
            <small>Review Queue</small>
            <strong>{mistakes.length}</strong>
          </div>
        </section>

        <section className="weekly-chart-grid">
          <article className="weekly-chart-card wide">
            <div className="weekly-card-head">
              <h2>7-Day Learning Curve</h2>
              <span>completed activities</span>
            </div>
            <svg className="weekly-line-chart" viewBox="0 0 320 96" role="img" aria-label="Seven day activity curve">
              <defs>
                <linearGradient id="weeklyLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#2d7f59" />
                  <stop offset="100%" stopColor="#df5d22" />
                </linearGradient>
              </defs>
              <polyline fill="none" points={chartPoints(dailyCounts)} stroke="url(#weeklyLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
              {dailyCounts.map((value, index) => (
                <circle cx={Number(chartPoints(dailyCounts).split(" ")[index]?.split(",")[0] ?? 0)} cy={Number(chartPoints(dailyCounts).split(" ")[index]?.split(",")[1] ?? 0)} fill="#fffdfa" key={weekDays[index].toISOString()} r="5" stroke="#26576f" strokeWidth="3" />
              ))}
            </svg>
            <div className="weekly-day-row">
              {weekDays.map((date, index) => (
                <span key={date.toISOString()}>
                  <b>{dayLabel(date)}</b>
                  <em>{dailyCounts[index]}</em>
                </span>
              ))}
            </div>
          </article>

          <article className="weekly-chart-card">
            <div className="weekly-card-head">
              <h2>Accuracy Rhythm</h2>
              <span>daily percent</span>
            </div>
            <div className="weekly-mini-bars">
              {dailyAccuracy.map((value, index) => (
                <span key={weekDays[index].toISOString()}>
                  <i style={{ height: `${Math.max(10, value)}%` }} />
                  <b>{value}%</b>
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="weekly-module-section">
          <div className="weekly-card-head">
            <h2>Module Progress</h2>
            <span>interactive practice areas</span>
          </div>
          <div className="weekly-module-grid">
            {modules.map((module) => (
              <article className={`weekly-module-card ${module.status.toLowerCase().replace(" ", "-")}`} key={module.key}>
                <div className="weekly-module-icon">{module.icon}</div>
                <div>
                  <h3>{module.key}</h3>
                  <p>{module.note}</p>
                </div>
                <strong>{module.status}</strong>
                <div className="weekly-module-meter">
                  <span style={{ width: `${module.accuracy}%` }} />
                </div>
                <small>{module.attempts} activities · {module.accuracy}% · {module.mistakes} review</small>
              </article>
            ))}
          </div>
        </section>

        <section className="weekly-bottom-grid">
          <article className="weekly-chart-card">
            <div className="weekly-card-head">
              <h2>Words To Revisit</h2>
              <span>up to 6 focus cards</span>
            </div>
            <div className="weekly-word-cloud">
              {revisitWords.length ? revisitWords.map((word) => <span key={word}>{word}</span>) : <p>No open review words this week.</p>}
            </div>
          </article>
          <article className="weekly-chart-card next-focus">
            <div className="weekly-card-head">
              <h2>Next Week Focus</h2>
              <span>short and actionable</span>
            </div>
            <ol>
              <li>Review the focus words above.</li>
              <li>Complete one Stem Battle or Classic Word Quest session.</li>
              <li>Write three original sentences with review words.</li>
            </ol>
          </article>
        </section>

        <section className="weekly-chart-grid weekly-reference-footer">
          <article className="weekly-chart-card">
            <div className="weekly-card-head">
              <h2>Platform Percentile</h2>
              <span>same platform level</span>
            </div>
            <div className="weekly-percentile">
              <div><span style={{ width: `${platformPercentile}%` }} /></div>
              <strong>{platformPercentile}th percentile</strong>
              <p>A platform reference based on this week&apos;s active learner gem totals.</p>
            </div>
          </article>
          <article className="weekly-chart-card">
            <div className="weekly-card-head">
              <h2>Grade-Level Reference</h2>
              <span>estimated, not standardized</span>
            </div>
            <div className="weekly-reference-card">
              <b>US</b>
              <strong>{gradeReference(accuracy, scoredAttempts.length)}</strong>
              <p>Based on current practice volume, accuracy, and vocabulary difficulty.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
