import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "LatinFun Learning Platform",
  description: "Multi-user learning platform for Caesar's English II and extensible vocabulary courses."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark">
                <BookOpen size={19} />
              </span>
              LatinFun Platform
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              <Link href="/dashboard">学生端</Link>
              <Link href="/mistakes">错题本</Link>
              <Link href="/progress">进度</Link>
              <Link href="/admin">管理端</Link>
              {user ? (
                <>
                  <span className="nav-user">{user.profile?.displayName ?? user.name}</span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login">登录</Link>
              )}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
