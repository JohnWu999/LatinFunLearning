"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type LegacyExercise = {
  id: string;
  type: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  group: string | null;
  order: number;
};

type LegacyLesson = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  order: number;
  exercises: LegacyExercise[];
};

type Props = {
  courseId: string;
  courseSlug: string;
  isLoggedIn: boolean;
  lessons: LegacyLesson[];
};

type AnsweredMap = Record<string, "correct" | "wrong">;

const labels: Record<string, string> = {
  matching: "连线",
  context: "上下文",
  synonym: "同义",
  antonym: "反义"
};

function asOptions(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asAnswer(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function optionLetter(option: string) {
  return option.match(/^([a-z])\./i)?.[1]?.toLowerCase() ?? "";
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

async function refreshRewardHeader(courseId: string) {
  const response = await fetch(appPath(`/api/rewards?courseId=${courseId}`));
  if (!response.ok) return;
  const payload = (await response.json()) as { data?: { gems?: number; rank?: number | null } };
  if (typeof payload.data?.gems === "number") {
    window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
  }
}

export function VocabPracticeClient({ courseId, courseSlug, isLoggedIn, lessons }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<AnsweredMap>({});
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;

  const grouped = useMemo(() => {
    const groups: Record<string, LegacyExercise[]> = {
      matching: [],
      context: [],
      synonym: [],
      antonym: []
    };
    activeLesson?.exercises.forEach((exercise) => {
      const key = exercise.group ?? "context";
      if (!groups[key]) groups[key] = [];
      groups[key].push(exercise);
    });
    return groups;
  }, [activeLesson]);

  const shuffledMatchingWords = useMemo(
    () => shuffle(grouped.matching.map((exercise) => ({ id: exercise.id, word: asAnswer(exercise.correctAnswer) }))),
    [grouped.matching]
  );

  const totalQuestions = activeLesson?.exercises.length ?? 0;
  const correctCount = Object.values(answered).filter((value) => value === "correct").length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1400);
  }

  async function recordAttempt(exercise: LegacyExercise, answer: string, isCorrect: boolean) {
    setAnswered((prev) => ({ ...prev, [exercise.id]: isCorrect ? "correct" : "wrong" }));
    notify(isCorrect ? "✓ 正确！" : "✗ 再接再厉");

    if (!isLoggedIn || !activeLesson) return;
    const response = await fetch(appPath("/api/attempts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        lessonId: activeLesson.id,
        exerciseId: exercise.id,
        answer,
        isCorrect,
        gameMode: "vocab-practice"
      })
    });
    if (response.ok && isCorrect) await refreshRewardHeader(courseId);
  }

  function startLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setAnswered({});
    setMatched({});
    setSelectedMatch(null);
    setShowAnswers(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToHome() {
    setActiveLessonId(null);
    setAnswered({});
    setMatched({});
    setSelectedMatch(null);
    setShowAnswers(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseMatch(definitionId: string, wordId?: string) {
    if (!wordId) {
      if (matched[definitionId]) return;
      setSelectedMatch(definitionId);
      return;
    }

    if (!activeLesson || matched[wordId]) return;
    const exercise = grouped.matching.find((item) => item.id === (selectedMatch ?? ""));
    if (!exercise) {
      notify("先选择左侧英文释义");
      return;
    }

    const isCorrect = exercise.id === wordId;
    if (isCorrect) {
      setMatched((prev) => ({ ...prev, [exercise.id]: true }));
      recordAttempt(exercise, asAnswer(exercise.correctAnswer), true);
    } else {
      recordAttempt(exercise, asAnswer(grouped.matching.find((item) => item.id === wordId)?.correctAnswer), false);
    }
    setSelectedMatch(null);
  }

  if (!activeLesson) {
    return (
      <main className="legacy-page">
        <section className="legacy-cover">
          <div className="legacy-label">Caesar&apos;s English II</div>
          <h1>词汇练习</h1>
          <div className="legacy-subtitle">Interactive Vocabulary Quiz</div>
          <div className="legacy-gold-line" />
          <p>20 Lessons · 4 Exercise Types · 自动同步错题与进度</p>
        </section>

        <div className="legacy-container">
          <Link className="legacy-back" href={`/courses/${courseSlug}`}>
            ← 返回学习中心首页
          </Link>
          <h2 className="legacy-section-title">选择单元开始练习</h2>
          <p className="legacy-muted">每个单元包含：连线题 · 上下文选词 · 同义词 · 反义词</p>
          <div className="legacy-lesson-grid">
            {lessons.map((lesson) => {
              const matchingCount = lesson.exercises.filter((item) => item.group === "matching").length;
              const choiceCount = lesson.exercises.length - matchingCount;
              return (
                <button className="legacy-lesson-card" key={lesson.id} onClick={() => startLesson(lesson.id)} type="button">
                  <span className="legacy-lesson-num">Lesson {lesson.order}</span>
                  <strong>{lesson.kind === "LATIN_STEMS" ? "Latin Stems" : "Classic Words"}</strong>
                  <small>{matchingCount} 连线 + {choiceCount} 选择</small>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="legacy-page">
      <section className="legacy-cover compact">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>词汇练习</h1>
        <div className="legacy-subtitle">{activeLesson.title}</div>
        <div className="legacy-gold-line" />
      </section>

      <div className="legacy-container">
        <button className="legacy-back as-button" onClick={backToHome} type="button">
          ← 返回单元列表
        </button>

        <div className="legacy-score-bar">
          <span>本节得分</span>
          <div className="legacy-score-track">
            <div className="legacy-score-fill" style={{ width: `${score}%` }} />
          </div>
          <strong>{score}%</strong>
        </div>

        {grouped.matching.length > 0 ? (
          <section className="legacy-ex-section">
            <h3>练习一：连线题 — 英文释义 ↔ 单词匹配</h3>
            <div className="legacy-matching">
              <div>
                <h4>英文释义</h4>
                {grouped.matching.map((exercise) => (
                  <button
                    className={`legacy-match-item ${selectedMatch === exercise.id ? "selected" : ""} ${matched[exercise.id] ? "matched" : ""}`}
                    key={exercise.id}
                    onClick={() => chooseMatch(exercise.id)}
                    type="button"
                  >
                    {exercise.prompt}
                  </button>
                ))}
              </div>
              <div>
                <h4>单词</h4>
                {shuffledMatchingWords.map((item) => (
                  <button
                    className={`legacy-match-item ${matched[item.id] ? "matched" : ""}`}
                    key={item.id}
                    onClick={() => chooseMatch(selectedMatch ?? "", item.id)}
                    type="button"
                  >
                    {item.word}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {(["context", "synonym", "antonym"] as const).map((group, index) =>
          grouped[group].length > 0 ? (
            <section className="legacy-ex-section" key={group}>
              <h3>练习{["二", "三", "四"][index]}：{group === "context" ? "上下文选词题" : group === "synonym" ? "同义词选择题" : "反义词选择题"}</h3>
              {grouped[group].map((exercise, exerciseIndex) => {
                const status = answered[exercise.id];
                const correctAnswer = asAnswer(exercise.correctAnswer);
                return (
                  <div className="legacy-mcq" key={exercise.id}>
                    <div className="legacy-mcq-q">{exerciseIndex + 1}. {exercise.prompt}</div>
                    <div className="legacy-options">
                      {asOptions(exercise.options).map((option) => {
                        const isCorrect = status && normalize(option) === normalize(correctAnswer);
                        const isWrong = status === "wrong" && !isCorrect && normalize(option) !== normalize(correctAnswer);
                        return (
                          <button
                            className={`legacy-opt ${isCorrect ? "correct" : ""} ${isWrong ? "disabled" : ""}`}
                            disabled={Boolean(status)}
                            key={option}
                            onClick={() => recordAttempt(exercise, option, normalize(option) === normalize(correctAnswer))}
                            type="button"
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null
        )}

        <button className="legacy-reveal" onClick={() => setShowAnswers(true)} type="button">
          显示答案键
        </button>
        {showAnswers ? (
          <section className="legacy-answer-key">
            <h4>答案键</h4>
            {(["matching", "context", "synonym", "antonym"] as const).map((group) => (
              <div className="legacy-answer-row" key={group}>
                <strong>{labels[group]}</strong>
                <span>
                  {group === "matching"
                    ? grouped.matching.map((exercise, index) => `${index + 1}-${asAnswer(exercise.correctAnswer)}`).join(", ")
                    : grouped[group].map((exercise, index) => `${index + 1}.${optionLetter(asAnswer(exercise.correctAnswer))}`).join(", ")}
                </span>
              </div>
            ))}
          </section>
        ) : null}
      </div>

      <div className={`legacy-toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}
