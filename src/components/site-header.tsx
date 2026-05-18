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

export function SiteHeader({ userName, userRole, gems = 0, rank }: Props) {
  const pathname = usePathname();
  const minimalHeaderPaths = ["/", "/login", "/register"];
  const shouldHideNav = minimalHeaderPaths.includes(pathname);
  const isAdmin = userRole === "ADMIN" || userRole === "TEACHER";
  const [playerStats, setPlayerStats] = useState({ gems, rank });

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
                  <span className="player-stat player-stat-rank">
                    <Trophy size={16} aria-hidden="true" />
                    <strong>{playerStats.rank ? `#${playerStats.rank}` : "--"}</strong>
                  </span>
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
