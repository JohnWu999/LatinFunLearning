"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

type Props = {
  userName?: string | null;
};

export function SiteHeader({ userName }: Props) {
  const pathname = usePathname();
  const minimalHeaderPaths = ["/", "/login", "/register"];
  const shouldHideNav = minimalHeaderPaths.includes(pathname);

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
          <Link href="/dashboard">学生端</Link>
          <Link href="/mistakes">错题本</Link>
          <Link href="/progress">进度</Link>
          <Link href="/admin">管理端</Link>
          {userName ? (
            <>
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
