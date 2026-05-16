"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Stem = {
  id: string;
  key: string;
  meaning: string | null;
  examples: string[];
  sourceOrder: number | null;
};

type GameLevel = {
  id: string;
  legacyId: number | null;
  title: string;
  subtitle: string | null;
  type: string;
  description: string | null;
  indices: unknown;
  timeLimitSeconds: number;
  isBoss: boolean;
  order: number;
};

type BuildQuestion = {
  parts: string;
  answer: string;
  meaning: string;
};

type GameQuestion =
  | { type: "fill"; stem: Stem; masked: string; answer: string; fullAnswer: string }
  | { type: "find"; stem: Stem; exWord: string; answer: string }
  | { type: "match"; left: Array<{ id: string; text: string; sub: string }>; right: Array<{ id: string; text: string }>; round: number; target: "example" | "meaning" }
  | { type: "tf"; stem: Stem; text: string; answer: boolean }
  | { type: "build"; parts: string; answer: string; meaning: string }
  | { type: "pick"; stem: Stem; answer: string; meaning: string; options: string[]; boss?: boolean }
  | { type: "boss-type"; stem: Stem; answer: string; exWord: string };

type Props = {
  courseId: string;
  courseSlug: string;
  isLoggedIn: boolean;
  userName: string;
  stems: Stem[];
  levels: GameLevel[];
  buildQuestions: BuildQuestion[];
};

type Screen = "cover" | "select" | "root-match-select" | "jeopardy" | "build-word" | "game" | "result";
type RootMatchMode = "easy" | "medium" | "hard";
type RootMatchStat = { attempts: number; wrong: number };
type RootMatchStats = Record<RootMatchMode, Record<string, RootMatchStat>>;
type FillReveal = { questionIndex: number; visibleCount: number; complete: boolean } | null;
type GroupMessage = { english: string; latin: string } | null;
type JeopardyCell = {
  id: string;
  category: string;
  value: number;
  stems: Stem[];
  mode: "meaning" | "example" | "mixed";
  completed: boolean;
};
type JeopardyQuestion = {
  cellId: string;
  prompt: string;
  answer: string;
  options: string[];
  stemIndex: number;
  totalStems: number;
};
type BuildWordStage = "map" | "warmup" | "family";
type BuildWordPart = { id: string; label: string };
type BuildWordFamilyAnswer = Record<string, BuildWordPart[]>;
type SavedBattleSession = {
  activeLevel: GameLevel;
  questions: GameQuestion[];
  run: typeof emptyRun;
  answer: string;
  wrongMode: boolean;
  timeLeft: number;
  matchedPairs: Record<string, boolean>;
  savedAt: number;
};

const emptyRun = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  correct: 0,
  wrong: 0,
  qi: 0
};

const rootMatchingHubLevel: GameLevel = {
  id: "root-matching-hub",
  legacyId: 0,
  title: "Root Matching",
  subtitle: "Easy · Medium · Hard",
  type: "root-match-menu",
  description: "选择难度，把 100 个 Latin Stems 分阶段练熟。",
  indices: [],
  timeLimitSeconds: 0,
  isBoss: false,
  order: 0
};

const jeopardyHubLevel: GameLevel = {
  id: "jeopardy-hub",
  legacyId: -10,
  title: "Jeopardy",
  subtitle: "Jeopardy",
  type: "jeopardy-menu",
  description: "Choose a board square and master stems.",
  indices: [],
  timeLimitSeconds: 0,
  isBoss: false,
  order: -10
};

const buildAWordHubLevel: GameLevel = {
  id: "build-a-word-hub",
  legacyId: -11,
  title: "Build-a-Word",
  subtitle: "Build-a-Word",
  type: "build-word-menu",
  description: "Build nonfiction words from Latin stems.",
  indices: [],
  timeLimitSeconds: 0,
  isBoss: false,
  order: -11
};

const buildWordFamilyWords = [
  { id: "common", word: "common", answer: ["com", "mon"], meaning: "shared by two or more people" },
  { id: "communicate", word: "communicate", answer: ["com", "mun", "icate"], meaning: "to share information, thoughts, or feelings" },
  { id: "commute", word: "commute", answer: ["com", "mute"], meaning: "to travel regularly between home and school or work" }
];

const initialBuildWordFamilyTiles: BuildWordPart[] = [
  { id: "com-1", label: "com" },
  { id: "mon-1", label: "mon" },
  { id: "mute-1", label: "mute" },
  { id: "com-2", label: "com" },
  { id: "icate-1", label: "icate" },
  { id: "mun-1", label: "mun" },
  { id: "com-3", label: "com" }
];

const emptyBuildWordFamilyAnswers = (): BuildWordFamilyAnswer => ({
  common: [],
  communicate: [],
  commute: []
});

const rootMatchingLevels: GameLevel[] = [
  {
    id: "root-matching-easy",
    legacyId: 0,
    title: "Root Matching Easy",
    subtitle: "5 per round · 20 rounds",
    type: "root-match-easy",
    description: "100 个词根完整初练：每组 5 个，覆盖全部 Latin Stems。",
    indices: [],
    timeLimitSeconds: 0,
    isBoss: false,
    order: 0
  },
  {
    id: "root-matching-medium",
    legacyId: -1,
    title: "Root Matching Medium",
    subtitle: "7 per round · 5 rounds",
    type: "root-match-medium",
    description: "从 Easy 错误率最高的 35 个词根中强化练习。",
    indices: [],
    timeLimitSeconds: 0,
    isBoss: false,
    order: -1
  },
  {
    id: "root-matching-hard",
    legacyId: -2,
    title: "Root Matching Hard",
    subtitle: "10 per round · 3 rounds",
    type: "root-match-hard",
    description: "从 Medium 错误率最高的 30 个词根中进行高强度复习。",
    indices: [],
    timeLimitSeconds: 0,
    isBoss: false,
    order: -2
  }
];

const rootModeMeta: Record<RootMatchMode, { label: string; stars: string; words: number; rounds: number }> = {
  easy: { label: "Easy", stars: "★", words: 5, rounds: 20 },
  medium: { label: "Medium", stars: "★★", words: 7, rounds: 5 },
  hard: { label: "Hard", stars: "★★★", words: 10, rounds: 3 }
};

const battleLevelMeta: Record<string, { icon: string; label: string; mission: string }> = {
  fill: { icon: "✎", label: "Spell", mission: "Complete each missing Latin stem." },
  find: { icon: "⌕", label: "Detect", mission: "Find the stem hidden in each word." },
  match: { icon: "↔", label: "Match", mission: "Pair each stem with its example." },
  tf: { icon: "✓", label: "Judge", mission: "Decide if each stem clue is true." },
  build: { icon: "⚙", label: "Build", mission: "Build words from Latin parts." },
  blitz: { icon: "⚡", label: "Blitz", mission: "Race the clock and choose fast." },
  boss: { icon: "♛", label: "Boss", mission: "Defeat your toughest stems." },
  "root-match-menu": { icon: "↔", label: "Match", mission: "Choose a difficulty and match Latin stems." },
  "jeopardy-menu": { icon: "?", label: "Board", mission: "Pick a square and win stem points." },
  "build-word-menu": { icon: "＋", label: "Build", mission: "Build nonfiction words from Latin stems." }
};

const fillGroupMessages = [
  { english: "Nicely done!", latin: "Bene fecisti!" },
  { english: "One more set!", latin: "Iterum agamus!" },
  { english: "Amazing work!", latin: "Mirabile!" },
  { english: "Almost at the summit!", latin: "Prope cacumen es!" },
  { english: "Congratulations, Latin Stem Master!", latin: "Gratulationes, magister radicum Latinarum!" }
];

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function maskStem(stem: string) {
  if (stem.length <= 1) return { masked: "_", missing: stem };
  if (stem.length <= 2) return { masked: `${stem[0]} _`, missing: stem.slice(1) };

  const missing = stem.slice(1, -1);
  const blanks = Array.from({ length: missing.length }, () => "_").join(" ");
  return {
    masked: `${stem[0]} ${blanks} ${stem[stem.length - 1]}`,
    missing
  };
}

function levelIndices(level: GameLevel, stems: Stem[]) {
  return Array.isArray(level.indices)
    ? level.indices.map((item) => Number(item)).filter((item) => Number.isFinite(item) && stems[item])
    : [];
}

function levelDisplayName(level: GameLevel) {
  return level.type.startsWith("root-match") ? level.title : level.subtitle ?? level.title;
}

function feedbackTone(feedback: string) {
  if (feedback.includes("Try") || feedback.includes("再想想") || feedback.includes("反击") || feedback.includes("Iterum") || feedback.includes("Cave")) return "wrong";
  if (feedback.includes("Great") || feedback.includes("击退") || feedback.includes("Optime") || feedback.includes("Macte")) return "great";
  return "correct";
}

function fillPromptCells(question: Extract<GameQuestion, { type: "fill" }>, reveal: FillReveal) {
  const stem = question.fullAnswer;
  const visibleCount = reveal?.visibleCount ?? 0;
  let missingIndex = 0;

  return Array.from(stem).map((letter, index) => {
    const isMissing =
      stem.length <= 1 ||
      (stem.length <= 2 ? index === 1 : index > 0 && index < stem.length - 1);

    if (!isMissing) return { key: `${letter}-${index}`, value: letter, missing: false, revealed: true };

    missingIndex += 1;
    const revealed = missingIndex <= visibleCount;
    return { key: `${letter}-${index}`, value: revealed ? letter : "_", missing: true, revealed };
  });
}

function buildJeopardyCells(stems: Stem[]) {
  const categories = ["Set I", "Set II", "Set III", "Set IV", "Set V"];
  return categories.flatMap((category, categoryIndex) => {
    const categoryStems = stems.slice(categoryIndex * 20, categoryIndex * 20 + 20);
    return [100, 200, 300, 400, 500].map((value, valueIndex) => {
      const cellStems = categoryStems.slice(valueIndex * 4, valueIndex * 4 + 4);
      return {
        id: `jeopardy-${categoryIndex}-${value}`,
        category,
        value,
        stems: cellStems,
        mode: value <= 200 ? "meaning" : value <= 400 ? "example" : "mixed",
        completed: false
      } satisfies JeopardyCell;
    });
  });
}

function makeJeopardyQuestion(cell: JeopardyCell, stems: Stem[], stemIndex?: number): JeopardyQuestion {
  const questionIndex = stemIndex ?? Math.floor(Math.random() * cell.stems.length);
  const stem = cell.stems[questionIndex] ?? cell.stems[0] ?? stems[0];
  const distractors = shuffle(stems.filter((item) => item.id !== stem.id)).slice(0, 3).map((item) => item.key);
  const options = shuffle([stem.key, ...distractors]);
  const example = stem.examples[0] ?? stem.key;
  const prompt =
    cell.mode === "meaning"
      ? `Which stem means "${stem.meaning ?? "this meaning"}"?`
      : cell.mode === "example"
        ? `Which stem appears in "${example}"?`
        : `"${stem.meaning ?? "This meaning"}" and "${example}" point to which stem?`;

  return {
    cellId: cell.id,
    prompt,
    answer: stem.key,
    options,
    stemIndex: questionIndex,
    totalStems: cell.stems.length
  };
}

export function StemBattleClient({ courseId, courseSlug, isLoggedIn, userName, stems, levels, buildQuestions }: Props) {
  const [screen, setScreen] = useState<Screen>("cover");
  const [activeLevel, setActiveLevel] = useState<GameLevel | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [run, setRun] = useState(emptyRun);
  const [answer, setAnswer] = useState("");
  const [locked, setLocked] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{ side: "left" | "right"; id: string } | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [best, setBest] = useState<Record<number, { score: number; stars: number; correct: number; wrong: number }>>({});
  const [unlocked, setUnlocked] = useState<number[]>([1]);
  const [wrongStemIds, setWrongStemIds] = useState<Set<string>>(new Set());
  const [wrongMode, setWrongMode] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const [fillReveal, setFillReveal] = useState<FillReveal>(null);
  const [groupMessage, setGroupMessage] = useState<GroupMessage>(null);
  const [savedSession, setSavedSession] = useState<SavedBattleSession | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingResumeLevel, setPendingResumeLevel] = useState<GameLevel | null>(null);
  const [jeopardyCells, setJeopardyCells] = useState<JeopardyCell[]>([]);
  const [jeopardyScore, setJeopardyScore] = useState(0);
  const [jeopardyQuestion, setJeopardyQuestion] = useState<JeopardyQuestion | null>(null);
  const [jeopardyFeedback, setJeopardyFeedback] = useState("");
  const [jeopardyCellRun, setJeopardyCellRun] = useState<{ cellId: string; nextIndex: number; correctIndices: number[] } | null>(null);
  const [buildWordTiles, setBuildWordTiles] = useState<string[]>([]);
  const [buildWordAnswer, setBuildWordAnswer] = useState<string[]>([]);
  const [buildWordFeedback, setBuildWordFeedback] = useState("");
  const [buildWordStage, setBuildWordStage] = useState<BuildWordStage>("warmup");
  const [buildFamilyTiles, setBuildFamilyTiles] = useState<BuildWordPart[]>(initialBuildWordFamilyTiles);
  const [buildFamilyAnswers, setBuildFamilyAnswers] = useState<BuildWordFamilyAnswer>(() => emptyBuildWordFamilyAnswers());
  const [buildFamilyFeedback, setBuildFamilyFeedback] = useState("");
  const [buildFamilyBuilt, setBuildFamilyBuilt] = useState(false);
  const [selectedFamilyRow, setSelectedFamilyRow] = useState("common");
  const [selectedFamilyWord, setSelectedFamilyWord] = useState<string | null>(null);
  const [buildFamilyMatches, setBuildFamilyMatches] = useState<Record<string, string>>({});
  const [completedBuildStems, setCompletedBuildStems] = useState<string[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const fillRevealTimersRef = useRef<number[]>([]);

  const activeQuestion = questions[run.qi];
  const displayLevels = useMemo(() => [rootMatchingHubLevel, jeopardyHubLevel, buildAWordHubLevel, ...levels], [levels]);
  const totalStars = Object.values(best).reduce((sum, item) => sum + item.stars, 0);
  const bestTotal = Object.values(best).reduce((sum, item) => sum + item.score, 0);

  function savedSessionKey() {
    return `latinfun_battle_session_${courseId}`;
  }

  useEffect(() => {
    const raw = window.localStorage.getItem(`latinfun_battle_${courseId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { best?: typeof best; unlocked?: number[] };
        setBest(parsed.best ?? {});
        setUnlocked(parsed.unlocked ?? [1]);
      } catch {
        setBest({});
      }
    }
  }, [courseId]);

  useEffect(() => {
    const raw = window.localStorage.getItem(savedSessionKey());
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedBattleSession;
      if (parsed.activeLevel && parsed.questions?.length && parsed.run && parsed.run.qi < parsed.questions.length) {
        setSavedSession(parsed);
      }
    } catch {
      window.localStorage.removeItem(savedSessionKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    window.localStorage.setItem(`latinfun_battle_${courseId}`, JSON.stringify({ best, unlocked }));
  }, [best, unlocked, courseId]);

  useEffect(() => {
    const isFamilyComplete =
      screen === "build-word" &&
      buildWordStage === "family" &&
      buildFamilyBuilt &&
      Object.keys(buildFamilyMatches).length === buildWordFamilyWords.length;

    if (!isFamilyComplete) return;

    const timer = window.setTimeout(() => {
      setBuildWordStage("map");
      setBuildFamilyFeedback("");
      setSelectedFamilyWord(null);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [screen, buildWordStage, buildFamilyBuilt, buildFamilyMatches]);

  useEffect(() => {
    if (screen !== "game" || !activeLevel || questions.length === 0 || run.qi >= questions.length) return;

    const session: SavedBattleSession = {
      activeLevel,
      questions,
      run,
      answer,
      wrongMode,
      timeLeft,
      matchedPairs,
      savedAt: Date.now()
    };
    window.localStorage.setItem(savedSessionKey(), JSON.stringify(session));
    setSavedSession(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, activeLevel, questions, run, answer, wrongMode, timeLeft, matchedPairs, courseId]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`/api/mistakes?courseId=${courseId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const ids = new Set<string>();
        payload?.data?.forEach((item: { knowledgePointId?: string | null }) => {
          if (item.knowledgePointId) ids.add(item.knowledgePointId);
        });
        setWrongStemIds(ids);
      })
      .catch(() => undefined);
  }, [courseId, isLoggedIn]);

  useEffect(() => {
    if (!activeLevel || activeLevel.timeLimitSeconds <= 0 || screen !== "game") return;
    setTimeLeft(activeLevel.timeLimitSeconds);
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          finishLevel();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // finishLevel intentionally reads latest state through React event timing; timeout is only a smoke path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel?.id, screen]);

  useEffect(() => {
    if (screen === "game" && activeLevel) {
      startRootMatchMusic();
    } else {
      stopRootMatchMusic();
    }

    return () => stopRootMatchMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel?.type, screen]);

  useEffect(() => () => clearFillRevealTimers(), []);

  function rootMatchStatsKey() {
    return `latinfun_root_match_stats_${courseId}`;
  }

  function emptyRootMatchStats(): RootMatchStats {
    return { easy: {}, medium: {}, hard: {} };
  }

  function getRootMatchStats(): RootMatchStats {
    const raw = window.localStorage.getItem(rootMatchStatsKey());
    if (!raw) return emptyRootMatchStats();

    try {
      const parsed = JSON.parse(raw) as Partial<RootMatchStats>;
      return {
        easy: parsed.easy ?? {},
        medium: parsed.medium ?? {},
        hard: parsed.hard ?? {}
      };
    } catch {
      return emptyRootMatchStats();
    }
  }

  function saveRootMatchStats(stats: RootMatchStats) {
    window.localStorage.setItem(rootMatchStatsKey(), JSON.stringify(stats));
  }

  function rootMatchModeFromType(type?: string): RootMatchMode | null {
    if (type === "root-match-easy") return "easy";
    if (type === "root-match-medium") return "medium";
    if (type === "root-match-hard") return "hard";
    return null;
  }

  function updateRootMatchStats(mode: RootMatchMode, stemId: string, isCorrect: boolean) {
    const stats = getRootMatchStats();
    const current = stats[mode][stemId] ?? { attempts: 0, wrong: 0 };
    stats[mode][stemId] = {
      attempts: current.attempts + 1,
      wrong: current.wrong + (isCorrect ? 0 : 1)
    };
    saveRootMatchStats(stats);
  }

  function rankedRootMatchStems(mode: RootMatchMode, count: number) {
    const modeStats = getRootMatchStats()[mode] ?? {};
    const attemptedIds = new Set(
      Object.entries(modeStats)
        .filter(([, stat]) => stat.attempts > 0)
        .map(([stemId]) => stemId)
    );

    if (attemptedIds.size === 0) {
      return shuffle(stems).slice(0, count);
    }

    const ranked = [...stems].sort((left, right) => {
      const leftStat = modeStats[left.id] ?? { attempts: 0, wrong: 0 };
      const rightStat = modeStats[right.id] ?? { attempts: 0, wrong: 0 };
      const leftRate = leftStat.attempts ? leftStat.wrong / leftStat.attempts : 0;
      const rightRate = rightStat.attempts ? rightStat.wrong / rightStat.attempts : 0;
      const leftAttempted = attemptedIds.has(left.id) ? 1 : 0;
      const rightAttempted = attemptedIds.has(right.id) ? 1 : 0;

      return (
        rightAttempted - leftAttempted ||
        rightRate - leftRate ||
        rightStat.wrong - leftStat.wrong ||
        rightStat.attempts - leftStat.attempts ||
        (left.sourceOrder ?? 0) - (right.sourceOrder ?? 0)
      );
    });

    return ranked.slice(0, count);
  }

  function initAudio() {
    if (!audioRef.current || audioRef.current.state === "closed") audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }

  function beep(type: OscillatorType, frequency: number, duration = 0.08, volume = 0.08) {
    try {
      initAudio();
      const ctx = audioRef.current;
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio is optional; browsers may block it before a user gesture.
    }
  }

  function playToneSequence(notes: Array<[number, number, number, OscillatorType?, number?]>) {
    notes.forEach(([frequency, delay, duration, type = "triangle", volume = 0.06]) => {
      window.setTimeout(() => beep(type, frequency, duration, volume), delay);
    });
  }

  function playMatchCorrectSound() {
    playToneSequence([
      [660, 0, 0.07, "triangle", 0.065],
      [880, 80, 0.09, "triangle", 0.055]
    ]);
  }

  function playMatchWrongSound() {
    playToneSequence([
      [220, 0, 0.1, "sawtooth", 0.055],
      [140, 120, 0.14, "sawtooth", 0.045]
    ]);
  }

  function playAnswerCorrectSound() {
    playToneSequence([
      [1046.5, 0, 0.08, "sine", 0.082],
      [1567.98, 90, 0.08, "sine", 0.074],
      [2093, 190, 0.1, "triangle", 0.07],
      [1318.51, 430, 0.09, "sine", 0.052],
      [1760, 560, 0.1, "triangle", 0.058],
      [2349.32, 760, 0.13, "triangle", 0.052],
      [2637.02, 1120, 0.12, "sine", 0.045],
      [2093, 1480, 0.1, "triangle", 0.04],
      [3135.96, 1840, 0.1, "sine", 0.034]
    ]);
  }

  function playAnswerWrongSound() {
    playToneSequence([
      [196, 0, 0.16, "square", 0.058],
      [155.56, 210, 0.18, "square", 0.054],
      [130.81, 460, 0.22, "sawtooth", 0.045],
      [116.54, 820, 0.24, "triangle", 0.04],
      [98, 1260, 0.3, "sine", 0.036],
      [130.81, 1740, 0.18, "triangle", 0.03]
    ]);
  }

  function playRoundCelebrationSound() {
    playToneSequence([
      [523.25, 0, 0.1, "triangle", 0.07],
      [659.25, 110, 0.1, "triangle", 0.07],
      [783.99, 220, 0.12, "triangle", 0.075],
      [1046.5, 360, 0.18, "triangle", 0.08],
      [1318.51, 560, 0.16, "triangle", 0.055]
    ]);
  }

  function playGroupCelebrationSound() {
    playToneSequence([
      [523.25, 0, 0.11, "square", 0.07],
      [659.25, 140, 0.11, "square", 0.07],
      [783.99, 280, 0.13, "square", 0.074],
      [1046.5, 460, 0.18, "triangle", 0.078],
      [1318.51, 720, 0.13, "triangle", 0.068],
      [1567.98, 900, 0.14, "triangle", 0.064],
      [2093, 1140, 0.18, "sine", 0.058],
      [1046.5, 1480, 0.1, "square", 0.05],
      [1318.51, 1620, 0.1, "square", 0.052],
      [1567.98, 1760, 0.12, "triangle", 0.058],
      [2349.32, 2020, 0.22, "triangle", 0.064],
      [1760, 2460, 0.12, "sine", 0.05],
      [2093, 2680, 0.13, "triangle", 0.058],
      [2637.02, 2940, 0.16, "triangle", 0.062],
      [3135.96, 3300, 0.24, "sine", 0.056],
      [2349.32, 3820, 0.14, "triangle", 0.05],
      [2637.02, 4140, 0.16, "triangle", 0.052],
      [3135.96, 4480, 0.22, "triangle", 0.055],
      [4186.01, 4860, 0.32, "sine", 0.044]
    ]);
  }

  function startRootMatchMusic() {
    if (musicTimerRef.current) return;

    initAudio();
    const melody: Array<number | null> = [
      659.25, 783.99, 987.77, null, 880, 783.99, 659.25, 523.25,
      587.33, 659.25, 783.99, null, 659.25, 587.33, 523.25, null,
      783.99, 987.77, 1174.66, null, 1046.5, 987.77, 783.99, 659.25,
      698.46, 783.99, 880, null, 783.99, 659.25, 587.33, null,
      659.25, 783.99, 880, 987.77, null, 987.77, 880, 783.99,
      659.25, null, 587.33, 659.25, 783.99, null, 880, null,
      987.77, 880, 783.99, 659.25, 587.33, null, 659.25, 783.99,
      880, null, 987.77, 1174.66, 1046.5, 987.77, 880, null,
      783.99, 659.25, 523.25, null, 587.33, 659.25, 698.46, null,
      783.99, 880, 987.77, null, 880, 783.99, 659.25, null,
      523.25, 587.33, 659.25, 783.99, null, 783.99, 659.25, 587.33,
      523.25, null, 659.25, 783.99, 987.77, null, 783.99, null,
      659.25, 587.33, 523.25, null
    ];
    const bass = [
      130.81, 196, 164.81, 196,
      146.83, 220, 174.61, 220,
      130.81, 196, 164.81, 196,
      146.83, 220, 196, 261.63,
      130.81, 196, 164.81, 196,
      146.83, 220, 174.61, 220,
      196, 246.94, 220, 196, 174.61, 164.81, 146.83, 130.81
    ];
    const accent = [1046.5, null, 1318.51, null, 1174.66, null, 987.77, null];
    let step = 0;

    musicTimerRef.current = window.setInterval(() => {
      const frequency = melody[step % melody.length];
      if (frequency) {
        beep(step % 2 === 0 ? "square" : "triangle", frequency, 0.09, 0.006);
      }
      if (step % 4 === 0) {
        beep("sine", bass[Math.floor(step / 4) % bass.length], 0.16, 0.0045);
      }
      if (step % 16 === 14) {
        const sparkle = accent[Math.floor(step / 8) % accent.length];
        if (sparkle) beep("triangle", sparkle, 0.06, 0.004);
      }
      step += 1;
    }, 150);
  }

  function stopRootMatchMusic() {
    if (musicTimerRef.current) {
      window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }

    const context = audioRef.current;
    if (context && context.state !== "closed") {
      void context.close();
    }
    audioRef.current = null;
  }

  function wrongMeaning(current: Stem) {
    const pool = stems.filter((stem) => stem.id !== current.id);
    return pool[Math.floor(Math.random() * pool.length)]?.meaning ?? "unknown";
  }

  function optionsFor(stem: Stem) {
    const options = new Set([stem.key]);
    while (options.size < 4) {
      options.add(stems[Math.floor(Math.random() * stems.length)].key);
    }
    return shuffle([...options]);
  }

  function weakStems() {
    const fromServer = stems.filter((stem) => wrongStemIds.has(stem.id));
    return fromServer.length ? fromServer : shuffle(stems).slice(0, 10);
  }

  function rootMatchRounds(roundStems: Stem[], groupSize: number): GameQuestion[] {
    const rounds: GameQuestion[] = [];
    for (let offset = 0; offset < roundStems.length; offset += groupSize) {
      const slice = roundStems.slice(offset, offset + groupSize);
      const left = slice.map((stem) => ({ id: stem.id, text: stem.key, sub: "" }));
      const right = shuffle(slice.map((stem) => ({ id: stem.id, text: stem.meaning ?? "" })));
      rounds.push({ type: "match", left, right, round: rounds.length + 1, target: "meaning" });
    }
    return rounds;
  }

  function generateQuestions(level: GameLevel, forceWrongMode = false): GameQuestion[] {
    if (forceWrongMode) {
      return shuffle(
        weakStems().map((stem, index) => {
          const mod = index % 4;
          if (mod === 0) {
            const masked = maskStem(stem.key);
            return { type: "fill", stem, masked: masked.masked, answer: masked.missing, fullAnswer: stem.key };
          }
          if (mod === 1) return { type: "find", stem, exWord: stem.examples[0] ?? stem.key, answer: stem.key };
          if (mod === 2) return { type: "tf", stem, text: `${stem.key} = ${wrongMeaning(stem)}`, answer: false };
          return { type: "pick", stem, meaning: stem.meaning ?? "", answer: stem.key, options: optionsFor(stem) };
        })
      );
    }

    if (level.type === "root-match-easy") {
      return rootMatchRounds(stems, 5);
    }

    if (level.type === "root-match-medium") {
      return rootMatchRounds(rankedRootMatchStems("easy", 35), 7);
    }

    if (level.type === "root-match-hard") {
      return rootMatchRounds(rankedRootMatchStems("medium", 30), 10);
    }

    if (level.type === "fill") {
      return stems.map((stem) => {
        const masked = maskStem(stem.key);
        return { type: "fill", stem, masked: masked.masked, answer: masked.missing, fullAnswer: stem.key };
      });
    }
    if (level.type === "find") {
      return levelIndices(level, stems).map((index) => {
        const stem = stems[index];
        return { type: "find", stem, exWord: stem.examples[Math.floor(Math.random() * stem.examples.length)] ?? stem.key, answer: stem.key };
      });
    }
    if (level.type === "match") {
      const indices = levelIndices(level, stems);
      const rounds: GameQuestion[] = [];
      for (let offset = 0; offset < indices.length; offset += 5) {
        const slice = indices.slice(offset, offset + 5);
        const left = slice.map((index) => ({ id: stems[index].id, text: stems[index].key, sub: stems[index].meaning ?? "" }));
        const right = shuffle(slice.map((index) => ({ id: stems[index].id, text: stems[index].examples[0] ?? stems[index].key })));
        rounds.push({ type: "match", left, right, round: rounds.length + 1, target: "example" });
      }
      return rounds;
    }
    if (level.type === "tf") {
      return shuffle(
        levelIndices(level, stems).map((index, itemIndex) => {
          const stem = stems[index];
          const truthy = itemIndex % 2 === 0;
          return { type: "tf", stem, text: `${stem.key} = ${truthy ? stem.meaning : wrongMeaning(stem)}`, answer: truthy };
        })
      );
    }
    if (level.type === "build") {
      return buildQuestions.map((item) => ({ type: "build", parts: item.parts, answer: item.answer, meaning: item.meaning }));
    }
    if (level.type === "blitz") {
      return shuffle(stems)
        .slice(0, 20)
        .map((stem) => ({ type: "pick", stem, meaning: stem.meaning ?? "", answer: stem.key, options: optionsFor(stem) }));
    }
    return shuffle(
      weakStems().flatMap((stem, index) => {
        const base: GameQuestion[] = [
          { type: "pick", stem, meaning: stem.meaning ?? "", answer: stem.key, options: optionsFor(stem), boss: true },
          { type: "boss-type", stem, exWord: stem.examples[0] ?? stem.key, answer: stem.key }
        ];
        if (index % 2 === 0) base.push({ type: "tf", stem, text: `${stem.key} = ${wrongMeaning(stem)}`, answer: false });
        return base;
      })
    ).slice(0, 18);
  }

  function questionItemCount(items: GameQuestion[]) {
    return items.reduce((total, question) => total + (question.type === "match" ? question.left.length : 1), 0);
  }

  function clearFillRevealTimers() {
    fillRevealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    fillRevealTimersRef.current = [];
  }

  function revealFillAnswer(question: Extract<GameQuestion, { type: "fill" }>) {
    clearFillRevealTimers();
    setAnswer("");
    setFillReveal({ questionIndex: run.qi, visibleCount: 0, complete: false });

    const letterDelay = 360;
    Array.from(question.answer).forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setFillReveal({ questionIndex: run.qi, visibleCount: index + 1, complete: false });
        beep("triangle", 660 + index * 80, 0.08, 0.045);
      }, (index + 1) * letterDelay);
      fillRevealTimersRef.current.push(timer);
    });

    const completeTimer = window.setTimeout(() => {
      setFillReveal({ questionIndex: run.qi, visibleCount: question.answer.length, complete: true });
      playToneSequence([
        [783.99, 0, 0.08, "triangle", 0.055],
        [987.77, 90, 0.1, "triangle", 0.05]
      ]);
    }, (question.answer.length + 1) * letterDelay);
    fillRevealTimersRef.current.push(completeTimer);

    const resetTimer = window.setTimeout(() => {
      setFeedback("");
      setLocked(false);
      setAnswer("");
      setFillReveal(null);
    }, (question.answer.length + 1) * letterDelay + 2000);
    fillRevealTimersRef.current.push(resetTimer);
  }

  function clearSavedSession() {
    window.localStorage.removeItem(savedSessionKey());
    setSavedSession(null);
    setPendingResumeLevel(null);
    setShowResumePrompt(false);
  }

  function resumeSavedSession(session: SavedBattleSession) {
    clearFillRevealTimers();
    setActiveLevel(session.activeLevel);
    setQuestions(session.questions);
    setRun(session.run);
    setAnswer(session.answer ?? "");
    setWrongMode(session.wrongMode);
    setTimeLeft(session.timeLeft);
    setMatchedPairs(session.matchedPairs ?? {});
    setSelectedMatch(null);
    setFeedback("");
    setLocked(false);
    setFillReveal(null);
    setGroupMessage(null);
    setShowFireworks(false);
    setShowResumePrompt(false);
    setPendingResumeLevel(null);
    setScreen("game");
  }

  function hasSavedSessionForLevel(level: GameLevel) {
    if (!savedSession) return false;
    return savedSession.activeLevel.id === level.id || savedSession.activeLevel.type === level.type;
  }

  function chooseLevel(level: GameLevel, asWrongPractice = false) {
    if (!asWrongPractice && hasSavedSessionForLevel(level)) {
      setPendingResumeLevel(level);
      setShowResumePrompt(true);
      return;
    }

    startLevel(level, asWrongPractice);
  }

  function startJeopardy() {
    stopRootMatchMusic();
    setJeopardyCells(buildJeopardyCells(stems));
    setJeopardyScore(0);
    setJeopardyQuestion(null);
    setJeopardyFeedback("");
    setJeopardyCellRun(null);
    setScreen("jeopardy");
  }

  function startBuildAWord() {
    stopRootMatchMusic();
    setBuildWordStage("map");
    setBuildWordTiles(["mand", "eer", "com"]);
    setBuildWordAnswer([]);
    setBuildWordFeedback("");
    setBuildFamilyTiles(initialBuildWordFamilyTiles);
    setBuildFamilyAnswers(emptyBuildWordFamilyAnswers());
    setBuildFamilyFeedback("");
    setBuildFamilyBuilt(false);
    setSelectedFamilyRow("common");
    setSelectedFamilyWord(null);
    setBuildFamilyMatches({});
    setScreen("build-word");
  }

  function startBuildWordStem() {
    setBuildWordStage("warmup");
    setBuildWordTiles(["mand", "eer", "com"]);
    setBuildWordAnswer([]);
    setBuildWordFeedback("");
    setBuildFamilyTiles(initialBuildWordFamilyTiles);
    setBuildFamilyAnswers(emptyBuildWordFamilyAnswers());
    setBuildFamilyFeedback("");
    setBuildFamilyBuilt(false);
    setSelectedFamilyRow("common");
    setSelectedFamilyWord(null);
    setBuildFamilyMatches({});
  }

  function chooseBuildWordTile(tile: string) {
    if (buildWordFeedback.includes("Recte")) return;
    setBuildWordFeedback("");
    setBuildWordAnswer((parts) => [...parts, tile]);
    setBuildWordTiles((parts) => parts.filter((item) => item !== tile));
  }

  function removeBuildWordPart(index: number) {
    if (buildWordFeedback.includes("Recte")) return;
    const removed = buildWordAnswer[index];
    if (!removed) return;
    setBuildWordFeedback("");
    setBuildWordAnswer((parts) => parts.filter((_, itemIndex) => itemIndex !== index));
    setBuildWordTiles((tiles) => [...tiles, removed]);
  }

  function checkBuildWordAnswer() {
    const isCorrect = buildWordAnswer.join("") === "commandeer";
    setBuildWordFeedback(isCorrect ? "Recte! You built commandeer." : "Iterum! Read the meaning and reorder the parts.");
    if (isCorrect) {
      playAnswerCorrectSound();
      window.setTimeout(() => {
        setBuildWordStage("family");
        setBuildWordFeedback("");
      }, 900);
    } else {
      playAnswerWrongSound();
    }
  }

  function chooseFamilyTile(tile: BuildWordPart) {
    if (buildFamilyBuilt) return;
    setBuildFamilyFeedback("");
    setBuildFamilyAnswers((answers) => ({
      ...answers,
      [selectedFamilyRow]: [...(answers[selectedFamilyRow] ?? []), tile]
    }));
    setBuildFamilyTiles((tiles) => tiles.filter((item) => item.id !== tile.id));
  }

  function dragFamilyTile(event: DragEvent<HTMLButtonElement>, tile: BuildWordPart) {
    event.dataTransfer.setData("text/plain", tile.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function dropFamilyTile(wordId: string, event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (buildFamilyBuilt) return;
    const tileId = event.dataTransfer.getData("text/plain");
    const tile = buildFamilyTiles.find((item) => item.id === tileId);
    if (!tile) return;
    setSelectedFamilyRow(wordId);
    setBuildFamilyFeedback("");
    setBuildFamilyAnswers((answers) => ({
      ...answers,
      [wordId]: [...(answers[wordId] ?? []), tile]
    }));
    setBuildFamilyTiles((tiles) => tiles.filter((item) => item.id !== tile.id));
  }

  function removeFamilyPart(wordId: string, index: number) {
    if (buildFamilyBuilt) return;
    const removed = buildFamilyAnswers[wordId]?.[index];
    if (!removed) return;
    setBuildFamilyFeedback("");
    setBuildFamilyAnswers((answers) => ({
      ...answers,
      [wordId]: (answers[wordId] ?? []).filter((_, itemIndex) => itemIndex !== index)
    }));
    setBuildFamilyTiles((tiles) => [...tiles, removed]);
  }

  function checkFamilyBuilds() {
    const allCorrect = buildWordFamilyWords.every((item) => (buildFamilyAnswers[item.id] ?? []).map((part) => part.label).join("") === item.word);
    if (!allCorrect) {
      setBuildFamilyFeedback("Iterum! One word family member needs a new order.");
      playAnswerWrongSound();
      return;
    }
    setBuildFamilyBuilt(true);
    setBuildFamilyFeedback("Recte! Now match each word to its meaning.");
    playAnswerCorrectSound();
  }

  function selectFamilyWord(wordId: string) {
    if (!buildFamilyBuilt || buildFamilyMatches[wordId]) return;
    setBuildFamilyFeedback("");
    setSelectedFamilyWord(wordId);
  }

  function chooseFamilyMeaning(wordId: string) {
    if (!buildFamilyBuilt || !selectedFamilyWord) return;
    if (selectedFamilyWord !== wordId) {
      setBuildFamilyFeedback("Iterum! Try another meaning.");
      playAnswerWrongSound();
      return;
    }
    const nextMatches = { ...buildFamilyMatches, [selectedFamilyWord]: wordId };
    setBuildFamilyMatches(nextMatches);
    setSelectedFamilyWord(null);
    if (Object.keys(nextMatches).length === buildWordFamilyWords.length) {
      setBuildFamilyFeedback("Macte! This stem family is complete.");
      playGroupCelebrationSound();
      setCompletedBuildStems((items) => items.includes("com") ? items : [...items, "com"]);
    } else {
      setBuildFamilyFeedback("Recte! Keep matching.");
      playAnswerCorrectSound();
    }
  }

  function openJeopardyCell(cell: JeopardyCell) {
    if (cell.completed || jeopardyQuestion) return;
    initAudio();
    setJeopardyFeedback("");
    setJeopardyCellRun({ cellId: cell.id, nextIndex: 0, correctIndices: [] });
    setJeopardyQuestion(makeJeopardyQuestion(cell, stems, 0));
  }

  function answerJeopardy(option: string) {
    if (!jeopardyQuestion || jeopardyFeedback) return;
    const cell = jeopardyCells.find((item) => item.id === jeopardyQuestion.cellId);
    if (!cell) return;

    const isCorrect = option === jeopardyQuestion.answer;
    setJeopardyFeedback(isCorrect ? "Recte!" : "Non recte!");
    if (isCorrect) {
      playAnswerCorrectSound();
      setJeopardyScore((score) => score + (jeopardyCellRun ? Math.round(cell.value / cell.stems.length) : cell.value));
    } else {
      playAnswerWrongSound();
    }

    window.setTimeout(() => {
      setJeopardyFeedback("");
      if (jeopardyCellRun) {
        const correctIndices = isCorrect
          ? [...new Set([...jeopardyCellRun.correctIndices, jeopardyQuestion.stemIndex])]
          : jeopardyCellRun.correctIndices;

        if (correctIndices.length >= cell.stems.length) {
          setJeopardyCells((items) => items.map((item) => (item.id === cell.id ? { ...item, completed: true } : item)));
          setJeopardyCellRun(null);
          setJeopardyQuestion(null);
          return;
        }

        let nextIndex = jeopardyQuestion.stemIndex;
        for (let offset = 1; offset <= cell.stems.length; offset++) {
          const candidate = (jeopardyQuestion.stemIndex + offset) % cell.stems.length;
          if (!correctIndices.includes(candidate)) {
            nextIndex = candidate;
            break;
          }
        }

          setJeopardyCellRun({
            cellId: cell.id,
            nextIndex,
            correctIndices
          });
          setJeopardyQuestion(makeJeopardyQuestion(cell, stems, nextIndex));
          return;
      } else {
        setJeopardyCells((items) => items.map((item) => (item.id === cell.id ? { ...item, completed: true } : item)));
      }
      setJeopardyQuestion(null);
    }, isCorrect ? 900 : 1600);
  }

  function startLevel(level: GameLevel, asWrongPractice = false) {
    stopRootMatchMusic();
    clearFillRevealTimers();
    if (level.type === "jeopardy-menu") {
      startJeopardy();
      return;
    }
    if (level.type === "build-word-menu") {
      startBuildAWord();
      return;
    }
    if (level.type === "root-match-menu") {
      setActiveLevel(null);
      setScreen("root-match-select");
      return;
    }

    clearSavedSession();
    initAudio();
    const nextQuestions = generateQuestions(level, asWrongPractice);
    setActiveLevel(level);
    setWrongMode(asWrongPractice);
    setQuestions(nextQuestions);
    setRun(emptyRun);
    setAnswer("");
    setLocked(false);
    setMatchedPairs({});
    setSelectedMatch(null);
    setShowFireworks(false);
    setFillReveal(null);
    setGroupMessage(null);
    setScreen("game");
    setTimeLeft(level.timeLimitSeconds);
  }

  async function recordQuestion(question: GameQuestion, isCorrect: boolean, value: unknown) {
    if ("stem" in question) {
      setWrongStemIds((prev) => {
        const next = new Set(prev);
        if (isCorrect) next.delete(question.stem.id);
        else next.add(question.stem.id);
        return next;
      });
    }

    if (!isLoggedIn) return;
    const knowledgePointId =
      "stem" in question && !question.stem.id.startsWith("latin-stem-") ? question.stem.id : undefined;

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        knowledgePointId,
        answer: value,
        isCorrect,
        gameMode: activeLevel ? `battle-level-${activeLevel.legacyId ?? activeLevel.order}` : "battle"
      })
    });
  }

  function applyResult(isCorrect: boolean, question: GameQuestion, value: unknown) {
    if (locked) return;
    setLocked(true);
    recordQuestion(question, isCorrect, value);
    setRun((prev) => {
      const combo = isCorrect ? prev.combo + 1 : 0;
      const add = !isCorrect ? 0 : activeLevel?.isBoss ? 15 : wrongMode ? 5 : combo >= 3 ? 15 : combo >= 2 ? 13 : 10;
      return {
        ...prev,
        score: prev.score + add,
        combo,
        maxCombo: Math.max(prev.maxCombo, combo),
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1)
      };
    });
    if (isCorrect) playAnswerCorrectSound();
    else playAnswerWrongSound();
    setFeedback(isCorrect ? (activeLevel?.isBoss ? "Macte!" : wrongMode ? "Meministi!" : "Recte!") : activeLevel?.isBoss ? "Cave!" : "Iterum!");

    if (!isCorrect && question.type === "fill") {
      revealFillAnswer(question);
      return;
    }

    window.setTimeout(() => {
      setFeedback("");
      setLocked(false);
      setAnswer("");
      setMatchedPairs({});
      setSelectedMatch(null);
      setFillReveal(null);
      const nextQi = run.qi + 1;
      const shouldCelebrateGroup =
        isCorrect &&
        question.type === "fill" &&
        nextQi % 20 === 0 &&
        nextQi <= questions.length;

      if (shouldCelebrateGroup) {
        const message = fillGroupMessages[Math.min(Math.floor(nextQi / 20) - 1, fillGroupMessages.length - 1)];
        setLocked(true);
        setGroupMessage(message);
        playGroupCelebrationSound();
        window.setTimeout(() => {
          setGroupMessage(null);
          setLocked(false);
          setRun((prev) => ({ ...prev, qi: prev.qi + 1 }));
        }, 5000);
        return;
      }

      setRun((prev) => ({ ...prev, qi: prev.qi + 1 }));
    }, isCorrect ? 580 : 960);
  }

  function chooseMatch(side: "left" | "right", id: string) {
    const question = activeQuestion;
    if (!question || question.type !== "match" || matchedPairs[id]) return;
    if (!selectedMatch || selectedMatch.side === side) {
      setSelectedMatch({ side, id });
      return;
    }

    const isCorrect = selectedMatch.id === id;
    const rootMode = rootMatchModeFromType(activeLevel?.type);
    const attemptedStemId = selectedMatch.side === "left" ? selectedMatch.id : side === "left" ? id : selectedMatch.id;

    if (isCorrect) {
      setMatchedPairs((prev) => ({ ...prev, [id]: true }));
      const stem = stems.find((item) => item.id === id);
      if (stem) recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, true, id);
      if (rootMode) updateRootMatchStats(rootMode, id, true);
      setRun((prev) => ({
        ...prev,
        score: prev.score + (prev.combo >= 2 ? 13 : 10),
        combo: prev.combo + 1,
        maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
        correct: prev.correct + 1
      }));
      playMatchCorrectSound();
      const nextMatched = { ...matchedPairs, [id]: true };
      if (question.left.every((item) => nextMatched[item.id])) {
        setFeedback("Optime!");
        setShowFireworks(true);
        playRoundCelebrationSound();
        window.setTimeout(() => {
          setFeedback("");
          setShowFireworks(false);
          setMatchedPairs({});
          setSelectedMatch(null);
          setRun((prev) => ({ ...prev, qi: prev.qi + 1 }));
        }, 1650);
      } else {
        setFeedback("Recte!");
        window.setTimeout(() => setFeedback(""), 520);
      }
    } else {
      const stem = stems.find((item) => item.id === selectedMatch.id || item.id === id);
      if (stem) recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, false, id);
      if (rootMode) updateRootMatchStats(rootMode, attemptedStemId, false);
      setRun((prev) => ({ ...prev, combo: 0, wrong: prev.wrong + 1 }));
      setFeedback("Iterum!");
      playMatchWrongSound();
      window.setTimeout(() => setFeedback(""), 620);
    }
    setSelectedMatch(null);
  }

  function finishLevel() {
    if (!activeLevel) return;
    stopRootMatchMusic();
    clearSavedSession();
    const total = questionItemCount(questions) || 1;
    const accuracy = run.correct / total;
    const stars = activeLevel.isBoss && run.wrong === 0 ? 3 : accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    setBest((prev) => {
      const id = activeLevel.legacyId ?? activeLevel.order;
      const current = prev[id];
      if (current && current.score >= run.score && current.stars >= stars) return prev;
      return { ...prev, [id]: { score: Math.max(current?.score ?? 0, run.score), stars: Math.max(current?.stars ?? 0, stars), correct: run.correct, wrong: run.wrong } };
    });
    if (!activeLevel.type.startsWith("root-match")) {
      const currentId = activeLevel.legacyId ?? activeLevel.order;
      const nextId = currentId + 1;
      setUnlocked((prev) => (nextId <= levels.length && !prev.includes(nextId) ? [...prev, nextId] : prev));
    }
    setResultTitle(wrongMode && run.wrong === 0 ? "错题已全部掌握！" : activeLevel.isBoss ? "魔王已被击败!" : `${levelDisplayName(activeLevel)} 完成！`);
    setScreen("result");
    beep("triangle", 520, 0.18);
  }

  useEffect(() => {
    if (screen === "game" && questions.length > 0 && run.qi >= questions.length) finishLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.qi, questions.length, screen]);

  const progress = questions.length > 0 ? Math.min(100, Math.round((run.qi / questions.length) * 100)) : 0;
  const totalQuestionItems = questionItemCount(questions);
  const resultAccuracy = totalQuestionItems ? run.correct / totalQuestionItems : 0;
  const resultStars = totalQuestionItems ? (resultAccuracy >= 0.9 ? 3 : resultAccuracy >= 0.7 ? 2 : 1) : 1;

  return (
    <main className="battle-page">
      <Link className="legacy-back battle-home-link" href={`/courses/${courseSlug}`} onClick={stopRootMatchMusic}>
        ← 返回学习中心首页
      </Link>

      {screen === "cover" ? (
        <section className="battle-cover">
          <div className="battle-user">👤 {userName}</div>
          <h1>Stem Battle</h1>
          <p>Latin Stems 闯关训练</p>
          <div className="legacy-gold-line" />
          <span>Root Matching · 6 种题型 · {stems.length} 个词根 · 大魔王挑战</span>
          <div className="battle-stats">
            <div><strong>{totalStars}</strong><span>总星级</span></div>
            <div><strong>{bestTotal}</strong><span>最高总分</span></div>
            <div><strong>{Math.min(displayLevels.length, unlocked.length + 1)}</strong><span>已解锁</span></div>
          </div>
          <button
            className="battle-main-button"
            onClick={() => {
              stopRootMatchMusic();
              setScreen("select");
            }}
            type="button"
          >
            🎮 开始挑战
          </button>
        </section>
      ) : null}

      {showResumePrompt && savedSession ? (
        <div className="battle-resume-overlay" role="dialog" aria-modal="true" aria-label="Resume saved battle">
          <section className="battle-resume-card">
            <span>Saved Practice</span>
            <h2>Continue your last battle?</h2>
            <p>
              {levelDisplayName(savedSession.activeLevel)} · {Math.min(savedSession.run.qi + 1, savedSession.questions.length)}/{savedSession.questions.length}
            </p>
            <div className="battle-resume-actions">
              <button className="button primary" onClick={() => resumeSavedSession(savedSession)} type="button">继续上次练习</button>
              <button
                className="button"
                onClick={() => {
                  clearSavedSession();
                  if (pendingResumeLevel) startLevel(pendingResumeLevel);
                  else setScreen("select");
                }}
                type="button"
              >
                重新开始
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {screen === "select" ? (
        <section className="battle-select">
          <h1>选择关卡</h1>
          <div className="battle-level-grid">
            {displayLevels.map((level) => {
              const levelNo = level.legacyId ?? level.order;
              const lockedLevel = !level.type.startsWith("root-match") && !unlocked.includes(levelNo) && levelNo !== 1;
              const record = best[levelNo];
              const isStageLevel = !level.type.startsWith("root-match");
              const levelMeta = battleLevelMeta[level.type] ?? { icon: "◆", label: "Battle", mission: "Clear the challenge." };
              if (level.type === "root-match-menu" || level.type === "jeopardy-menu" || level.type === "build-word-menu") {
                const hubClass =
                  level.type === "root-match-menu" ? "root-hub-card" : level.type === "jeopardy-menu" ? "jeopardy-hub-card" : "build-word-hub-card";
                const hubKicker = level.type === "root-match-menu" ? "Root" : level.type === "jeopardy-menu" ? "Quiz" : "Stem";
                return (
                  <article className={`battle-level-card stage-card ${hubClass}`} key={level.id}>
                    <button onClick={() => startLevel(level)} type="button">
                      <div className="stage-card-top">
                        <span className="stage-icon">{levelMeta.icon}</span>
                        <span className="stage-kicker">{hubKicker} · {levelMeta.label}</span>
                      </div>
                      <strong>{level.title}</strong>
                      <small>{levelMeta.mission}</small>
                      <em>START</em>
                    </button>
                  </article>
                );
              }

              if (isStageLevel) {
                return (
                  <article className={`battle-level-card stage-card ${level.type} ${level.isBoss ? "boss" : ""} ${lockedLevel ? "locked" : ""}`} key={level.id}>
                    <button disabled={lockedLevel} onClick={() => chooseLevel(level)} type="button">
                      <div className="stage-card-top">
                        <span className="stage-icon">{levelMeta.icon}</span>
                        <span className="stage-kicker">Level {levelNo} · {levelMeta.label}</span>
                      </div>
                      <strong>{level.subtitle}</strong>
                      <small>{levelMeta.mission}</small>
                      <em>{record ? `${record.score} 分 · ${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}` : lockedLevel ? "LOCKED" : "START"}</em>
                    </button>
                    {!level.isBoss ? (
                      <button className="battle-wrong-button" disabled={wrongStemIds.size === 0 || lockedLevel} onClick={() => chooseLevel(level, true)} type="button">
                        📝 {wrongStemIds.size ? `错题 ${wrongStemIds.size}` : "无错题"}
                      </button>
                    ) : null}
                  </article>
                );
              }

              return (
                <article className={`battle-level-card ${level.isBoss ? "boss" : ""} ${lockedLevel ? "locked" : ""}`} key={level.id}>
                  <button disabled={lockedLevel} onClick={() => chooseLevel(level)} type="button">
                    <strong>{level.title}</strong>
                    <span>{level.subtitle}</span>
                    <small>{level.description}</small>
                    <em>{record ? `${record.score} 分 · ${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}` : lockedLevel ? "未解锁" : "未挑战"}</em>
                  </button>
                  {!level.isBoss && !level.type.startsWith("root-match") ? (
                    <button className="battle-wrong-button" disabled={wrongStemIds.size === 0 || lockedLevel} onClick={() => chooseLevel(level, true)} type="button">
                      📝 {wrongStemIds.size ? `错题 ${wrongStemIds.size}` : "无错题"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {screen === "root-match-select" ? (
        <section className="battle-select root-match-select">
          <div className="battle-select-head">
            <button className="button" onClick={() => setScreen("select")} type="button">← 返回关卡</button>
            <div>
              <h1>Root Matching</h1>
              <p>Choose your battle level.</p>
            </div>
          </div>
          <div className="battle-level-grid">
            {rootMatchingLevels.map((level) => {
              const mode = rootMatchModeFromType(level.type) ?? "easy";
              const meta = rootModeMeta[mode];
              return (
                <article className={`battle-level-card root-mode-card ${mode}`} key={level.id}>
                  <button onClick={() => startLevel(level)} type="button">
                    <strong>{meta.label}</strong>
                    <span className="root-mode-stars">{meta.stars}</span>
                    <div className="root-mode-stats">
                      <span><b>{meta.words}</b> words</span>
                      <span><b>{meta.rounds}</b> rounds</span>
                    </div>
                    <em>START</em>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {screen === "jeopardy" ? (
        <section className="jeopardy-game">
          <div className="jeopardy-head">
            <button className="button" onClick={() => setScreen("select")} type="button">← 返回关卡</button>
            <div>
              <h1>Jeopardy</h1>
              <p>Pick a square. Win points. Master the stems.</p>
            </div>
            <strong>{jeopardyScore}</strong>
          </div>
          <div className="jeopardy-board">
            {["Set I", "Set II", "Set III", "Set IV", "Set V"].map((category) => (
              <div className="jeopardy-column" key={category}>
                <h2>{category}</h2>
                {jeopardyCells.filter((cell) => cell.category === category).map((cell) => (
                  <button className={cell.completed ? "completed" : ""} disabled={cell.completed} key={cell.id} onClick={() => openJeopardyCell(cell)} type="button">
                    {cell.completed ? "✓" : cell.value}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {jeopardyQuestion ? (
            <div className="jeopardy-modal">
              <section>
                <span>
                  {jeopardyCells.find((cell) => cell.id === jeopardyQuestion.cellId)?.value} points
                  {jeopardyCellRun ? ` · ${jeopardyQuestion.stemIndex + 1}/${jeopardyQuestion.totalStems}` : ""}
                </span>
                <h2>{jeopardyQuestion.prompt}</h2>
                <div className="jeopardy-options">
                  {jeopardyQuestion.options.map((option) => (
                    <button key={option} onClick={() => answerJeopardy(option)} type="button">{option}</button>
                  ))}
                </div>
                {jeopardyFeedback ? <p>{jeopardyFeedback}</p> : null}
              </section>
            </div>
          ) : null}
        </section>
      ) : null}

      {screen === "build-word" ? (
        <section className="build-word-game">
          <div className="jeopardy-head">
            <button className="button" onClick={() => setScreen("select")} type="button">← 返回关卡</button>
            <div>
              <h1>Build-a-Word</h1>
              <p>Build nonfiction words from Latin stems.</p>
            </div>
            <strong>{buildWordStage === "map" ? "Lesson I" : "com"}</strong>
          </div>

          <div className="build-word-stage">
            {buildWordStage === "map" ? (
              <div className="build-word-map">
                <div className="build-word-map-intro">
                  <span>Lesson I</span>
                  <h2>Stem Family Map</h2>
                  <p>Choose a stem node to build its word family.</p>
                </div>
                <div className="build-word-map-path" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button className={`build-word-stem-node ${completedBuildStems.includes("com") ? "completed" : "available"}`} onClick={startBuildWordStem} type="button">
                  <strong>com</strong>
                  <span>{completedBuildStems.includes("com") ? "family complete" : "3 family words"}</span>
                  <em>{completedBuildStems.includes("com") ? "REPLAY" : "START"}</em>
                </button>
                {completedBuildStems.includes("com") ? (
                  <div className="build-word-vault">
                    <b>Root Vault</b>
                    <strong>com unlocked</strong>
                    <span>{buildWordFamilyWords.map((item) => item.word).join(" · ")}</span>
                  </div>
                ) : (
                  <div className="build-word-map-note">
                    <b>Coming next</b>
                    <span>More Lesson I stems will unlock here after this prototype feels right.</span>
                  </div>
                )}
              </div>
            ) : buildWordStage === "warmup" ? (
              <>
                <div className="build-word-fact">
                  <em>to officially take control of something</em>
                </div>

                <div className="build-word-play">
                  <div className={`build-word-answer ${buildWordFeedback.includes("Recte") ? "built" : ""}`}>
                    {buildWordAnswer.length ? buildWordAnswer.map((part, index) => (
                      <button disabled={buildWordFeedback.includes("Recte")} key={`${part}-${index}`} onClick={() => removeBuildWordPart(index)} type="button">{part}</button>
                    )) : <small>Choose the parts in order</small>}
                  </div>
                  <div className="build-word-tiles">
                    {buildWordTiles.map((tile) => <button key={tile} onClick={() => chooseBuildWordTile(tile)} type="button">{tile}</button>)}
                  </div>
                  <div className="build-word-actions">
                    <button className="button primary" disabled={buildWordAnswer.length !== 3 || buildWordFeedback.includes("Recte")} onClick={checkBuildWordAnswer} type="button">CHECK</button>
                  </div>
                </div>

                {buildWordFeedback ? <div className={`build-word-feedback ${feedbackTone(buildWordFeedback)}`}>{buildWordFeedback}</div> : null}
              </>
            ) : (
              <div className="build-family-challenge">
                <div className="build-family-head">
                  <strong>com</strong>
                  <span>Build 3 words with the same stem. Then match the meanings.</span>
                </div>
                <div className="build-family-grid">
                  <div className="build-family-left">
                    {buildWordFamilyWords.map((item) => {
                      const answerParts = buildFamilyAnswers[item.id] ?? [];
                      const isMatched = Boolean(buildFamilyMatches[item.id]);
                      return (
                        <div className={`build-family-row ${selectedFamilyRow === item.id ? "selected" : ""} ${buildFamilyBuilt ? "built" : ""} ${selectedFamilyWord === item.id ? "matching" : ""} ${isMatched ? "matched" : ""}`} key={item.id}>
                          <button
                            className="build-family-word-target"
                            onClick={() => (buildFamilyBuilt ? selectFamilyWord(item.id) : setSelectedFamilyRow(item.id))}
                            onDragOver={(event) => {
                              if (!buildFamilyBuilt) event.preventDefault();
                            }}
                            onDrop={(event) => dropFamilyTile(item.id, event)}
                            type="button"
                          >
                            {answerParts.length ? answerParts.map((part, index) => (
                              <span
                                key={part.id}
                                onClick={(event) => {
                                  if (buildFamilyBuilt) return;
                                  event.stopPropagation();
                                  removeFamilyPart(item.id, index);
                                }}
                              >
                                {part.label}
                              </span>
                            )) : <small>word {buildWordFamilyWords.indexOf(item) + 1}</small>}
                          </button>
                        </div>
                      );
                    })}
                    {!buildFamilyBuilt ? (
                      <div className="build-family-bank">
                        {buildFamilyTiles.map((tile) => (
                          <button draggable key={tile.id} onClick={() => chooseFamilyTile(tile)} onDragStart={(event) => dragFamilyTile(event, tile)} type="button">{tile.label}</button>
                        ))}
                      </div>
                    ) : null}
                    {!buildFamilyBuilt ? <button className="button primary" disabled={buildFamilyTiles.length > 0} onClick={checkFamilyBuilds} type="button">CHECK WORDS</button> : null}
                  </div>
                  <div className="build-family-right">
                    {buildWordFamilyWords.map((item) => {
                      const isMatched = buildFamilyMatches[item.id] === item.id;
                      return (
                        <button className={isMatched ? "matched" : ""} disabled={!buildFamilyBuilt || isMatched} key={item.id} onClick={() => chooseFamilyMeaning(item.id)} type="button">
                          {item.meaning}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {buildFamilyFeedback ? <div className={`build-word-feedback ${feedbackTone(buildFamilyFeedback)}`}>{buildFamilyFeedback}</div> : null}
              </div>
            )}
            </div>
        </section>
      ) : null}

      {screen === "game" && activeLevel ? (
        <section className="battle-game">
          <div className={`battle-hud ${activeLevel.isBoss ? "boss" : ""} ${wrongMode ? "wrong" : ""}`}>
            <strong>⚡ {run.score}</strong>
            <span>{run.combo >= 2 ? `连击 x${run.combo}` : levelDisplayName(activeLevel)}</span>
            <span>{timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}` : `${Math.min(run.qi + 1, questions.length)}/${questions.length}`}</span>
          </div>
          <div className="battle-progress"><div style={{ width: `${progress}%` }} /></div>
          <div className={`battle-feedback ${feedback ? "show" : ""} ${feedbackTone(feedback)}`}>{feedback}</div>
          {groupMessage ? (
            <div className="battle-group-message">
              <strong>{groupMessage.english}</strong>
              <span>{groupMessage.latin}</span>
            </div>
          ) : null}
          {showFireworks ? (
            <div className="battle-fireworks" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}
          <QuestionCard
            answer={answer}
            fillReveal={fillReveal?.questionIndex === run.qi ? fillReveal : null}
            locked={locked}
            matchedPairs={matchedPairs}
            onAnswerChange={setAnswer}
            onMatch={chooseMatch}
            onSubmit={(isCorrect, value) => activeQuestion && applyResult(isCorrect, activeQuestion, value)}
            question={activeQuestion}
            selectedMatch={selectedMatch}
            variant={activeLevel.type.startsWith("root-match") ? "root-match" : "default"}
          />
        </section>
      ) : null}

      {screen === "result" && activeLevel ? (
        <section className={`battle-result ${activeLevel.isBoss ? "boss" : ""}`}>
          <h1>{resultTitle}</h1>
          <p>{run.correct === totalQuestionItems ? "太棒了！全部答对！" : resultAccuracy >= 0.8 ? "表现优秀！" : "继续加油！"}</p>
          <strong>{run.score}</strong>
          <div className="battle-stars">{"★".repeat(resultStars)}{"☆".repeat(3 - resultStars)}</div>
          <div className="battle-result-grid">
            <div><b>{run.correct}</b><span>正确</span></div>
            <div><b>{run.wrong}</b><span>错题</span></div>
            <div><b>{run.maxCombo}</b><span>最大连击</span></div>
          </div>
          <div className="battle-actions">
            <button className="button primary" onClick={() => startLevel(activeLevel, wrongMode)} type="button">再来一次</button>
            <button
              className="button"
              onClick={() => {
                stopRootMatchMusic();
                setScreen("select");
              }}
              type="button"
            >
              返回关卡
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function QuestionCard({
  question,
  answer,
  fillReveal,
  locked,
  selectedMatch,
  matchedPairs,
  onAnswerChange,
  onSubmit,
  onMatch,
  variant
}: {
  question: GameQuestion | undefined;
  answer: string;
  fillReveal: FillReveal;
  locked: boolean;
  selectedMatch: { side: "left" | "right"; id: string } | null;
  matchedPairs: Record<string, boolean>;
  onAnswerChange: (value: string) => void;
  onSubmit: (isCorrect: boolean, value: unknown) => void;
  onMatch: (side: "left" | "right", id: string) => void;
  variant: "default" | "root-match";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!question || locked || !("answer" in question) || question.type === "pick" || question.type === "tf") return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [question, locked]);

  if (!question) return null;

  if (question.type === "match") {
    return (
      <div className="battle-question">
        <div className="battle-q-type">LEVEL · Root Matching · 第 {question.round} 轮</div>
        <h2>点击左栏词根，再点击右栏对应的{question.target === "meaning" ? "英文解释" : "例词"}</h2>
        <div className={`battle-match-area ${variant === "root-match" ? "root-match" : ""}`}>
          <div className="battle-match-column left">
            {question.left.map((item) => (
              <button
                className={`battle-match-item ${selectedMatch?.id === item.id && selectedMatch.side === "left" ? "selected" : ""} ${matchedPairs[item.id] ? "matched" : ""}`}
                key={item.id}
                onClick={() => onMatch("left", item.id)}
                type="button"
              >
                <b>{item.text}</b><span>{item.sub}</span>
              </button>
            ))}
          </div>
          <div className="battle-match-column right">
            {question.right.map((item) => (
              <button
                className={`battle-match-item ${selectedMatch?.id === item.id && selectedMatch.side === "right" ? "selected" : ""} ${matchedPairs[item.id] ? "matched" : ""}`}
                key={item.id}
                onClick={() => onMatch("right", item.id)}
                type="button"
              >
                <b>{item.text}</b>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "tf") {
    return (
      <div className="battle-question">
        <div className="battle-q-type">真假法庭</div>
        <h2>{question.text}<span>这个对应关系正确吗？</span></h2>
        <div className="battle-tf-grid">
          <button disabled={locked} onClick={() => onSubmit(question.answer === true, true)} type="button">✓ 正确</button>
          <button disabled={locked} onClick={() => onSubmit(question.answer === false, false)} type="button">✗ 错误</button>
        </div>
      </div>
    );
  }

  if (question.type === "pick") {
    return (
      <div className="battle-question">
        <div className="battle-q-type">{question.boss ? "魔王·极速选择" : "词根闪电战"}</div>
        <h2>&quot;{question.meaning}&quot;<span>哪个词根表示这个意思？</span></h2>
        <div className="battle-option-grid">
          {question.options.map((option) => (
            <button disabled={locked} key={option} onClick={() => onSubmit(option === question.answer, option)} type="button">{option}</button>
          ))}
        </div>
      </div>
    );
  }

  const prompt =
    question.type === "find"
        ? `"${question.exWord}"`
        : question.type === "boss-type"
          ? `"${question.exWord}"`
          : question.type === "build"
            ? question.parts
            : "";
  const hint =
    question.type === "fill"
      ? `= ${question.stem.meaning}`
      : question.type === "find"
        ? "包含的词根是？"
        : question.type === "boss-type"
          ? `包含的词根是？（意思：${question.stem.meaning}）`
          : `意思：${question.meaning}`;
  const label =
    question.type === "fill"
      ? ""
      : question.type === "find"
        ? "拆词侦探"
        : question.type === "boss-type"
          ? "魔王·拆词侦探"
          : "构词工坊";

  return (
    <form
      className="battle-question"
      onSubmit={(event) => {
        event.preventDefault();
        const expected = "answer" in question ? question.answer : "";
        const isCorrect =
          normalize(answer) === normalize(expected) ||
          (question.type === "fill" && normalize(answer) === normalize(question.fullAnswer));
        onSubmit(isCorrect, answer);
      }}
    >
      {label ? <div className="battle-q-type">{label}</div> : null}
      <h2 className={question.type === "fill" ? "fill-question-heading" : undefined}>
        {question.type === "fill" ? (
          <span className={`fill-prompt ${fillReveal?.complete ? "complete" : ""}`}>
            {fillPromptCells(question, fillReveal).map((cell) => (
              <span className={`fill-cell ${cell.missing ? "missing" : ""} ${cell.revealed ? "revealed" : ""}`} key={cell.key}>
                {cell.value}
              </span>
            ))}
          </span>
        ) : (
          prompt
        )}
        <span>{hint}</span>
      </h2>
      <input ref={inputRef} disabled={locked} onChange={(event) => onAnswerChange(event.target.value)} placeholder="输入答案" value={answer} />
    </form>
  );
}
