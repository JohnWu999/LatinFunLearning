import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function Home() {
  return (
    <main className="main auth-page">
      <section className="auth-layout">
        <div className="auth-hero-panel">
          <span className="auth-kicker">Classic WordLab</span>
          <h1>Classical words, made playable.</h1>
          <p>Practice roots, literary vocabulary, analogies, and word games with your progress saved every step of the way.</p>
          <div className="auth-feature-grid" aria-label="Learning features">
            <span>📘 Words</span>
            <span>🌿 Roots</span>
            <span>💎 Gems</span>
            <span>🏆 Reports</span>
          </div>
        </div>
        <div className="auth-card-panel">
          <h2>Log in</h2>
          <p>Students and administrators use the same secure sign-in.</p>
          <AuthForm mode="login" />
          <p className="form-note">
            New student? <Link href="/register">Create a student account</Link>
          </p>
          <p className="auth-admin-note">Admin accounts open the management dashboard automatically after login.</p>
        </div>
      </section>
    </main>
  );
}
