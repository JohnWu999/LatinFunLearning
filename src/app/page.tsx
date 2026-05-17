import Link from "next/link";
import { ArrowRight, BookOpenCheck, Landmark, ShieldCheck, Sparkles } from "lucide-react";

const practiceAreas = ["Classic Words", "Latin Roots", "Analogies", "Antonyms", "Word Games"];

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-copy">
          <span className="home-eyebrow">
            <Landmark size={18} />
            Classical Vocabulary Practice
          </span>
          <h1>Classic WordLab</h1>
          <p>Build Vocabulary Through Classical Literature, Latin Roots, and Word Games</p>

          <div className="home-entry-grid" aria-label="Choose an entrance">
            <Link className="home-entry student" href="/login?next=/dashboard">
              <span className="home-entry-icon">
                <BookOpenCheck size={26} />
              </span>
              <strong>Student Login</strong>
              <small>Practice words, roots, analogies, and games with your own progress.</small>
              <em>
                Enter Learning Space <ArrowRight size={16} />
              </em>
            </Link>

            <Link className="home-entry admin" href="/login?next=/admin">
              <span className="home-entry-icon">
                <ShieldCheck size={26} />
              </span>
              <strong>Admin Login</strong>
              <small>Manage authorized users, course materials, and learning records.</small>
              <em>
                Enter Admin Space <ArrowRight size={16} />
              </em>
            </Link>
          </div>
        </div>

        <div className="home-visual" aria-hidden="true">
          <div className="home-book-mark">
            <Sparkles size={26} />
          </div>
          <div className="home-word-core">
            <span>verbum</span>
            <strong>WORD</strong>
            <small>meaning · roots · usage</small>
          </div>
          <div className="home-word-path">
            {practiceAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
