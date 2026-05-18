import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { getPlayerRewardSummary } from "@/lib/rewards";
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
    return await getPlayerRewardSummary(userId);
  } catch {
    return { gems: 0, rank: null };
  }
}
