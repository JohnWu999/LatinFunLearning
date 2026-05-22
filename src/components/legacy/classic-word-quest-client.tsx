"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LessonVocabularyCard } from "@/lib/lesson-vocabulary";

type Props = {
  courseId: string;
  courseSlug: string;
  words: LessonVocabularyCard[];
  userName: string | null | undefined;
  initialMode?: "whack" | "detective";
};

type RoundWord = LessonVocabularyCard & { lesson: number };
type FlyingGem = {
  id: string;
  index: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

const ROUND_SIZE = 20;
const TOTAL_ROUNDS = 20;
const DETECTIVE_SIZE = 40;
const C1_DETECTIVE_WORDS = new Set([
  "derision",
  "procure",
  "countenance",
  "profound",
  "manifest",
  "prodigious",
  "languor",
  "prostrate",
  "profuse",
  "condescend",
  "odious",
  "ostentatious",
  "inexorable",
  "indolent",
  "doleful",
  "alacrity",
  "oblique",
  "magnanimous",
  "importune",
  "peremptory",
  "incredulous",
  "tacit",
  "sanguine",
  "torpid",
  "mortify",
  "melancholy",
  "visage",
  "venerate",
  "obsequious",
  "ignominy",
  "acquiescence",
  "impassive",
  "impending",
  "verdure",
  "equivocal",
  "orthodox",
  "profane",
  "tumult",
  "sagacity",
  "remonstrate",
  "incongruous",
  "malevolence",
  "ambiguous",
  "felicity",
  "irrevocable",
  "articulate",
  "martyr",
  "transient",
  "latent",
  "livid",
  "censure",
  "apprehension",
  "superfluous",
  "tangible",
  "lurid",
  "pervade",
  "epithet",
  "abject",
  "eccentric",
  "imperious",
  "solicitude",
  "stolid",
  "palpable",
  "austere",
  "furtive"
]);

type WordErrorStat = {
  attempts: number;
  wrong: number;
};

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function makeRound(allWords: RoundWord[], reviewWords: RoundWord[], freshStart: number) {
  const selected: RoundWord[] = [];
  const selectedKeys = new Set<string>();
  const addWord = (word: RoundWord) => {
    const key = `${word.lesson}:${word.word.toLowerCase()}:${word.definition}`;
    if (selectedKeys.has(key) || selected.length >= ROUND_SIZE) return;
    selected.push(word);
    selectedKeys.add(key);
  };

  reviewWords.forEach(addWord);
  let nextFreshIndex = freshStart;
  while (selected.length < ROUND_SIZE && nextFreshIndex < allWords.length) {
    addWord(allWords[nextFreshIndex]);
    nextFreshIndex += 1;
  }

  if (selected.length < ROUND_SIZE) {
    shuffle(allWords).forEach(addWord);
  }

  return { roundWords: selected, nextFreshIndex };
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}

function vowelTrace(word: string) {
  return Array.from(word.toLowerCase())
    .map((letter) => ("aeiou".includes(letter) ? letter : "_"))
    .join(" ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectiveClue(word: RoundWord, index: number) {
  const mode = index % 4;
  if (mode === 1 && word.synonyms.length) return `Synonym clue: ${word.synonyms.slice(0, 2).join(" · ")}`;
  if (mode === 2 && word.antonyms.length) return `Antonym clue: not ${word.antonyms.slice(0, 2).join(" · not ")}`;
  if (mode === 3 && word.sources[0]?.text) {
    const hidden = word.sources[0].text.replace(new RegExp(escapeRegExp(word.word), "ig"), "_____");
    return `Source clue: "${hidden}"`;
  }
  return `Definition clue: ${word.definition}`;
}

function getWordStatKey(word: string) {
  return word.trim().toLowerCase();
}

function getDetectiveStatsStorageKey(courseId: string) {
  return `classic-word-quest-stats:${courseId}`;
}

function speakWord(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang === "en-US" && /Samantha|Ava|Alex|US/i.test(voice.name)) ?? voices.find((voice) => voice.lang === "en-US") ?? null;
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function speakWhackReaction(kind: "correct" | "wrong") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(kind === "correct" ? "Hurray!" : "Oho!");
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang === "en-US" && /Junior|Samantha|Ava|Alex|US/i.test(voice.name)) ?? voices.find((voice) => voice.lang === "en-US") ?? null;
  utterance.lang = "en-US";
  utterance.rate = kind === "correct" ? 0.86 : 0.78;
  utterance.pitch = kind === "correct" ? 1.38 : 0.72;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function playWhackSound(kind: "hit" | "miss" | "bonus") {
  if (typeof window === "undefined") return;
  const audioWindow = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const tones = kind === "hit" ? [520, 720, 960] : kind === "bonus" ? [523, 659, 784, 1046, 1318] : [190, 128, 90];
  tones.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "miss" ? "sawtooth" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(kind === "miss" ? 0.05 : 0.045, context.currentTime + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.09 + (kind === "miss" ? 0.22 : 0.16));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + index * 0.09);
    oscillator.stop(context.currentTime + index * 0.09 + (kind === "miss" ? 0.22 : 0.16));
  });
  window.setTimeout(() => context.close().catch(() => undefined), 700);
}

export function ClassicWordQuestClient({ courseId, courseSlug, words, userName, initialMode = "whack" }: Props) {
  const allWords = useMemo(() => words as RoundWord[], [words]);
  const [wordErrorStats, setWordErrorStats] = useState<Record<string, WordErrorStat>>({});
  const detectiveWords = useMemo(() => {
    const highErrorWords = allWords
      .filter((word) => (wordErrorStats[getWordStatKey(word.word)]?.wrong ?? 0) > 0)
      .sort((left, right) => {
        const leftStats = wordErrorStats[getWordStatKey(left.word)] ?? { attempts: 0, wrong: 0 };
        const rightStats = wordErrorStats[getWordStatKey(right.word)] ?? { attempts: 0, wrong: 0 };
        const leftRate = leftStats.attempts ? leftStats.wrong / leftStats.attempts : 0;
        const rightRate = rightStats.attempts ? rightStats.wrong / rightStats.attempts : 0;
        return rightStats.wrong - leftStats.wrong || rightRate - leftRate || rightStats.attempts - leftStats.attempts;
      });
    const c1Words = allWords.filter((word) => C1_DETECTIVE_WORDS.has(getWordStatKey(word.word)));
    const selected: RoundWord[] = [];
    const seen = new Set<string>();
    const addWord = (word: RoundWord) => {
      const key = getWordStatKey(word.word);
      if (seen.has(key) || selected.length >= DETECTIVE_SIZE) return;
      selected.push(word);
      seen.add(key);
    };
    highErrorWords.forEach(addWord);
    c1Words.forEach(addWord);
    allWords.forEach(addWord);
    return selected;
  }, [allWords, wordErrorStats]);
  const initialRound = useMemo(() => makeRound(allWords, [], 0), [allWords]);
  const [gameMode] = useState<"whack" | "detective">(initialMode);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundWords, setRoundWords] = useState<RoundWord[]>(initialRound.roundWords);
  const [nextFreshIndex, setNextFreshIndex] = useState(initialRound.nextFreshIndex);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"good" | "bad" | "">("");
  const [localGems, setLocalGems] = useState(0);
  const [totalGemsThisQuest, setTotalGemsThisQuest] = useState(0);
  const [hitWords, setHitWords] = useState<string[]>([]);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [questReviewWords, setQuestReviewWords] = useState<string[]>([]);
  const [answeredWord, setAnsweredWord] = useState<string | null>(null);
  const [flyingGems, setFlyingGems] = useState<FlyingGem[]>([]);
  const [detectiveIndex, setDetectiveIndex] = useState(0);
  const [detectivePhase, setDetectivePhase] = useState<"choose" | "spell" | "done">("choose");
  const [detectiveFeedback, setDetectiveFeedback] = useState("");
  const [detectiveFeedbackKind, setDetectiveFeedbackKind] = useState<"good" | "bad" | "">("");
  const [detectiveSpelling, setDetectiveSpelling] = useState("");
  const [detectiveAttempts, setDetectiveAttempts] = useState(0);
  const [detectiveGems, setDetectiveGems] = useState(0);
  const [detectiveMisses, setDetectiveMisses] = useState<string[]>([]);
  const startedAtRef = useRef(Date.now());
  const gemCounterRef = useRef<HTMLDivElement | null>(null);
  const detectiveBoardRef = useRef<HTMLElement | null>(null);

  const current = roundWords[questionIndex];
  const choices = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(allWords.filter((item) => item.word !== current.word)).slice(0, 2);
    return shuffle([current, ...distractors]);
  }, [allWords, current]);

  const complete = questionIndex >= roundWords.length;
  const questComplete = complete && roundIndex >= TOTAL_ROUNDS - 1;
  const detectiveCurrent = detectiveWords[detectiveIndex];
  const detectiveComplete = detectiveIndex >= detectiveWords.length || detectivePhase === "done";
  const detectiveOptions = useMemo(() => {
    if (!detectiveCurrent) return [];
    return shuffle([
      detectiveCurrent,
      ...shuffle(allWords.filter((word) => word.word !== detectiveCurrent.word)).slice(0, 2)
    ]);
  }, [allWords, detectiveCurrent]);

  useEffect(() => {
    setRoundIndex(0);
    setRoundWords(initialRound.roundWords);
    setNextFreshIndex(initialRound.nextFreshIndex);
    setQuestionIndex(0);
    setLocalGems(0);
    setTotalGemsThisQuest(0);
    setHitWords([]);
    setMissedWords([]);
    setQuestReviewWords([]);
  }, [initialRound]);

  useEffect(() => {
    if (gameMode !== "whack" || !current) return;
    startedAtRef.current = Date.now();
    setAnsweredWord(null);
    setFeedback("");
    setFeedbackKind("");
    const id = window.setTimeout(() => speakWord(current.word), 360);
    return () => window.clearTimeout(id);
  }, [current, gameMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(getDetectiveStatsStorageKey(courseId));
      if (stored) setWordErrorStats(JSON.parse(stored) as Record<string, WordErrorStat>);
    } catch {
      setWordErrorStats({});
    }
  }, [courseId]);

  useEffect(() => {
    if (gameMode !== "detective" || detectivePhase !== "choose" || detectiveIndex === 0) return;
    const id = window.setTimeout(() => {
      const board = detectiveBoardRef.current;
      if (!board) return;
      const top = board.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [detectiveIndex, detectivePhase, gameMode]);

  function recordWordOutcome(word: string, wrong: boolean) {
    const key = getWordStatKey(word);
    setWordErrorStats((currentStats) => {
      let baseStats = currentStats;
      if (gameMode === "detective") {
        try {
          const stored = window.localStorage.getItem(getDetectiveStatsStorageKey(courseId));
          if (stored) baseStats = JSON.parse(stored) as Record<string, WordErrorStat>;
        } catch {
          baseStats = currentStats;
        }
      }
      const nextWordStats = baseStats[key] ?? { attempts: 0, wrong: 0 };
      const nextStats = {
        ...baseStats,
        [key]: {
          attempts: nextWordStats.attempts + 1,
          wrong: nextWordStats.wrong + (wrong ? 1 : 0)
        }
      };
      try {
        window.localStorage.setItem(getDetectiveStatsStorageKey(courseId), JSON.stringify(nextStats));
      } catch {
        // Local personalization is optional; the game still works without storage.
      }
      if (gameMode === "detective") return currentStats;
      return nextStats;
    });
  }

  async function applyGems(amount: number, sourceKey: string, reason: string) {
    const response = await fetch(appPath("/api/rewards"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, amount, source: "classic-word-quest", sourceKey, reason })
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { data?: { gems?: number; rank?: number | null; awarded?: number } };
    if (typeof payload.data?.gems === "number") {
      window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
    }
  }

  function rewardForSpeed(ms: number) {
    if (ms <= 1500) return 5;
    if (ms <= 3000) return 3;
    return 1;
  }

  function launchFlyingGems(amount: number, source: HTMLElement | null) {
    const now = Date.now();
    const sourceRect = source?.getBoundingClientRect();
    const targetRect = gemCounterRef.current?.getBoundingClientRect();
    const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
    const startY = sourceRect ? sourceRect.top + sourceRect.height * 0.42 : window.innerHeight * 0.66;
    const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const targetY = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight * 0.28;
    const gems = Array.from({ length: amount }, (_, index) => {
      const fan = (index - (amount - 1) / 2) * 14;
      return {
        id: `${now}-${index}`,
        index,
        startX: startX + fan,
        startY: startY + Math.abs(fan) * 0.18,
        deltaX: targetX - startX - fan * 0.22,
        deltaY: targetY - startY - 10
      };
    });
    setFlyingGems((items) => [...items, ...gems]);
    window.setTimeout(() => {
      setFlyingGems((items) => items.filter((item) => !gems.some((gem) => gem.id === item.id)));
    }, 1100);
  }

  async function whack(choice: RoundWord, source: HTMLElement | null) {
    if (!current || answeredWord) return;
    const elapsed = Date.now() - startedAtRef.current;
    const correct = choice.word === current.word;
    setAnsweredWord(choice.word);

    if (correct) {
      recordWordOutcome(current.word, false);
      const gems = rewardForSpeed(elapsed);
      setLocalGems((value) => value + gems);
      setTotalGemsThisQuest((value) => value + gems);
      setHitWords((items) => [...items, current.word]);
      setFeedback(gems >= 5 ? `Perfect hit! +${gems} gems` : `Hit! +${gems} gems`);
      setFeedbackKind("good");
      playWhackSound(gems >= 5 ? "bonus" : "hit");
      launchFlyingGems(gems, source);
      window.setTimeout(() => speakWhackReaction("correct"), 280);
      await applyGems(gems, `word-whack-hit-${current.word}-${questionIndex}`, `Whack-a-Word hit: ${current.word}`);
    } else {
      recordWordOutcome(current.word, true);
      setLocalGems((value) => Math.max(0, value - 2));
      setMissedWords((items) => Array.from(new Set([...items, current.word])));
      setQuestReviewWords((items) => Array.from(new Set([...items, current.word])));
      setFeedback(`Miss! -2 gems. Listen again next time.`);
      setFeedbackKind("bad");
      playWhackSound("miss");
      window.setTimeout(() => speakWhackReaction("wrong"), 280);
      await applyGems(-2, `word-whack-miss-${current.word}-${Date.now()}`, `Whack-a-Word miss: ${current.word}`);
    }

    window.setTimeout(() => {
      setQuestionIndex((index) => index + 1);
    }, correct ? 900 : 1250);
  }

  function continueToNextRound() {
    const reviewWords = roundWords.filter((word) => missedWords.includes(word.word));
    const nextRound = makeRound(allWords, reviewWords, nextFreshIndex);
    setRoundIndex((value) => Math.min(value + 1, TOTAL_ROUNDS - 1));
    setRoundWords(nextRound.roundWords);
    setNextFreshIndex(nextRound.nextFreshIndex);
    setQuestionIndex(0);
    setLocalGems(0);
    setHitWords([]);
    setMissedWords([]);
    setAnsweredWord(null);
    setFeedback("");
    setFeedbackKind("");
  }

  function restartQuest() {
    const firstRound = makeRound(allWords, [], 0);
    setRoundIndex(0);
    setRoundWords(firstRound.roundWords);
    setNextFreshIndex(firstRound.nextFreshIndex);
    setQuestionIndex(0);
    setLocalGems(0);
    setTotalGemsThisQuest(0);
    setHitWords([]);
    setMissedWords([]);
    setQuestReviewWords([]);
    setAnsweredWord(null);
    setFeedback("");
    setFeedbackKind("");
  }

  function resetDetective() {
    setDetectiveIndex(0);
    setDetectivePhase("choose");
    setDetectiveFeedback("");
    setDetectiveFeedbackKind("");
    setDetectiveSpelling("");
    setDetectiveAttempts(0);
    setDetectiveGems(0);
    setDetectiveMisses([]);
  }

  function chooseDetectiveWord(choice: RoundWord) {
    if (!detectiveCurrent || detectivePhase !== "choose") return;
    if (choice.word === detectiveCurrent.word) {
      setDetectivePhase("spell");
      setDetectiveFeedback("Evidence found. Now spell the word.");
      setDetectiveFeedbackKind("good");
      setDetectiveSpelling("");
      setDetectiveAttempts(0);
      playWhackSound("hit");
      window.setTimeout(() => speakWord(detectiveCurrent.word), 180);
      return;
    }

    recordWordOutcome(detectiveCurrent.word, true);
    setDetectiveMisses((items) => Array.from(new Set([...items, detectiveCurrent.word])));
    setDetectiveFeedback("Not that suspect. Read the clue again.");
    setDetectiveFeedbackKind("bad");
    playWhackSound("miss");
  }

  async function submitDetectiveSpelling(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detectiveCurrent || detectivePhase !== "spell") return;
    const correct = normalizeAnswer(detectiveSpelling) === normalizeAnswer(detectiveCurrent.word);

    if (correct) {
      recordWordOutcome(detectiveCurrent.word, false);
      const gems = detectiveAttempts === 0 ? 5 : 3;
      setDetectiveGems((value) => value + gems);
      setDetectiveFeedback(`Case solved! +${gems} gems.`);
      setDetectiveFeedbackKind("good");
      playWhackSound(gems >= 5 ? "bonus" : "hit");
      launchFlyingGems(gems, gemCounterRef.current);
      await applyGems(gems, `word-detective-${detectiveCurrent.word}-${detectiveIndex}`, `Word Detective solved: ${detectiveCurrent.word}`);
      window.setTimeout(() => {
        const nextIndex = detectiveIndex + 1;
        if (nextIndex >= detectiveWords.length) {
          setDetectivePhase("done");
          setDetectiveFeedback("");
        } else {
          setDetectiveIndex(nextIndex);
          setDetectivePhase("choose");
          setDetectiveFeedback("");
          setDetectiveFeedbackKind("");
          setDetectiveSpelling("");
          setDetectiveAttempts(0);
        }
      }, 900);
      return;
    }

    setDetectiveMisses((items) => Array.from(new Set([...items, detectiveCurrent.word])));
    recordWordOutcome(detectiveCurrent.word, true);
    const nextAttempt = detectiveAttempts + 1;
    setDetectiveAttempts(nextAttempt);
    setDetectiveFeedback(
      nextAttempt === 1
        ? `Vowel trace: ${vowelTrace(detectiveCurrent.word)}`
        : nextAttempt === 2
          ? `Boundary clue: starts with "${detectiveCurrent.word[0]}", ends with "${detectiveCurrent.word.at(-1)}".`
          : "Case failed. Keep investigating."
    );
    setDetectiveFeedbackKind("bad");
    playWhackSound("miss");
    if (nextAttempt >= 3) {
      window.setTimeout(() => {
        const nextIndex = detectiveIndex + 1;
        if (nextIndex >= detectiveWords.length) setDetectivePhase("done");
        else {
          setDetectiveIndex(nextIndex);
          setDetectivePhase("choose");
          setDetectiveFeedback("");
          setDetectiveFeedbackKind("");
          setDetectiveSpelling("");
          setDetectiveAttempts(0);
        }
      }, 1300);
    }
  }

  return (
    <main className="word-quest-page">
      <Link className="legacy-back battle-home-link" href={`/courses/${courseSlug}`}>
        ← Learning Center
      </Link>

      <section className="word-quest-cover">
        <div className="battle-user">👤 {userName ?? "player"}</div>
        <div className="classic-word-game-tabs">
          <Link className={gameMode === "whack" ? "active" : ""} href={`/courses/${courseSlug}/classic-word-quest/whack-a-word`}>Whack-a-Word</Link>
          <Link className={gameMode === "detective" ? "active" : ""} href={`/courses/${courseSlug}/classic-word-quest/word-detective`}>Word Detective</Link>
        </div>
        {gameMode === "detective" ? (
          <div className="detective-hero">
            <span>Case 01 · Confidential</span>
            <h1>Word Detective</h1>
            <p>A letter has arrived. Open the clue, identify the word, then spell the evidence.</p>
          </div>
        ) : (
          <>
            <h1>Whack-a-Word</h1>
            <p>Round {roundIndex + 1} / {TOTAL_ROUNDS} · Listen fast. Whack the right classic word.</p>
          </>
        )}
        <div className={`word-quest-stats ${gameMode === "detective" ? "detective-case-stats" : ""}`}>
          {gameMode === "detective" ? (
            <>
              <div><em>Case</em><strong>{detectiveComplete ? detectiveWords.length : detectiveIndex + 1}</strong><span>/ {detectiveWords.length}</span></div>
              <div ref={gemCounterRef}><em>Gems</em><strong>{detectiveGems}</strong><span>evidence reward</span></div>
              <div><em>File</em><strong>{detectiveMisses.length}</strong><span>review words</span></div>
              <div><em>Stage</em><strong>{detectivePhase === "spell" ? "SPELL" : "CLUE"}</strong><span>current step</span></div>
            </>
          ) : (
            <>
              <div><strong>{complete ? roundWords.length : questionIndex + 1}</strong><span>/ {roundWords.length}</span></div>
              <div ref={gemCounterRef}><strong>{localGems}</strong><span>gems this run</span></div>
              <div><strong>{missedWords.length}</strong><span>review words</span></div>
              <div><strong>{Math.min(allWords.length, nextFreshIndex)}</strong><span>/ {allWords.length} covered</span></div>
            </>
          )}
        </div>
      </section>
      <div className="whack-flying-gems" aria-hidden="true">
        {flyingGems.map((gem) => (
          <span
            key={gem.id}
            style={{
              "--gem-delay": `${gem.index * 0.045}s`,
              "--gem-start-x": `${gem.startX}px`,
              "--gem-start-y": `${gem.startY}px`,
              "--gem-delta-x": `${gem.deltaX}px`,
              "--gem-delta-y": `${gem.deltaY}px`,
              "--gem-pop": `${(gem.index - 2) * 10}px`
            } as CSSProperties & Record<string, string>}
          >
            ◆
          </span>
        ))}
      </div>

      {gameMode === "detective" ? (
        !detectiveComplete && detectiveCurrent ? (
          <section ref={detectiveBoardRef} className={`detective-board ${detectivePhase === "choose" ? "choosing" : "spelling"}`}>
            <div className="detective-case-file">
              {detectivePhase === "choose" ? (
                <div className="parchment-cinema" aria-hidden="true">
                  <span className="parchment-cinema-sheet" />
                  <span className="parchment-cinema-roll" />
                </div>
              ) : null}
              <span>Anonymous Letter</span>
              <strong>{detectiveClue(detectiveCurrent, detectiveIndex)}</strong>
              <em>Find the hidden word. Trust the clue.</em>
            </div>

            {detectivePhase === "choose" ? (
              <div className="detective-options">
                {detectiveOptions.map((choice) => (
                  <button key={`${choice.lesson}-${choice.word}-${choice.definition}`} onClick={() => chooseDetectiveWord(choice)} type="button">
                    {choice.word}
                  </button>
                ))}
              </div>
            ) : (
              <form className="detective-spell-lock" onSubmit={submitDetectiveSpelling}>
                <label htmlFor="detective-spelling">Write the word from memory</label>
                <div className="detective-seal">Evidence selected</div>
                <p>No spelling clue yet. Type the complete word.</p>
                <input
                  autoFocus
                  id="detective-spelling"
                  onChange={(event) => setDetectiveSpelling(event.target.value)}
                  placeholder="type the full word"
                  value={detectiveSpelling}
                />
                <button className="battle-main-button" type="submit">Submit Spelling</button>
                {detectiveFeedback ? <div className={`detective-spell-feedback ${detectiveFeedbackKind}`}>{detectiveFeedback}</div> : null}
              </form>
            )}

            {detectivePhase === "choose" && detectiveFeedback ? <div className={`whack-feedback ${detectiveFeedbackKind}`}>{detectiveFeedback}</div> : null}
          </section>
        ) : (
          <section className="whack-result">
            <h2>Case Closed!</h2>
            <p>You solved {detectiveWords.length - detectiveMisses.length} clean cases. Review list: {detectiveMisses.length ? detectiveMisses.join(", ") : "none"}.</p>
            <button className="battle-main-button" onClick={resetDetective} type="button">Play Again</button>
          </section>
        )
      ) : !complete && current ? (
        <section className="whack-board">
          <div className="whack-prompt">
            <button className="whack-speaker" onClick={() => speakWord(current.word)} type="button">🔊 Replay</button>
            <span>Listen, then strike the matching word.</span>
          </div>

          <div className={`whack-feedback ${feedbackKind}`}>{feedback}</div>

          <div className="mole-field">
            {choices.map((choice) => {
              const state = answeredWord
                ? choice.word === current.word
                  ? "correct"
                  : choice.word === answeredWord
                    ? "wrong"
                    : ""
                : "";
              return (
                <button
                  className={`mole-hole ${state}`}
                  key={`${choice.lesson}-${choice.word}-${choice.definition}`}
                  onClick={(event) => whack(choice, event.currentTarget)}
                  type="button"
                >
                  <span className="mole-head">
                    <b className="definition-mole-text">
                      {choice.definition}
                    </b>
                  </span>
                  <span className="hammer">🔨</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="whack-result">
          <h2>{questComplete ? "Quest Clear!" : `Round ${roundIndex + 1} Clear!`}</h2>
          <p>
            You struck {hitWords.length} classic words.
            {questComplete
              ? ` Total gems this quest: ${totalGemsThisQuest}. Review list: ${questReviewWords.length > 0 ? questReviewWords.join(", ") : "none"}.`
              : ` Next round will revisit: ${missedWords.length > 0 ? missedWords.join(", ") : "none"}.`}
          </p>
          <button
            className="battle-main-button"
            onClick={questComplete ? restartQuest : continueToNextRound}
            type="button"
          >
            {questComplete ? "Play Again" : "Next Round"}
          </button>
        </section>
      )}
    </main>
  );
}
