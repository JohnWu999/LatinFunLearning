"use client";

import Link from "next/link";
import { BookOpen, Gem, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

type Props = {
  userName?: string | null;
  userRole?: "STUDENT" | "TEACHER" | "ADMIN" | null;
  gems?: number;
  rank?: number | null;
};

type LeaderboardEntry = {
  userId: string;
  name: string;
  gems: number;
  rank: number;
};

export function SiteHeader({ userName, userRole, gems = 0, rank }: Props) {
  const pathname = usePathname();
  const minimalHeaderPaths = ["/", "/login", "/register"];
  const shouldHideNav = minimalHeaderPaths.includes(pathname);
  const isAdmin = userRole === "ADMIN" || userRole === "TEACHER";
  const [playerStats, setPlayerStats] = useState({ gems, rank });
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setPlayerStats({ gems, rank });
  }, [gems, rank]);

  useEffect(() => {
    function updateStats(event: Event) {
      const detail = (event as CustomEvent<{ gems?: number; rank?: number | null }>).detail;
      if (!detail) return;
      setPlayerStats((current) => ({
        gems: typeof detail.gems === "number" ? detail.gems : current.gems,
        rank: "rank" in detail ? detail.rank ?? null : current.rank
      }));
    }

    window.addEventListener("latinfun:gems-updated", updateStats);
    return () => window.removeEventListener("latinfun:gems-updated", updateStats);
  }, []);

  useEffect(() => {
    if (!leaderboardOpen) return;
    let canceled = false;

    async function loadLeaderboard() {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      try {
        const response = await fetch("/api/rewards/leaderboard?limit=10");
        if (!response.ok) throw new Error("Failed to load leaderboard");
        const payload = (await response.json()) as { data?: { leaderboard?: LeaderboardEntry[] } };
        if (!canceled) setLeaderboard(payload.data?.leaderboard ?? []);
      } catch {
        if (!canceled) setLeaderboardError("排行榜暂时无法加载。");
      } finally {
        if (!canceled) setLeaderboardLoading(false);
      }
    }

    loadLeaderboard();
    return () => {
      canceled = true;
    };
  }, [leaderboardOpen, playerStats.gems, playerStats.rank]);

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">
          <BookOpen size={19} />
        </span>
        Classic WordLab
      </Link>
      {!shouldHideNav ? (
        <nav className="nav" aria-label="Primary navigation">
          {userName ? (
            <>
              {isAdmin ? <Link href="/admin">管理端</Link> : <Link href="/mistakes">错题本</Link>}
              {!isAdmin ? (
                <span className="player-stats" aria-label={`宝石 ${playerStats.gems}，排名 ${playerStats.rank ?? "暂无"}`}>
                  <span className="player-stat player-stat-gems">
                    <Gem size={16} aria-hidden="true" />
                    <strong>{playerStats.gems}</strong>
                  </span>
                  <button
                    aria-expanded={leaderboardOpen}
                    aria-label="查看宝石排行榜"
                    className="player-stat player-stat-rank leaderboard-trigger"
                    onClick={() => setLeaderboardOpen((open) => !open)}
                    type="button"
                  >
                    <Trophy size={16} aria-hidden="true" />
                    <strong>{playerStats.rank ? `#${playerStats.rank}` : "--"}</strong>
                  </button>
                  {leaderboardOpen ? (
                    <div className="leaderboard-popover" role="dialog" aria-label="宝石排行榜">
                      <div className="leaderboard-head">
                        <span>Gem Leaderboard</span>
                        <button aria-label="关闭排行榜" onClick={() => setLeaderboardOpen(false)} type="button">×</button>
                      </div>
                      {leaderboardLoading ? <p className="leaderboard-note">Loading...</p> : null}
                      {leaderboardError ? <p className="leaderboard-note danger">{leaderboardError}</p> : null}
                      {!leaderboardLoading && !leaderboardError ? (
                        leaderboard.length ? (
                          <ol className="leaderboard-list">
                            {leaderboard.map((entry) => (
                              <li key={entry.userId}>
                                <span className="leaderboard-rank">#{entry.rank}</span>
                                <strong>{entry.name}</strong>
                                <span className="leaderboard-gems">
                                  <Gem size={14} aria-hidden="true" />
                                  {entry.gems}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="leaderboard-note">还没有玩家获得宝石。</p>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </span>
              ) : null}
              <span className="nav-user">{userName}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login">登录</Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
