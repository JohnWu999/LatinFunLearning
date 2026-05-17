import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
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

  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <SiteHeader userName={user ? user.profile?.displayName ?? user.name : null} />
          {children}
        </div>
      </body>
    </html>
  );
}
