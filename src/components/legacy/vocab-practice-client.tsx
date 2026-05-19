"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
  practiceType: PracticeType;
};

type PracticeType = "latin-stems" | "classic-words" | "all";
type PracticeGroup = "matching" | "context" | "synonym" | "antonym";
type AnsweredMap = Record<string, "correct" | "wrong">;
type MatchLine = { id: string; x1: number; y1: number; x2: number; y2: number; matched: boolean };

const labels: Record<string, string> = {
  matching: "连线",
  context: "上下文",
  synonym: "同义",
  antonym: "反义"
};

const practiceCopy: Record<PracticeType, { title: string; subtitle: string; description: string; lessonHint: string; empty: string }> = {
  "latin-stems": {
    title: "Roots of Power",
    subtitle: "Latin Stems Practice",
    description: "10 Power Stages · Roots · Meanings · Word Allies",
    lessonHint: "Choose a stage, complete each quest, and earn gemmae.",
    empty: "暂无 Latin Stems 练习单元。"
  },
  "classic-words": {
    title: "Classic Word Treasury",
    subtitle: "Classic Words Practice",
    description: "Even Lessons · Classic Words · 自动同步错题与进度",
    lessonHint: "只显示 Classic Words 课程：连线题 · 上下文选词 · 同义词 · 反义词",
    empty: "暂无 Classic Words 练习单元。"
  },
  all: {
    title: "词汇练习",
    subtitle: "Interactive Vocabulary Quiz",
    description: "20 Lessons · 4 Exercise Types · 自动同步错题与进度",
    lessonHint: "每个单元包含：连线题 · 上下文选词 · 同义词 · 反义词",
    empty: "暂无练习单元。"
  }
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

function romanNumber(value: number) {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romans[value - 1] ?? String(value);
}

function rootFeedback(message: string, wrongNumbers: number[] = []) {
  return wrongNumbers.length > 0 ? `${message} Quaestiones ${wrongNumbers.map(romanNumber).join(", ")} inspice.` : message;
}

function playTone(frequency: number, duration = 0.16, type: OscillatorType = "sine", gainValue = 0.05) {
  if (typeof window === "undefined") return;
  const audioWindow = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(gainValue, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  window.setTimeout(() => context.close().catch(() => undefined), duration * 1000 + 80);
}

function playRootClickSound() {
  playTone(360, 0.08, "triangle", 0.035);
}

function playRootCorrectSound() {
  playTone(520, 0.11, "sine", 0.045);
  window.setTimeout(() => playTone(760, 0.15, "sine", 0.045), 105);
}

function playRootWrongSound() {
  playTone(220, 0.14, "sawtooth", 0.03);
  window.setTimeout(() => playTone(165, 0.18, "sawtooth", 0.025), 125);
}

function playRootRewardSound() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    window.setTimeout(() => playTone(frequency, 0.18, "triangle", 0.05), index * 115);
  });
}

async function refreshRewardHeader(courseId: string) {
  const response = await fetch(appPath(`/api/rewards?courseId=${courseId}`));
  if (!response.ok) return;
  const payload = (await response.json()) as { data?: { gems?: number; rank?: number | null } };
  if (typeof payload.data?.gems === "number") {
    window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
  }
}

export function VocabPracticeClient({ courseId, courseSlug, isLoggedIn, lessons, practiceType }: Props) {
  const matchingAreaRef = useRef<HTMLDivElement | null>(null);
  const matchItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<AnsweredMap>({});
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [choiceSelections, setChoiceSelections] = useState<Record<string, string>>({});
  const [checkedChoiceStatus, setCheckedChoiceStatus] = useState<Record<string, "correct" | "wrong">>({});
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});
  const [awardedSections, setAwardedSections] = useState<Record<string, number>>({});
  const [matchLines, setMatchLines] = useState<MatchLine[]>([]);
  const [toast, setToast] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const activeLessonIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const copy = practiceCopy[practiceType];
  const isRootsPower = practiceType === "latin-stems";
  const pageClassName = `legacy-page ${isRootsPower ? "roots-power-page" : ""}`;

  function lessonNumber(lesson: LegacyLesson, index: number) {
    return practiceType === "all" ? lesson.order : index + 1;
  }

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
  const activeGroups = (["matching", "context", "synonym", "antonym"] as PracticeGroup[]).filter((group) => grouped[group].length > 0);

  useEffect(() => {
    if (!isRootsPower || !matchingAreaRef.current) {
      setMatchLines([]);
      return;
    }

    function updateLines() {
      const container = matchingAreaRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const nextLines = Object.entries(matchingSelections).flatMap(([leftId, rightId]) => {
        const left = matchItemRefs.current[`left-${leftId}`];
        const right = matchItemRefs.current[`right-${rightId}`];
        if (!left || !right) return [];
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        return [{
          id: `${leftId}-${rightId}`,
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          matched: Boolean(matched[leftId])
        }];
      });
      setMatchLines(nextLines);
    }

    updateLines();
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [isRootsPower, matchingSelections, matched, shuffledMatchingWords, activeLessonId]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1400);
  }

  async function recordAttempt(exercise: LegacyExercise, answer: string, isCorrect: boolean, silent = false) {
    if (!silent) setAnswered((prev) => ({ ...prev, [exercise.id]: isCorrect ? "correct" : "wrong" }));
    if (!silent) notify(isCorrect ? "✓ 正确！" : "✗ 再接再厉");

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

  async function applyRootsReward(amount: number, sourceKey: string, reason: string) {
    if (!isLoggedIn) return 0;
    const response = await fetch(appPath("/api/rewards"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        amount,
        source: "roots-of-power",
        sourceKey,
        reason
      })
    });
    if (!response.ok) return 0;
    const payload = (await response.json()) as { data?: { gems?: number; rank?: number | null; awarded?: number } };
    if (typeof payload.data?.gems === "number") {
      window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
    }
    return payload.data?.awarded ?? 0;
  }

  function startLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setAnswered({});
    setMatched({});
    setMatchingSelections({});
    setChoiceSelections({});
    setCheckedChoiceStatus({});
    setSectionFeedback({});
    setCompletedSections({});
    setAwardedSections({});
    setSelectedMatch(null);
    setShowAnswers(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToHome() {
    setActiveLessonId(null);
    setAnswered({});
    setMatched({});
    setMatchingSelections({});
    setChoiceSelections({});
    setCheckedChoiceStatus({});
    setSectionFeedback({});
    setCompletedSections({});
    setAwardedSections({});
    setSelectedMatch(null);
    setShowAnswers(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseMatch(definitionId: string, wordId?: string) {
    if (isRootsPower) {
      if (!wordId) {
        setSelectedMatch(definitionId);
        playRootClickSound();
        return;
      }
      if (!selectedMatch) {
        notify("Primum sensum elige.");
        playRootWrongSound();
        return;
      }
      setMatchingSelections((prev) => ({ ...prev, [selectedMatch]: wordId }));
      setMatched((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([key, value]) => {
          if (value && key === selectedMatch) next[key] = false;
        });
        return next;
      });
      setSectionFeedback((prev) => ({ ...prev, matching: "" }));
      setSelectedMatch(null);
      playRootClickSound();
      return;
    }

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

  function chooseRootsOption(exerciseId: string, option: string) {
    setChoiceSelections((prev) => ({ ...prev, [exerciseId]: option }));
    setCheckedChoiceStatus((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setSectionFeedback((prev) => {
      const next = { ...prev };
      const exercise = activeLesson?.exercises.find((item) => item.id === exerciseId);
      if (exercise?.group) next[exercise.group] = "";
      return next;
    });
    playRootClickSound();
  }

  async function completeRootsSection(group: PracticeGroup) {
    if (!activeLesson || grouped[group].length === 0) return;
    const exercises = grouped[group];
    const wrongNumbers: number[] = [];

    exercises.forEach((exercise, index) => {
      const answer = group === "matching" ? matchingSelections[exercise.id] : choiceSelections[exercise.id];
      const isCorrect = group === "matching" ? answer === exercise.id : normalize(answer) === normalize(asAnswer(exercise.correctAnswer));
      if (!isCorrect) wrongNumbers.push(index + 1);
    });

    if (wrongNumbers.length > 0) {
      if (group === "matching") {
        setMatchingSelections((prev) => {
          const next = { ...prev };
          exercises.forEach((exercise, index) => {
            if (wrongNumbers.includes(index + 1)) delete next[exercise.id];
          });
          return next;
        });
      } else {
        setCheckedChoiceStatus((prev) => {
          const next = { ...prev };
          exercises.forEach((exercise, index) => {
            const selected = choiceSelections[exercise.id];
            if (!selected) {
              delete next[exercise.id];
            } else {
              next[exercise.id] = wrongNumbers.includes(index + 1) ? "wrong" : "correct";
            }
          });
          return next;
        });
      }
      setCompletedSections((prev) => ({ ...prev, [group]: false }));
      setSectionFeedback((prev) => ({ ...prev, [group]: rootFeedback("Iterum!", wrongNumbers) }));
      exercises.forEach((exercise, index) => {
        if (wrongNumbers.includes(index + 1)) {
          const answer = group === "matching" ? matchingSelections[exercise.id] ?? "" : choiceSelections[exercise.id] ?? "";
          recordAttempt(exercise, answer, false, true).catch(() => undefined);
        }
      });
      playRootWrongSound();
      return;
    }

    if (group !== "matching") {
      setCheckedChoiceStatus((prev) => {
        const next = { ...prev };
        exercises.forEach((exercise) => {
          next[exercise.id] = "correct";
        });
        return next;
      });
    }
    setCompletedSections((prev) => ({ ...prev, [group]: true }));
    setSectionFeedback((prev) => ({ ...prev, [group]: "Recte! Omnia bene facta sunt." }));
    setAnswered((prev) => {
      const next = { ...prev };
      exercises.forEach((exercise) => {
        next[exercise.id] = "correct";
      });
      return next;
    });
    if (group === "matching") {
      setMatched((prev) => {
        const next = { ...prev };
        exercises.forEach((exercise) => {
          next[exercise.id] = true;
        });
        return next;
      });
    }
    exercises.forEach((exercise) => {
      const answer = group === "matching" ? asAnswer(exercise.correctAnswer) : choiceSelections[exercise.id] ?? "";
      recordAttempt(exercise, answer, true, true).catch(() => undefined);
    });

    playRootCorrectSound();
    const sectionAward = await applyRootsReward(3, `roots-power-section-${activeLesson.id}-${group}`, `Completed ${group} in Roots of Power ${activeLesson.title}`);
    if (sectionAward > 0) {
      setAwardedSections((prev) => ({ ...prev, [group]: sectionAward }));
      playRootRewardSound();
      setSectionFeedback((prev) => ({ ...prev, [group]: `Recte! +${sectionAward} gemmae.` }));
    }

    const nextCompleted = { ...completedSections, [group]: true };
    if (activeGroups.every((item) => nextCompleted[item])) {
      const lessonAward = await applyRootsReward(8, `roots-power-lesson-${activeLesson.id}`, `Completed all quests in Roots of Power ${activeLesson.title}`);
      if (lessonAward > 0) {
        playRootRewardSound();
        notify(`Macte! +${lessonAward} gemmae.`);
      }
    }
  }

  if (!activeLesson) {
    return (
      <main className={pageClassName}>
        <section className="legacy-cover">
          <div className="legacy-label">Caesar&apos;s English II</div>
          <h1>{copy.title}</h1>
          <div className="legacy-subtitle">{copy.subtitle}</div>
          <div className="legacy-gold-line" />
          <p>{copy.description}</p>
        </section>

        <div className="legacy-container">
          <Link className="legacy-back" href={`/courses/${courseSlug}`}>
            {isRootsPower ? "← Learning Center" : "← 返回学习中心首页"}
          </Link>
          <h2 className="legacy-section-title">{isRootsPower ? "Choose Your Power Stage" : "选择单元开始练习"}</h2>
          <p className="legacy-muted">{copy.lessonHint}</p>
          <div className="legacy-lesson-grid">
            {lessons.length > 0 ? lessons.map((lesson, lessonIndex) => {
              const matchingCount = lesson.exercises.filter((item) => item.group === "matching").length;
              const choiceCount = lesson.exercises.length - matchingCount;
              const displayNumber = lessonNumber(lesson, lessonIndex);
              return (
                <button className="legacy-lesson-card" key={lesson.id} onClick={() => startLesson(lesson.id)} type="button">
                  <span className="legacy-lesson-num">Lesson {displayNumber}</span>
                  <strong>{isRootsPower ? `Power Stage ${displayNumber}` : lesson.kind === "LATIN_STEMS" ? "Latin Stems" : "Classic Words"}</strong>
                  <small>{matchingCount} match + {choiceCount} choice</small>
                </button>
              );
            }) : <div className="legacy-empty">{copy.empty}</div>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <section className="legacy-cover compact">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>{copy.title}</h1>
        <div className="legacy-subtitle">{isRootsPower ? `Lesson ${activeLessonIndex + 1} · Power Stage` : activeLesson.title}</div>
        <div className="legacy-gold-line" />
      </section>

      <div className="legacy-container">
        <button className="legacy-back as-button" onClick={backToHome} type="button">
          {isRootsPower ? "← Power Stage Map" : "← 返回单元列表"}
        </button>

        <div className="legacy-score-bar">
          <span>{isRootsPower ? "Power Meter" : "本节得分"}</span>
          <div className="legacy-score-track">
            <div className="legacy-score-fill" style={{ width: `${score}%` }} />
          </div>
          <strong>{score}%</strong>
        </div>

        {grouped.matching.length > 0 ? (
          <section className="legacy-ex-section">
            <h3>{isRootsPower ? "Quest 1 · Match the Power Root" : "练习一：连线题 — 英文释义 ↔ 单词匹配"}</h3>
            <div className="legacy-matching roots-match-board" ref={matchingAreaRef}>
              {isRootsPower ? (
                <svg className="roots-match-lines" aria-hidden="true">
                  {matchLines.map((line) => (
                    <line
                      className={line.matched ? "matched" : ""}
                      key={line.id}
                      x1={line.x1}
                      x2={line.x2}
                      y1={line.y1}
                      y2={line.y2}
                    />
                  ))}
                </svg>
              ) : null}
              <div>
                <h4>{isRootsPower ? "Meaning Clues" : "英文释义"}</h4>
                {grouped.matching.map((exercise) => (
                  <button
                    className={`legacy-match-item ${selectedMatch === exercise.id ? "selected" : ""} ${matchingSelections[exercise.id] ? "assigned" : ""} ${matched[exercise.id] ? "matched" : ""}`}
                    key={exercise.id}
                    onClick={() => chooseMatch(exercise.id)}
                    ref={(node) => {
                      matchItemRefs.current[`left-${exercise.id}`] = node;
                    }}
                    type="button"
                  >
                    {exercise.prompt}
                  </button>
                ))}
              </div>
              <div>
                <h4>{isRootsPower ? "Root Cards" : "单词"}</h4>
                {shuffledMatchingWords.map((item) => (
                  <button
                    className={`legacy-match-item ${Object.values(matchingSelections).includes(item.id) ? "assigned" : ""} ${matched[item.id] ? "matched" : ""}`}
                    key={item.id}
                    onClick={() => chooseMatch(selectedMatch ?? "", item.id)}
                    ref={(node) => {
                      matchItemRefs.current[`right-${item.id}`] = node;
                    }}
                    type="button"
                  >
                    {item.word}
                  </button>
                ))}
              </div>
            </div>
            {isRootsPower ? (
              <div className="roots-check-row">
                <button className="roots-check-button" onClick={() => completeRootsSection("matching")} type="button">
                  Check Quest
                </button>
                {sectionFeedback.matching ? <span className={`roots-section-feedback ${completedSections.matching ? "correct" : "wrong"}`}>{sectionFeedback.matching}</span> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {(["context", "synonym", "antonym"] as const).map((group, index) =>
          grouped[group].length > 0 ? (
            <section className="legacy-ex-section" key={group}>
              <h3>{isRootsPower ? `Quest ${index + 2} · ${group === "context" ? "Choose in Context" : group === "synonym" ? "Find the Ally Word" : "Spot the Opposite"}` : `练习${["二", "三", "四"][index]}：${group === "context" ? "上下文选词题" : group === "synonym" ? "同义词选择题" : "反义词选择题"}`}</h3>
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
                        const selected = choiceSelections[exercise.id] === option;
                        const rootsStatus = isRootsPower && selected ? checkedChoiceStatus[exercise.id] : undefined;
                        return (
                          <button
                            className={`legacy-opt ${selected ? "selected" : ""} ${rootsStatus === "correct" ? "checked-correct" : ""} ${rootsStatus === "wrong" ? "checked-wrong" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "disabled" : ""}`}
                            disabled={!isRootsPower && Boolean(status)}
                            key={option}
                            onClick={() => isRootsPower ? chooseRootsOption(exercise.id, option) : recordAttempt(exercise, option, normalize(option) === normalize(correctAnswer))}
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
              {isRootsPower ? (
                <div className="roots-check-row">
                  <button className="roots-check-button" onClick={() => completeRootsSection(group)} type="button">
                    Check Quest
                  </button>
                  {sectionFeedback[group] ? <span className={`roots-section-feedback ${completedSections[group] ? "correct" : "wrong"}`}>{sectionFeedback[group]}</span> : null}
                </div>
              ) : null}
            </section>
          ) : null
        )}

        {!isRootsPower ? (
          <button className="legacy-reveal" onClick={() => setShowAnswers(true)} type="button">
            显示答案键
          </button>
        ) : null}
        {showAnswers && !isRootsPower ? (
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
