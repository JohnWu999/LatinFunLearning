import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Latin Stems", "Classic Words", "Analogies & Antonyms", "Sentence Writing"];

type Props = {
  searchParams?: Promise<{ category?: string }>;
};

export default async function MistakesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const selectedCategory = CATEGORY_ORDER.includes(query?.category ?? "") ? query?.category : undefined;

  if (!user) {
    return (
      <main className="main narrow">
        <h1 className="page-title">错题本</h1>
        <p className="lede">登录后才能查看跨设备同步的错题。</p>
        <Link className="button primary" href="/login">
          去登录
        </Link>
      </main>
    );
  }

  const mistakes = await prisma.mistakeRecord.findMany({
    where: { userId: user.id, mastered: false },
    include: {
      course: true,
      lesson: true,
      exercise: true,
      knowledgePoint: true
    },
    orderBy: { lastSeenAt: "desc" }
  });
  const primaryCourse = mistakes.find((mistake) => mistake.course.slug === "caesars-english-ii")?.course ?? mistakes[0]?.course;
  const categoryCards = CATEGORY_ORDER.map((category) => ({
    category,
    count: mistakes.filter((mistake) => (mistake.category ?? inferCategory(mistake.knowledgePoint?.type, mistake.exercise?.group)) === category).length,
    href: `/mistakes?category=${encodeURIComponent(category)}`,
    label: reviewLabel(category),
    description: categoryDescription(category)
  }));
  const selectedMistakes = selectedCategory
    ? mistakes.filter((mistake) => (mistake.category ?? inferCategory(mistake.knowledgePoint?.type, mistake.exercise?.group)) === selectedCategory)
    : [];

  return (
    <main className="main">
      <Link className="legacy-back as-button" href="/dashboard">← 返回模块主界面</Link>
      {!selectedCategory ? (
        <>
          <h1 className="page-title">错题本</h1>
          <p className="lede">Choose a mistake type to see only that module&apos;s accumulated mistakes.</p>
          <section className="mistake-type-grid" aria-label="错题类型入口">
            {categoryCards.map((card) => (
              <Link className={`mistake-type-card ${card.count === 0 ? "empty" : ""}`} href={card.href} key={card.category}>
                <div className="mistake-card-badge">{card.count > 0 ? `▲ ${card.count} mistakes` : "All clear"}</div>
                <div className={`mistake-type-icon ${iconClass(card.category)}`} aria-hidden="true">
                  <i />
                  <b />
                  <small />
                </div>
                <strong>{card.category}</strong>
                <p>{card.description}</p>
                <em>{card.count > 0 ? "Open mistake set" : "No mistakes yet"}</em>
              </Link>
            ))}
          </section>
        </>
      ) : (
        <>
          <Link className="legacy-back as-button" href="/mistakes">← Back to mistake types</Link>
          <h1 className="page-title">{selectedCategory}</h1>
          <p className="lede">{selectedMistakes.length} accumulated mistake{selectedMistakes.length === 1 ? "" : "s"} in this module.</p>
          <div className="mistake-review-toolbar">
            <Link className="button primary" href={reviewHref(selectedCategory, primaryCourse?.slug)}>
              {reviewLabel(selectedCategory)}
            </Link>
          </div>
          {selectedMistakes.length ? (
            <section className="mistake-card-grid compact">
              {selectedMistakes.map((mistake) => (
                <article className="mistake-card" key={mistake.id}>
                  <div className="mistake-card-head">
                    <strong>{mistake.itemLabel ?? mistake.exercise?.prompt ?? mistake.knowledgePoint?.title ?? "Mistake"}</strong>
                    <span>{mistake.mistakeType ?? "Practice Error"}</span>
                  </div>
                  <div className="mistake-card-meta">
                    <div>
                      <small>错误词数</small>
                      <b>{mistake.wrongCount}</b>
                    </div>
                    <div>
                      <small>来源</small>
                      <b>{mistake.sourceModule ?? mistake.lesson?.title ?? mistake.course.title}</b>
                    </div>
                  </div>
                  <Link className="button primary" href={originalPracticeHref(mistake, selectedCategory)}>
                    回原题练习
                  </Link>
                </article>
              ))}
            </section>
          ) : (
            <div className="card">
              <h3>No mistakes in this module yet</h3>
              <p>When this category has new mistakes, they will appear here.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function inferCategory(type?: string | null, group?: string | null) {
  if (type === "STEM") return "Latin Stems";
  if (group?.toLowerCase().includes("analog")) return "Analogies & Antonyms";
  return "Classic Words";
}

function reviewHref(category: string, courseSlug?: string) {
  const slug = courseSlug ?? "caesars-english-ii";
  if (category === "Latin Stems") return `/courses/${slug}/battle`;
  if (category === "Analogies & Antonyms") return `/courses/${slug}/analogies-antonyms`;
  if (category === "Sentence Writing") return `/courses/${slug}/classic-word-quest/sentence-forge`;
  return `/courses/${slug}/classic-word-quest`;
}

function originalPracticeHref(
  mistake: {
    course: { slug: string };
    lesson?: { slug: string } | null;
    itemKey?: string | null;
    itemLabel?: string | null;
    sourceModule?: string | null;
  },
  category?: string
) {
  const slug = mistake.course.slug;
  const target = encodeURIComponent(mistake.itemKey ?? mistake.itemLabel ?? "");
  const targetQuery = target ? `?target=${target}` : "";
  if (mistake.lesson?.slug) return `/courses/${slug}/lessons/${mistake.lesson.slug}/practice`;
  if (mistake.sourceModule === "Whack-a-Word") return `/courses/${slug}/classic-word-quest/whack-a-word${targetQuery}`;
  if (mistake.sourceModule === "Word Detective") return `/courses/${slug}/classic-word-quest/word-detective${targetQuery}`;
  if (mistake.sourceModule === "Passage Quest") return `/courses/${slug}/classic-word-quest/passage-quest${targetQuery}`;
  if (mistake.sourceModule === "Sentence Forge" || category === "Sentence Writing") return `/courses/${slug}/classic-word-quest/sentence-forge${targetQuery}`;
  return reviewHref(category ?? "Classic Words", slug);
}

function reviewLabel(category: string) {
  if (category === "Latin Stems") return "Review in Stem Battle";
  if (category === "Analogies & Antonyms") return "Review analogies";
  if (category === "Sentence Writing") return "Rewrite sentences";
  return "Review classic words";
}

function categoryDescription(category: string) {
  if (category === "Latin Stems") return "Stem meaning, spelling, and example-word practice.";
  if (category === "Classic Words") return "Vocabulary meaning, spelling, and literary context.";
  if (category === "Analogies & Antonyms") return "Analogy logic and antonym relationships.";
  return "Original sentence writing and target-word use.";
}

function iconClass(category: string) {
  if (category === "Latin Stems") return "stem";
  if (category === "Classic Words") return "words";
  if (category === "Analogies & Antonyms") return "analogy";
  return "writing";
}
