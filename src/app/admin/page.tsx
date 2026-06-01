import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStudentManager } from "@/components/admin-student-manager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRewardLeaderboard } from "@/lib/rewards";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = "michellebaiyun@gmail.com";

function formatDate(value?: Date | null) {
  if (!value) return "No activity yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function learningMs(attempts: Array<{ createdAt: Date; timeSpentMs: number | null; gameMode: string | null }>) {
  const sorted = [...attempts].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const explicitMs = sorted.reduce((sum, attempt) => {
    if (attempt.gameMode !== "gem-ledger" && attempt.timeSpentMs && attempt.timeSpentMs > 0) {
      return sum + clamp(attempt.timeSpentMs, 5000, 10 * 60 * 1000);
    }
    return sum;
  }, 0);

  let sessionMs = 0;
  let sessionStartMs: number | null = null;
  let previousMs: number | null = null;
  sorted.forEach((attempt) => {
    const currentMs = attempt.createdAt.getTime();
    if (sessionStartMs === null || previousMs === null || currentMs - previousMs > 5 * 60 * 1000) {
      if (sessionStartMs !== null && previousMs !== null) sessionMs += clamp(previousMs - sessionStartMs + 30 * 1000, 30 * 1000, 60 * 60 * 1000);
      sessionStartMs = currentMs;
    }
    previousMs = currentMs;
  });
  if (sessionStartMs !== null && previousMs !== null) sessionMs += clamp(previousMs - sessionStartMs + 30 * 1000, 30 * 1000, 60 * 60 * 1000);

  return Math.max(explicitMs, sessionMs);
}

function formatLearningTime(ms: number) {
  if (ms <= 0) return "0 min";
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

function shanghaiDayStart(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric"
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return new Date(`${year}-${month}-${day}T00:00:00+08:00`);
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin")}`);

  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  if (!isSuperAdmin) redirect("/dashboard");

  const [students, courses, attempts, openMistakes, leaderboard] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        profile: { select: { displayName: true } }
      }
    }),
    prisma.course.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, title: true, status: true }
    }),
    prisma.answerAttempt.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        isCorrect: true,
        gameMode: true,
        createdAt: true,
        timeSpentMs: true
      }
    }),
    prisma.mistakeRecord.findMany({
      where: { mastered: false },
      select: { userId: true, category: true, sourceModule: true }
    }),
    getRewardLeaderboard({ limit: 10 })
  ]);

  const now = Date.now();
  const todayStart = shanghaiDayStart(new Date(now));
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const activeToday = new Set(attempts.filter((attempt) => attempt.createdAt >= oneDayAgo).map((attempt) => attempt.userId)).size;
  const activeThisWeek = new Set(attempts.filter((attempt) => attempt.createdAt >= oneWeekAgo).map((attempt) => attempt.userId)).size;
  const correctAttempts = attempts.filter((attempt) => attempt.isCorrect && attempt.gameMode !== "gem-ledger").length;
  const scoredAttempts = attempts.filter((attempt) => attempt.gameMode !== "gem-ledger").length;
  const leaderboardByUser = new Map(leaderboard.map((entry) => [entry.userId, entry]));
  const lastAttemptByUser = new Map<string, Date>();
  attempts.forEach((attempt) => {
    if (!lastAttemptByUser.has(attempt.userId)) lastAttemptByUser.set(attempt.userId, attempt.createdAt);
  });
  const mistakeCountByUser = new Map<string, number>();
  openMistakes.forEach((mistake) => {
    mistakeCountByUser.set(mistake.userId, (mistakeCountByUser.get(mistake.userId) ?? 0) + 1);
  });
  const activityAttemptsByUser = new Map<string, Array<{ createdAt: Date; timeSpentMs: number | null; gameMode: string | null }>>();
  attempts.forEach((attempt) => {
    const userAttempts = activityAttemptsByUser.get(attempt.userId) ?? [];
    userAttempts.push({ createdAt: attempt.createdAt, timeSpentMs: attempt.timeSpentMs, gameMode: attempt.gameMode });
    activityAttemptsByUser.set(attempt.userId, userAttempts);
  });

  const sortableStudentRows = students
    .map((student) => ({
      ...student,
      displayName: student.profile?.displayName ?? student.name ?? student.email.split("@")[0],
      gems: leaderboardByUser.get(student.id)?.gems ?? 0,
      rank: leaderboardByUser.get(student.id)?.rank ?? null,
      openMistakes: mistakeCountByUser.get(student.id) ?? 0,
      lastActiveAt: lastAttemptByUser.get(student.id) ?? null,
      lastActiveLabel: formatDate(lastAttemptByUser.get(student.id) ?? null),
      todayLearningLabel: formatLearningTime(learningMs((activityAttemptsByUser.get(student.id) ?? []).filter((attempt) => attempt.createdAt >= todayStart))),
      totalLearningLabel: formatLearningTime(learningMs(activityAttemptsByUser.get(student.id) ?? [])),
      reportHref: `/admin/reports/weekly?studentId=${student.id}`
    }))
    .sort((left, right) => {
      const leftTime = left.lastActiveAt?.getTime() ?? 0;
      const rightTime = right.lastActiveAt?.getTime() ?? 0;
      return rightTime - leftTime || right.gems - left.gems || left.displayName.localeCompare(right.displayName);
    });
  const studentRows = sortableStudentRows.map(({ createdAt, lastActiveAt, name, profile, ...student }) => student);

  return (
    <main className="main admin-dashboard">
      <section className="admin-hero">
        <div>
          <span>Super Admin</span>
          <h1>Classic WordLab Admin</h1>
          <p>Manage student accounts, practice activity, gems, learning time, and open mistakes.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="button" href="/dashboard">Student View</Link>
          <Link className="button" href="/admin/reports/weekly">Weekly Report</Link>
          <Link className="button primary" href="/courses/caesars-english-ii">Learning Center</Link>
        </div>
      </section>

      <section className="admin-metric-grid" aria-label="Admin overview">
        <div className="admin-metric-card">
          <span>Students</span>
          <strong>{students.length}</strong>
          <small>{activeToday} active today</small>
        </div>
        <div className="admin-metric-card">
          <span>Practice Attempts</span>
          <strong>{scoredAttempts}</strong>
          <small>{percent(correctAttempts, scoredAttempts)}% correct</small>
        </div>
        <div className="admin-metric-card">
          <span>Open Mistakes</span>
          <strong>{openMistakes.length}</strong>
          <small>Across all students</small>
        </div>
        <div className="admin-metric-card">
          <span>Weekly Activity</span>
          <strong>{activeThisWeek}</strong>
          <small>students active this week</small>
        </div>
      </section>

      <section className="admin-grid-two">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Gem Leaderboard</h2>
            <span>Top active learners</span>
          </div>
          <div className="admin-leaderboard">
            {leaderboard.length ? leaderboard.map((entry) => (
              <div className="admin-leader-row" key={entry.userId}>
                <b>#{entry.rank}</b>
                <span>{entry.name}</span>
                <strong>{entry.gems} gems</strong>
              </div>
            )) : (
              <p className="admin-empty">No gem activity yet.</p>
            )}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Admin Access</h2>
            <span>Locked for safety</span>
          </div>
          <div className="admin-access-card">
            <strong>{SUPER_ADMIN_EMAIL}</strong>
            <p>Only this email currently has administrator access. All other accounts remain student accounts.</p>
            <em>Admin authorization tools will stay disabled until you decide to add another administrator.</em>
          </div>
        </div>
      </section>

      <AdminStudentManager students={studentRows} />

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Courses</h2>
          <span>{courses.length} course records</span>
        </div>
        <div className="admin-course-list">
          {courses.map((course) => (
            <Link href={`/courses/${course.slug}`} key={course.id}>
              <strong>{course.title}</strong>
              <span>{course.status}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
