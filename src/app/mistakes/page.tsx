import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { latinStemLessons } from "@/lib/latin-stem-lessons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Latin Stems", "Classic Words", "Analogies & Antonyms", "Sentence Writing"];

const latinStemPracticeLookup = new Map<string, { stem: string; meaning: string; exampleWord: string }>();
Object.values(latinStemLessons).forEach((lesson) => {
  lesson.newStems.forEach((card) => {
    latinStemPracticeLookup.set(normalizePracticeWord(card.stem), {
      stem: card.stem,
      meaning: card.meaning,
      exampleWord: card.nonfiction.word
    });
    [card.nonfiction.word, ...card.examples].forEach((word) => {
      latinStemPracticeLookup.set(normalizePracticeWord(word), {
        stem: card.stem,
        meaning: card.meaning,
        exampleWord: card.nonfiction.word
      });
    });
  });
  lesson.reviewStems.forEach((card) => {
    latinStemPracticeLookup.set(normalizePracticeWord(card.stem), {
      stem: card.stem,
      meaning: card.meaning,
      exampleWord: card.examples[0] ?? card.stem
    });
    card.examples.forEach((word) => {
      latinStemPracticeLookup.set(normalizePracticeWord(word), {
        stem: card.stem,
        meaning: card.meaning,
        exampleWord: word
      });
    });
  });
});

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
    count: mistakes.filter((mistake) => mistakeCategory(mistake) === category).length,
    href: `/mistakes?category=${encodeURIComponent(category)}`,
    label: reviewLabel(category),
    description: categoryDescription(category)
  }));
  const selectedMistakes = selectedCategory
    ? mistakes.filter((mistake) => mistakeCategory(mistake) === selectedCategory)
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
            <Link className="button primary" href={reviewSetHref(selectedCategory, selectedMistakes, primaryCourse?.slug)}>
              {reviewLabel(selectedCategory)}
            </Link>
          </div>
          {selectedMistakes.length ? (
            <section className="mistake-card-grid compact">
              {selectedMistakes.map((mistake) => (
                <article className="mistake-card" key={mistake.id}>
                  <div className="mistake-card-head">
                    <strong>{mistakeDisplayTitle(mistake, selectedCategory)}</strong>
                    <span>{mistakeDisplayType(mistake, selectedCategory)}</span>
                  </div>
                  <div className="mistake-card-meta">
                    <div>
                      <small>错误词数</small>
                      <b>{mistake.wrongCount}</b>
                    </div>
                    <div>
                      <small>来源</small>
                      <b>{mistakeDisplaySource(mistake, selectedCategory)}</b>
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

function mistakeCategory(mistake: {
  category?: string | null;
  knowledgePoint?: { type?: string | null } | null;
  exercise?: { group?: string | null } | null;
  lesson?: { kind?: string | null } | null;
}) {
  return mistake.category ?? inferCategory(mistake.knowledgePoint?.type, mistake.exercise?.group, mistake.lesson?.kind);
}

function inferCategory(type?: string | null, group?: string | null, lessonKind?: string | null) {
  if (type === "STEM") return "Latin Stems";
  if (lessonKind === "LATIN_STEMS") return "Latin Stems";
  if (group?.toLowerCase().includes("analog")) return "Analogies & Antonyms";
  return "Classic Words";
}

function normalizePracticeWord(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z]\.\s*/i, "")
    .replace(/\s+/g, " ");
}

function answerText(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function latinStemFromMistake(mistake: {
  itemKey?: string | null;
  itemLabel?: string | null;
  exercise?: { prompt?: string | null; correctAnswer?: unknown } | null;
}) {
  const itemKeyHit = latinStemPracticeLookup.get(normalizePracticeWord(mistake.itemKey));
  if (itemKeyHit) return itemKeyHit;
  const labelStem = String(mistake.itemLabel ?? "").split("=")[0]?.trim();
  const labelHit = latinStemPracticeLookup.get(normalizePracticeWord(labelStem));
  if (labelHit) return labelHit;
  const answerHit = latinStemPracticeLookup.get(normalizePracticeWord(answerText(mistake.exercise?.correctAnswer)));
  if (answerHit) return answerHit;
  return latinStemPracticeLookup.get(normalizePracticeWord(mistake.exercise?.prompt));
}

function isLatinStemMistake(
  mistake: {
    category?: string | null;
    lesson?: { kind?: string | null } | null;
    knowledgePoint?: { type?: string | null } | null;
    exercise?: { group?: string | null } | null;
  },
  category?: string
) {
  return category === "Latin Stems" || mistakeCategory(mistake) === "Latin Stems";
}

function mistakeDisplayTitle(
  mistake: {
    itemKey?: string | null;
    itemLabel?: string | null;
    exercise?: { prompt?: string | null; correctAnswer?: unknown; group?: string | null } | null;
    knowledgePoint?: { title?: string | null; type?: string | null } | null;
    lesson?: { kind?: string | null } | null;
    category?: string | null;
  },
  category?: string
) {
  if (isLatinStemMistake(mistake, category)) {
    const stem = latinStemFromMistake(mistake);
    if (stem) return `${stem.stem} = ${stem.meaning}`;
    const answer = normalizePracticeWord(answerText(mistake.exercise?.correctAnswer));
    if (answer) return answer;
  }
  return mistake.itemLabel ?? mistake.exercise?.prompt ?? mistake.knowledgePoint?.title ?? "Mistake";
}

function mistakeDisplayType(
  mistake: {
    mistakeType?: string | null;
    exercise?: { group?: string | null } | null;
    lesson?: { kind?: string | null } | null;
    category?: string | null;
    knowledgePoint?: { type?: string | null } | null;
  },
  category?: string
) {
  if (mistake.mistakeType) return mistake.mistakeType;
  if (isLatinStemMistake(mistake, category)) {
    const labelByGroup: Record<string, string> = {
      matching: "Stem Meaning",
      context: "Example Word",
      synonym: "Word Ally",
      antonym: "Opposite Word"
    };
    return labelByGroup[mistake.exercise?.group ?? ""] ?? "Stem Practice";
  }
  return "Practice Error";
}

function mistakeDisplaySource(
  mistake: {
    sourceModule?: string | null;
    lesson?: { title?: string | null; kind?: string | null } | null;
    course: { title: string };
    category?: string | null;
    knowledgePoint?: { type?: string | null } | null;
    exercise?: { group?: string | null } | null;
  },
  category?: string
) {
  if (mistake.sourceModule) return mistake.sourceModule;
  if (isLatinStemMistake(mistake, category)) return "Roots of Power";
  return mistake.lesson?.title ?? mistake.course.title;
}

function reviewHref(category: string, courseSlug?: string) {
  const slug = courseSlug ?? "caesars-english-ii";
  if (category === "Latin Stems") return `/courses/${slug}/battle`;
  if (category === "Analogies & Antonyms") return `/courses/${slug}/analogies-antonyms`;
  if (category === "Sentence Writing") return `/courses/${slug}/classic-word-quest/sentence-forge`;
  return `/courses/${slug}/classic-word-quest`;
}

function reviewSetHref(
  category: string,
  mistakes: Array<{ itemKey?: string | null; itemLabel?: string | null }>,
  courseSlug?: string
) {
  const slug = courseSlug ?? "caesars-english-ii";
  if (category !== "Classic Words" || mistakes.length === 0) return reviewHref(category, slug);
  const seen = new Set<string>();
  const targets = mistakes
    .map((mistake) => mistake.itemKey ?? mistake.itemLabel ?? "")
    .filter(Boolean)
    .filter((target) => {
      const key = target.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40)
    .map(encodeURIComponent)
    .join(",");
  return `/courses/${slug}/classic-word-quest/word-detective${targets ? `?targets=${targets}` : ""}`;
}

function originalPracticeHref(
  mistake: {
    course: { slug: string };
    lesson?: { slug: string; kind?: string | null } | null;
    itemKey?: string | null;
    itemLabel?: string | null;
    exercise?: { id?: string; prompt?: string | null; correctAnswer?: unknown; group?: string | null } | null;
    knowledgePoint?: { type?: string | null } | null;
    category?: string | null;
    sourceModule?: string | null;
  },
  category?: string
) {
  const slug = mistake.course.slug;
  const targetValue =
    latinStemFromMistake(mistake)?.stem ??
    mistake.itemKey ??
    mistake.itemLabel ??
    normalizePracticeWord(answerText(mistake.exercise?.correctAnswer)) ??
    "";
  const params = new URLSearchParams({
    returnTo: `/mistakes?category=${category ?? "Classic Words"}`,
    reviewCategory: category ?? "Classic Words"
  });
  if (targetValue) params.set("target", targetValue);
  const targetQuery = `?${params.toString()}`;
  if (isLatinStemMistake(mistake, category)) {
    const rootsParams = new URLSearchParams({
      type: "latin-stems",
      returnTo: `/mistakes?category=${category ?? "Latin Stems"}`,
      reviewCategory: category ?? "Latin Stems"
    });
    if (mistake.lesson?.slug) rootsParams.set("lesson", mistake.lesson.slug);
    if (mistake.exercise?.id) rootsParams.set("exercise", mistake.exercise.id);
    if (targetValue) rootsParams.set("target", targetValue);
    return `/courses/${slug}/vocab-practice?${rootsParams.toString()}`;
  }
  if (category === "Classic Words" && mistake.lesson?.kind === "CLASSIC_WORDS") {
    const classicParams = new URLSearchParams({
      type: "classic-words",
      returnTo: `/mistakes?category=${category}`,
      reviewCategory: category
    });
    if (mistake.lesson.slug) classicParams.set("lesson", mistake.lesson.slug);
    if (mistake.exercise?.id) classicParams.set("exercise", mistake.exercise.id);
    if (targetValue) classicParams.set("target", targetValue);
    return `/courses/${slug}/vocab-practice?${classicParams.toString()}`;
  }
  if (category === "Analogies & Antonyms") {
    const analogyParams = new URLSearchParams({
      returnTo: `/mistakes?category=${category}`,
      reviewCategory: category
    });
    if (targetValue) analogyParams.set("target", targetValue);
    return `/courses/${slug}/analogies-antonyms?${analogyParams.toString()}`;
  }
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
