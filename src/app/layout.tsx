import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classic WordLab",
  description: "Vocabulary practice through classical literature, Latin roots, and word games."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const playerStats = user && user.role === "STUDENT" ? await getPlayerStats(user.id) : null;

  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <SiteHeader
            userName={user ? user.profile?.displayName ?? user.name : null}
            userRole={user?.role ?? null}
            gems={playerStats?.gems ?? 0}
            rank={playerStats?.rank ?? null}
          />
          {children}
        </div>
      </body>
    </html>
  );
}

async function getPlayerStats(userId: string) {
  try {
    const correctAttemptsByUser = await prisma.answerAttempt.groupBy({
      by: ["userId"],
      where: { isCorrect: true },
      _count: { _all: true }
    });
    const studentIds = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true }
    });
    const gemsByUser = new Map(correctAttemptsByUser.map((item) => [item.userId, item._count._all]));
    const rankedStudents = studentIds
      .map((student) => ({
        id: student.id,
        gems: gemsByUser.get(student.id) ?? 0
      }))
      .sort((a, b) => b.gems - a.gems || a.id.localeCompare(b.id));
    const gems = gemsByUser.get(userId) ?? 0;
    const rankIndex = rankedStudents.findIndex((student) => student.id === userId);

    return {
      gems,
      rank: rankIndex >= 0 ? rankIndex + 1 : null
    };
  } catch {
    return { gems: 0, rank: null };
  }
}
