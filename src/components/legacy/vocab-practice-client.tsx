"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RewardGemBurst, useRewardGemBurst } from "@/components/reward-gem-burst";
import { latinStemLessons } from "@/lib/latin-stem-lessons";

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
  initialLessonSlug?: string;
  initialExerciseId?: string;
  reviewTarget?: string;
  returnTo?: string;
  reviewCategory?: string;
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

const latinStemPracticeLookup = new Map<string, { stem: string; meaning: string; exampleWord: string }>();
Object.values(latinStemLessons).forEach((lesson) => {
  lesson.newStems.forEach((card) => {
    const words = [card.nonfiction.word, ...card.examples];
    words.forEach((word) => {
      latinStemPracticeLookup.set(normalizePracticeWord(word), {
        stem: card.stem,
        meaning: card.meaning,
        exampleWord: card.nonfiction.word
      });
    });
  });
  lesson.reviewStems.forEach((card) => {
    card.examples.forEach((word) => {
      latinStemPracticeLookup.set(normalizePracticeWord(word), {
        stem: card.stem,
        meaning: card.meaning,
        exampleWord: word
      });
    });
  });
});

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
    description: "10 Treasury Steps · Meanings · Context · Word Allies",
    lessonHint: "Choose a step, complete each quest, and earn gemmae.",
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

function normalizePracticeWord(value: unknown) {
  return normalize(String(value ?? "").replace(/^[a-z]\.\s*/i, ""));
}

function exerciseMatchesReviewTarget(exercise: LegacyExercise, target?: string) {
  const normalizedTarget = normalizePracticeWord(target);
  if (!normalizedTarget) return false;
  return [
    exercise.prompt,
    asAnswer(exercise.correctAnswer),
    ...asOptions(exercise.options)
  ].some((value) => {
    const normalizedValue = normalizePracticeWord(value);
    return Boolean(normalizedValue) && (normalizedValue.includes(normalizedTarget) || normalizedTarget.includes(normalizedValue));
  });
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

function speakLatinEncouragement(stage: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(stage >= 10 ? "Macte virtute! Omnes gradus vicisti." : "Macte! Ascende ad proximum gradum.");
  utterance.lang = "la";
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function progressStorageKey(courseId: string, practiceType: PracticeType) {
  return practiceType === "latin-stems"
    ? `roots_power_completed_${courseId}`
    : `classic_treasury_completed_${courseId}`;
}

function sessionStorageKey(courseId: string, practiceType: PracticeType) {
  return `latinfun_${practiceType}_session_${courseId}`;
}

function stageTitle(practiceType: PracticeType, stage: number) {
  if (practiceType === "latin-stems") return `Power Stage ${stage}`;
  if (practiceType === "classic-words") return `Treasury Step ${stage}`;
  return `Lesson ${stage}`;
}

function stageCardTitle(practiceType: PracticeType, stage: number) {
  if (practiceType === "classic-words") return `Step ${stage}`;
  return stageTitle(practiceType, stage);
}

function questTitle(practiceType: PracticeType, group: PracticeGroup, questNumber: number) {
  if (practiceType === "all") {
    if (group === "matching") return "练习一：连线题 — 英文释义 ↔ 单词匹配";
    return `练习${["二", "三", "四"][questNumber - 2]}：${group === "context" ? "上下文选词题" : group === "synonym" ? "同义词选择题" : "反义词选择题"}`;
  }
  if (practiceType === "latin-stems") {
    if (group === "matching") return "Quest 1 · Match the Power Root";
    return `Quest ${questNumber} · ${group === "context" ? "Choose in Context" : group === "synonym" ? "Find the Ally Word" : "Spot the Opposite"}`;
  }
  if (group === "matching") return "Quest 1 · Match the Treasure Word";
  return `Quest ${questNumber} · ${group === "context" ? "Choose in Context" : group === "synonym" ? "Find the Kindred Word" : "Find the Opposite"}`;
}

async function refreshRewardHeader(courseId: string) {
  const response = await fetch(appPath(`/api/rewards?courseId=${courseId}`));
  if (!response.ok) return;
  const payload = (await response.json()) as { data?: { gems?: number; rank?: number | null } };
  if (typeof payload.data?.gems === "number") {
    window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
  }
}

type ProgressPayload = {
  data?: {
    practiceLessonProgress?: {
      rootsOfPower?: string[];
      classicWordTreasury?: string[];
    };
  };
};

export function VocabPracticeClient({ courseId, courseSlug, isLoggedIn, lessons, practiceType, initialLessonSlug, initialExerciseId, reviewTarget, returnTo }: Props) {
  const { flyingGems, launchGemBurst } = useRewardGemBurst(".legacy-page");
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
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [hasLoadedStageProgress, setHasLoadedStageProgress] = useState(!["latin-stems", "classic-words"].includes(practiceType));
  const [climberJumpStage, setClimberJumpStage] = useState<number | null>(null);
  const [reviewFocusExerciseId, setReviewFocusExerciseId] = useState<string | null>(initialExerciseId ?? null);
  const [rootsMapMessage, setRootsMapMessage] = useState("");
  const [matchLines, setMatchLines] = useState<MatchLine[]>([]);
  const [toast, setToast] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const sessionLoadedRef = useRef(false);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const activeLessonIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const copy = practiceCopy[practiceType];
  const isRootsPower = practiceType === "latin-stems";
  const isClassicTreasure = practiceType === "classic-words";
  const isStagePractice = isRootsPower || isClassicTreasure;
  const isSingleMistakeReview = isStagePractice && Boolean(initialExerciseId);
  const safeReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  const pageClassName = `legacy-page ${isRootsPower ? "roots-power-page" : ""} ${isClassicTreasure ? "classic-treasure-page" : ""}`;
  const completedLessonSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const highestCompletedIndex = lessons.reduce((highest, lesson, index) => completedLessonSet.has(lesson.id) ? Math.max(highest, index) : highest, -1);
  const restingClimberStage = isStagePractice && lessons.length > 0 ? Math.max(1, Math.min(highestCompletedIndex + 1, lessons.length)) : 1;
  const climberStage = climberJumpStage ?? restingClimberStage;

  function lessonNumber(lesson: LegacyLesson, index: number) {
    return practiceType === "all" ? lesson.order : index + 1;
  }

  useEffect(() => {
    if (!initialLessonSlug || activeLessonId) return;
    const lesson = lessons.find((item) => item.slug === initialLessonSlug || item.id === initialLessonSlug);
    if (!lesson) return;
    openLesson(lesson.id);
  }, [activeLessonId, initialLessonSlug, lessons]);

  useEffect(() => {
    if (!isStagePractice || initialLessonSlug || initialExerciseId || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(sessionStorageKey(courseId, practiceType));
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        activeLessonId?: string | null;
        answered?: AnsweredMap;
        matched?: Record<string, boolean>;
        matchingSelections?: Record<string, string>;
        choiceSelections?: Record<string, string>;
        checkedChoiceStatus?: Record<string, "correct" | "wrong">;
        sectionFeedback?: Record<string, string>;
        completedSections?: Record<string, boolean>;
        awardedSections?: Record<string, number>;
      };
      if (!saved.activeLessonId || !lessons.some((lesson) => lesson.id === saved.activeLessonId)) return;
      setActiveLessonId(saved.activeLessonId);
      setAnswered(saved.answered ?? {});
      setMatched(saved.matched ?? {});
      setMatchingSelections(saved.matchingSelections ?? {});
      setChoiceSelections(saved.choiceSelections ?? {});
      setCheckedChoiceStatus(saved.checkedChoiceStatus ?? {});
      setSectionFeedback(saved.sectionFeedback ?? {});
      setCompletedSections(saved.completedSections ?? {});
      setAwardedSections(saved.awardedSections ?? {});
    } catch {
      window.localStorage.removeItem(sessionStorageKey(courseId, practiceType));
    }
  }, [courseId, initialExerciseId, initialLessonSlug, isStagePractice, lessons, practiceType]);

  useEffect(() => {
    if (!isStagePractice || !sessionLoadedRef.current) return;
    try {
      if (!activeLessonId) {
        window.localStorage.removeItem(sessionStorageKey(courseId, practiceType));
        return;
      }
      window.localStorage.setItem(sessionStorageKey(courseId, practiceType), JSON.stringify({
        activeLessonId,
        answered,
        matched,
        matchingSelections,
        choiceSelections,
        checkedChoiceStatus,
        sectionFeedback,
        completedSections,
        awardedSections
      }));
    } catch {
      // Local progress persistence is optional.
    }
  }, [activeLessonId, answered, awardedSections, checkedChoiceStatus, choiceSelections, completedSections, courseId, isStagePractice, matched, matchingSelections, practiceType, sectionFeedback]);

  useEffect(() => {
    if (!activeLesson || (!initialExerciseId && !reviewTarget)) return;
    const targetExercise =
      activeLesson.exercises.find((exercise) => exercise.id === initialExerciseId) ??
      activeLesson.exercises.find((exercise) => exerciseMatchesReviewTarget(exercise, reviewTarget));
    if (!targetExercise) return;
    setReviewFocusExerciseId(targetExercise.id);
    const timer = window.setTimeout(() => {
      document.getElementById(`practice-exercise-${targetExercise.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 220);
    const clearTimer = window.setTimeout(() => setReviewFocusExerciseId(null), 4200);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [activeLesson, initialExerciseId, reviewTarget]);

  useEffect(() => {
    if (!isStagePractice || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(progressStorageKey(courseId, practiceType));
    if (!stored) {
      setHasLoadedStageProgress(true);
      return;
    }
    try {
      const ids = JSON.parse(stored);
      if (Array.isArray(ids)) setCompletedLessonIds(ids.filter((id): id is string => typeof id === "string"));
    } catch {
      window.localStorage.removeItem(progressStorageKey(courseId, practiceType));
    } finally {
      setHasLoadedStageProgress(true);
    }
  }, [courseId, isStagePractice, practiceType]);

  useEffect(() => {
    if (!isStagePractice || !isLoggedIn) return;
    let cancelled = false;
    fetch(appPath(`/api/progress?courseId=${encodeURIComponent(courseId)}`))
      .then((response) => response.ok ? response.json() as Promise<ProgressPayload> : null)
      .then((payload) => {
        if (cancelled || !payload?.data?.practiceLessonProgress) return;
        const serverIds = practiceType === "latin-stems"
          ? payload.data.practiceLessonProgress.rootsOfPower ?? []
          : payload.data.practiceLessonProgress.classicWordTreasury ?? [];
        if (!serverIds.length) return;
        setCompletedLessonIds((prev) => Array.from(new Set([...prev, ...serverIds])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [courseId, isLoggedIn, isStagePractice, practiceType]);

  useEffect(() => {
    if (!isStagePractice || typeof window === "undefined") return;
    if (!hasLoadedStageProgress) return;
    window.localStorage.setItem(progressStorageKey(courseId, practiceType), JSON.stringify(completedLessonIds));
  }, [completedLessonIds, courseId, hasLoadedStageProgress, isStagePractice, practiceType]);

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
  const completedLessonIdsForMeter = useMemo(() => {
    const ids = new Set(completedLessonIds);
    if (isStagePractice && activeLesson && activeGroups.length > 0 && activeGroups.every((group) => completedSections[group])) {
      ids.add(activeLesson.id);
    }
    return ids;
  }, [activeGroups, activeLesson, completedLessonIds, completedSections, isStagePractice]);
  const stageScore = isStagePractice && lessons.length > 0
    ? Math.round((completedLessonIdsForMeter.size / lessons.length) * 100)
    : score;
  const displayedScore = isStagePractice ? stageScore : score;
  const singleReviewExercise = isSingleMistakeReview && activeLesson
    ? activeLesson.exercises.find((exercise) => exercise.id === initialExerciseId) ?? null
    : null;

  useEffect(() => {
    if (!isStagePractice || !matchingAreaRef.current) {
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
  }, [isStagePractice, matchingSelections, matched, shuffledMatchingWords, activeLessonId]);

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
    if (isRootsPower) {
      if (isCorrect) {
        markLatinStemPracticeMastered(exercise).catch(() => undefined);
      } else {
        recordLatinStemPracticeMistake(exercise, answer).catch(() => undefined);
      }
    }
  }

  function stemMistakeFromExercise(exercise: LegacyExercise) {
    const answerWord = normalizePracticeWord(asAnswer(exercise.correctAnswer));
    const promptWord = normalizePracticeWord(exercise.prompt);
    return latinStemPracticeLookup.get(answerWord) ?? latinStemPracticeLookup.get(promptWord);
  }

  async function recordLatinStemPracticeMistake(exercise: LegacyExercise, answer: string) {
    if (!isLoggedIn || !activeLesson) return;
    const stem = stemMistakeFromExercise(exercise);
    if (!stem) return;
    await fetch(appPath("/api/mistakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        lessonId: activeLesson.id,
        exerciseId: exercise.id,
        category: "Latin Stems",
        itemKey: stem.stem,
        itemLabel: `${stem.stem} = ${stem.meaning}`,
        mistakeType: labels[exercise.group ?? ""] ?? "Stem Practice",
        sourceModule: "Roots of Power",
        prompt: exercise.prompt,
        userAnswer: answer,
        correctAnswer: asAnswer(exercise.correctAnswer)
      })
    }).catch(() => undefined);
  }

  async function markLatinStemPracticeMastered(exercise: LegacyExercise) {
    if (!isLoggedIn) return;
    const stem = stemMistakeFromExercise(exercise);
    if (!stem) return;
    await fetch(appPath("/api/mistakes"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        category: "Latin Stems",
        itemKey: stem.stem,
        itemLabel: `${stem.stem} = ${stem.meaning}`,
        sourceModule: "Roots of Power"
      })
    }).catch(() => undefined);
  }

  async function applyStageReward(amount: number, sourceKey: string, reason: string) {
    if (!isLoggedIn) return 0;
    const response = await fetch(appPath("/api/rewards"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        amount,
        source: isRootsPower ? "roots-of-power" : "classic-word-treasury",
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

  function resetActiveLessonState() {
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
  }

  function openLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setRootsMapMessage("");
    setClimberJumpStage(null);
    resetActiveLessonState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startLesson(lessonId: string, stage?: number) {
    if (!isStagePractice || !stage) {
      openLesson(lessonId);
      return;
    }

    setRootsMapMessage(`Ascende ad Gradum ${stage}.`);
    setClimberJumpStage(stage);
    playRootCorrectSound();
    window.setTimeout(() => openLesson(lessonId), stage === restingClimberStage ? 260 : 760);
  }

  function backToHome() {
    setActiveLessonId(null);
    setClimberJumpStage(null);
    resetActiveLessonState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToRootsMapAfterLesson(lessonId: string, completedStage: number) {
    setRootsMapMessage(completedStage >= lessons.length ? "Macte virtute! Omnes gradus vicisti." : `Macte! Gradus ${completedStage} perfectus est.`);
    speakLatinEncouragement(completedStage);
    playRootRewardSound();
    window.setTimeout(() => {
      setCompletedLessonIds((prev) => prev.includes(lessonId) ? prev : [...prev, lessonId]);
      setClimberJumpStage(null);
      setActiveLessonId(null);
      resetActiveLessonState();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1250);
  }

  function chooseMatch(definitionId: string, wordId?: string) {
    if (isStagePractice) {
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

  function chooseStageOption(exerciseId: string, option: string) {
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

  function returnToMistakeBook() {
    const category = isRootsPower ? "Latin%20Stems" : "Classic%20Words";
    window.location.href = appPath(safeReturnTo ?? `/mistakes?category=${category}`);
  }

  async function checkSingleMistakeExercise(exercise: LegacyExercise) {
    if (!activeLesson) return;
    const group = exercise.group as PracticeGroup | null;
    const answer = group === "matching" ? matchingSelections[exercise.id] : choiceSelections[exercise.id];
    const isCorrect = group === "matching" ? answer === exercise.id : normalize(answer) === normalize(asAnswer(exercise.correctAnswer));

    if (!isCorrect) {
      if (group === "matching") {
        setMatchingSelections((prev) => {
          const next = { ...prev };
          delete next[exercise.id];
          return next;
        });
      } else {
        setCheckedChoiceStatus((prev) => ({ ...prev, [exercise.id]: answer ? "wrong" : "wrong" }));
      }
      setAnswered((prev) => ({ ...prev, [exercise.id]: "wrong" }));
      await recordAttempt(exercise, answer ?? "", false, true);
      setSectionFeedback((prev) => ({ ...prev, [group ?? "context"]: "Iterum! Hanc quaestionem tantum inspice." }));
      playRootWrongSound();
      return;
    }

    if (group === "matching") {
      setMatched((prev) => ({ ...prev, [exercise.id]: true }));
    } else if (group) {
      setCheckedChoiceStatus((prev) => ({ ...prev, [exercise.id]: "correct" }));
    }
    setAnswered((prev) => ({ ...prev, [exercise.id]: "correct" }));
    await recordAttempt(exercise, group === "matching" ? asAnswer(exercise.correctAnswer) : answer ?? "", true, true);
    playRootCorrectSound();
    setSectionFeedback((prev) => ({ ...prev, [group ?? "context"]: "Recte! Haec quaestio correcta est." }));
    window.setTimeout(returnToMistakeBook, 850);
  }

  async function completeStageSection(group: PracticeGroup) {
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
    const sourcePrefix = isRootsPower ? "roots-power" : "classic-treasury";
    const productName = isRootsPower ? "Roots of Power" : "Classic Word Treasury";
    const sectionAward = await applyStageReward(3, `${sourcePrefix}-section-${activeLesson.id}-${group}`, `Completed ${group} in ${productName} ${activeLesson.title}`);
    if (sectionAward > 0) {
      setAwardedSections((prev) => ({ ...prev, [group]: sectionAward }));
      launchGemBurst(sectionAward);
      playRootRewardSound();
      setSectionFeedback((prev) => ({ ...prev, [group]: `Recte! +${sectionAward} gemmae.` }));
    }

    const nextCompleted = { ...completedSections, [group]: true };
    if (activeGroups.every((item) => nextCompleted[item])) {
      const lessonAward = await applyStageReward(8, `${sourcePrefix}-lesson-${activeLesson.id}`, `Completed all quests in ${productName} ${activeLesson.title}`);
      if (lessonAward > 0) {
        launchGemBurst(lessonAward);
        playRootRewardSound();
        notify(`Macte! +${lessonAward} gemmae.`);
      }
      returnToRootsMapAfterLesson(activeLesson.id, activeLessonIndex + 1);
    }
  }

  if (!activeLesson) {
    return (
      <main className={pageClassName}>
        <RewardGemBurst gems={flyingGems} />
        <section className="legacy-cover">
          <div className="legacy-label">Caesar&apos;s English II</div>
          <h1>{copy.title}</h1>
          <div className="legacy-subtitle">{copy.subtitle}</div>
          <div className="legacy-gold-line" />
          <p>{copy.description}</p>
        </section>

        <div className="legacy-container">
          <Link className="legacy-back" href={`/courses/${courseSlug}`}>
            {isStagePractice ? "← Learning Center" : "← 返回学习中心首页"}
          </Link>
          <h2 className="legacy-section-title">{isRootsPower ? "Choose Your Power Stage" : isClassicTreasure ? "Choose Your Treasury Step" : "选择单元开始练习"}</h2>
          <p className="legacy-muted">{copy.lessonHint}</p>
          {isStagePractice && rootsMapMessage ? <div className="roots-map-message">{rootsMapMessage}</div> : null}
          <div className={isStagePractice ? "legacy-lesson-grid roots-staircase" : "legacy-lesson-grid"}>
            {isStagePractice ? (
              <div className={`roots-climber roots-climber-${climberStage}`} aria-label={`Current climber at stage ${climberStage}`}>
                <span className="roots-climber-head" />
                <span className="roots-climber-body" />
              </div>
            ) : null}
            {lessons.length > 0 ? lessons.map((lesson, lessonIndex) => {
              const matchingCount = lesson.exercises.filter((item) => item.group === "matching").length;
              const choiceCount = lesson.exercises.length - matchingCount;
              const displayNumber = lessonNumber(lesson, lessonIndex);
              const completed = completedLessonSet.has(lesson.id);
              const current = isStagePractice && displayNumber === climberStage;
              return (
                <button className={`legacy-lesson-card roots-stage-card roots-stage-${displayNumber} ${completed ? "completed" : ""} ${current ? "current" : ""}`} key={lesson.id} onClick={() => startLesson(lesson.id, displayNumber)} type="button">
                  <span className="legacy-lesson-num">Lesson {displayNumber}</span>
                  <strong>{isStagePractice ? stageCardTitle(practiceType, displayNumber) : lesson.kind === "LATIN_STEMS" ? "Latin Stems" : "Classic Words"}</strong>
                  <small>{matchingCount} match · {choiceCount} choice</small>
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
      <RewardGemBurst gems={flyingGems} />
      <section className="legacy-cover compact">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>{copy.title}</h1>
        <div className="legacy-subtitle">{isStagePractice ? `Lesson ${activeLessonIndex + 1} · ${stageTitle(practiceType, activeLessonIndex + 1)}` : activeLesson.title}</div>
        <div className="legacy-gold-line" />
      </section>

      <div className="legacy-container">
        <button className="legacy-back as-button" onClick={backToHome} type="button">
          {isRootsPower ? "← Power Stage Map" : isClassicTreasure ? "← Treasury Step Map" : "← 返回单元列表"}
        </button>

        <div className="legacy-score-bar">
          <span>{isRootsPower ? "Power Meter" : isClassicTreasure ? "Treasury Meter" : "本节得分"}</span>
          <div className="legacy-score-track">
            <div className="legacy-score-fill" style={{ width: `${displayedScore}%` }} />
          </div>
          <strong>{displayedScore}%</strong>
        </div>

        {grouped.matching.length > 0 ? (
          <section className="legacy-ex-section">
            <h3>{questTitle(practiceType, "matching", 1)}</h3>
            <div className="legacy-matching roots-match-board" ref={matchingAreaRef}>
              {isStagePractice ? (
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
                <h4>{isStagePractice ? "Meaning Clues" : "英文释义"}</h4>
                {grouped.matching.map((exercise) => (
                  <button
                    className={`legacy-match-item ${reviewFocusExerciseId === exercise.id ? "review-focus" : ""} ${selectedMatch === exercise.id ? "selected" : ""} ${matchingSelections[exercise.id] ? "assigned" : ""} ${matched[exercise.id] ? "matched" : ""}`}
                    id={`practice-exercise-${exercise.id}`}
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
                <h4>{isRootsPower ? "Root Cards" : isClassicTreasure ? "Word Cards" : "单词"}</h4>
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
            {isSingleMistakeReview && singleReviewExercise?.group === "matching" ? (
              <div className="roots-single-review-row">
                <span>Review this question only. Other questions stay as context.</span>
                <button className="roots-check-button" onClick={() => checkSingleMistakeExercise(singleReviewExercise)} type="button">
                  Check This One
                </button>
                {sectionFeedback.matching ? <span className={`roots-section-feedback ${answered[singleReviewExercise.id] === "correct" ? "correct" : "wrong"}`}>{sectionFeedback.matching}</span> : null}
              </div>
            ) : isStagePractice && !isSingleMistakeReview ? (
              <div className="roots-check-row">
                <button className="roots-check-button" onClick={() => completeStageSection("matching")} type="button">
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
              <h3>{questTitle(practiceType, group, index + 2)}</h3>
              {grouped[group].map((exercise, exerciseIndex) => {
                const status = answered[exercise.id];
                const correctAnswer = asAnswer(exercise.correctAnswer);
                return (
                  <div className={`legacy-mcq ${reviewFocusExerciseId === exercise.id ? "review-focus" : ""}`} id={`practice-exercise-${exercise.id}`} key={exercise.id}>
                    <div className="legacy-mcq-q">{exerciseIndex + 1}. {exercise.prompt}</div>
                    <div className="legacy-options">
                      {asOptions(exercise.options).map((option) => {
                        const isCorrect = status && normalize(option) === normalize(correctAnswer);
                        const isWrong = status === "wrong" && !isCorrect && normalize(option) !== normalize(correctAnswer);
                        const selected = choiceSelections[exercise.id] === option;
                        const rootsStatus = isStagePractice && selected ? checkedChoiceStatus[exercise.id] : undefined;
                        return (
                          <button
                            className={`legacy-opt ${selected ? "selected" : ""} ${rootsStatus === "correct" ? "checked-correct" : ""} ${rootsStatus === "wrong" ? "checked-wrong" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "disabled" : ""}`}
                            disabled={!isStagePractice && Boolean(status)}
                            key={option}
                            onClick={() => isStagePractice ? chooseStageOption(exercise.id, option) : recordAttempt(exercise, option, normalize(option) === normalize(correctAnswer))}
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
              {isSingleMistakeReview && singleReviewExercise?.group === group ? (
                <div className="roots-single-review-row">
                  <span>Review this question only. Other questions stay as context.</span>
                  <button className="roots-check-button" onClick={() => checkSingleMistakeExercise(singleReviewExercise)} type="button">
                    Check This One
                  </button>
                  {sectionFeedback[group] ? <span className={`roots-section-feedback ${answered[singleReviewExercise.id] === "correct" ? "correct" : "wrong"}`}>{sectionFeedback[group]}</span> : null}
                </div>
              ) : null}
              {isStagePractice && !isSingleMistakeReview ? (
                <div className="roots-check-row">
                  <button className="roots-check-button" onClick={() => completeStageSection(group)} type="button">
                    Check Quest
                  </button>
                  {sectionFeedback[group] ? <span className={`roots-section-feedback ${completedSections[group] ? "correct" : "wrong"}`}>{sectionFeedback[group]}</span> : null}
                </div>
              ) : null}
            </section>
          ) : null
        )}

        {!isStagePractice ? (
          <button className="legacy-reveal" onClick={() => setShowAnswers(true)} type="button">
            显示答案键
          </button>
        ) : null}
        {showAnswers && !isStagePractice ? (
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
