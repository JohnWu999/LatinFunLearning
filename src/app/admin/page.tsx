import Link from "next/link";
import { redirect } from "next/navigation";
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
        createdAt: true
      }
    }),
    prisma.mistakeRecord.findMany({
      where: { mastered: false },
      select: { userId: true, category: true, sourceModule: true }
    }),
    getRewardLeaderboard({ limit: 10 })
  ]);

  const now = Date.now();
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

  const studentRows = students
    .map((student) => ({
      ...student,
      displayName: student.profile?.displayName ?? student.name ?? student.email.split("@")[0],
      gems: leaderboardByUser.get(student.id)?.gems ?? 0,
      rank: leaderboardByUser.get(student.id)?.rank ?? null,
      openMistakes: mistakeCountByUser.get(student.id) ?? 0,
      lastActiveAt: lastAttemptByUser.get(student.id) ?? null
    }))
    .sort((left, right) => {
      const leftTime = left.lastActiveAt?.getTime() ?? 0;
      const rightTime = right.lastActiveAt?.getTime() ?? 0;
      return rightTime - leftTime || right.gems - left.gems || left.displayName.localeCompare(right.displayName);
    });

  return (
    <main className="main admin-dashboard">
      <section className="admin-hero">
        <div>
          <span>Super Admin</span>
          <h1>Classic WordLab Admin</h1>
          <p>Read-only overview for students, practice activity, gems, and open mistakes.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="button" href="/dashboard">Student View</Link>
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

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Students</h2>
          <span>{students.length} accounts</span>
        </div>
        <div className="admin-student-table">
          <div className="admin-student-row header">
            <span>Student</span>
            <span>Email</span>
            <span>Gems</span>
            <span>Open Mistakes</span>
            <span>Last Active</span>
          </div>
          {studentRows.length ? studentRows.map((student) => (
            <div className="admin-student-row" key={student.id}>
              <strong>{student.displayName}</strong>
              <span>{student.email}</span>
              <span>{student.gems}</span>
              <span>{student.openMistakes}</span>
              <span>{formatDate(student.lastActiveAt)}</span>
            </div>
          )) : (
            <p className="admin-empty">No student accounts yet.</p>
          )}
        </div>
      </section>

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
