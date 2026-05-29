import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

function nextLink(basePath: string, next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return basePath;
  return `${basePath}?next=${encodeURIComponent(next)}`;
}

export default async function LoginPage({ searchParams }: Props) {
  const next = (await searchParams)?.next;

  return (
    <main className="main auth-page">
      <section className="auth-layout">
        <div className="auth-hero-panel">
          <span className="auth-kicker">Classic WordLab</span>
          <h1>Welcome back.</h1>
          <p>Build classical vocabulary through roots, literature, and word games with progress saved across devices.</p>
          <div className="auth-feature-grid" aria-label="Learning features">
            <span>📘 Words</span>
            <span>🌿 Roots</span>
            <span>💎 Gems</span>
            <span>🏆 Reports</span>
          </div>
        </div>
        <div className="auth-card-panel">
          <h2>Log in</h2>
          <p>Use your student email to continue learning.</p>
          <AuthForm mode="login" />
          <p className="form-note">
            还没有账号？ <Link href={nextLink("/register", next)}>创建一个学生账号</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
