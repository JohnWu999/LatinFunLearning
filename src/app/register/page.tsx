import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

function nextLink(basePath: string, next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return basePath;
  return `${basePath}?next=${encodeURIComponent(next)}`;
}

export default async function RegisterPage({ searchParams }: Props) {
  const next = (await searchParams)?.next;

  return (
    <main className="main auth-page">
      <section className="auth-layout">
        <div className="auth-hero-panel">
          <span className="auth-kicker">Classic WordLab</span>
          <h1>Start your word journey.</h1>
          <p>Create a student account to save gems, mistakes, reports, and every step of your vocabulary practice.</p>
          <div className="auth-feature-grid" aria-label="Learning features">
            <span>📘 Words</span>
            <span>🌿 Roots</span>
            <span>💎 Gems</span>
            <span>🏆 Reports</span>
          </div>
        </div>
        <div className="auth-card-panel">
          <h2>Create account</h2>
          <p>Verify your email first, then choose a password.</p>
          <AuthForm mode="register" />
          <p className="form-note">
            已有账号？ <Link href={nextLink("/login", next)}>返回登录</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
