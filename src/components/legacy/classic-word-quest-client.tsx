"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LessonVocabularyCard } from "@/lib/lesson-vocabulary";

type Props = {
  courseId: string;
  courseSlug: string;
  words: LessonVocabularyCard[];
  userName: string | null | undefined;
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

export function ClassicWordQuestClient({ courseId, courseSlug, words, userName }: Props) {
  const allWords = useMemo(() => words as RoundWord[], [words]);
  const initialRound = useMemo(() => makeRound(allWords, [], 0), [allWords]);
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
  const startedAtRef = useRef(Date.now());
  const gemCounterRef = useRef<HTMLDivElement | null>(null);

  const current = roundWords[questionIndex];
  const choices = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(allWords.filter((item) => item.word !== current.word)).slice(0, 2);
    return shuffle([current, ...distractors]);
  }, [allWords, current]);

  const complete = questionIndex >= roundWords.length;
  const questComplete = complete && roundIndex >= TOTAL_ROUNDS - 1;

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
    if (!current) return;
    startedAtRef.current = Date.now();
    setAnsweredWord(null);
    setFeedback("");
    setFeedbackKind("");
    const id = window.setTimeout(() => speakWord(current.word), 360);
    return () => window.clearTimeout(id);
  }, [current]);

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

  return (
    <main className="word-quest-page">
      <Link className="legacy-back battle-home-link" href={`/courses/${courseSlug}`}>
        ← Learning Center
      </Link>

      <section className="word-quest-cover">
        <div className="battle-user">👤 {userName ?? "player"}</div>
        <h1>Whack-a-Word</h1>
        <p>Round {roundIndex + 1} / {TOTAL_ROUNDS} · Listen fast. Whack the right classic word.</p>
        <div className="word-quest-stats">
          <div><strong>{complete ? roundWords.length : questionIndex + 1}</strong><span>/ {roundWords.length}</span></div>
          <div ref={gemCounterRef}><strong>{localGems}</strong><span>gems this run</span></div>
          <div><strong>{missedWords.length}</strong><span>review words</span></div>
          <div><strong>{Math.min(allWords.length, nextFreshIndex)}</strong><span>/ {allWords.length} covered</span></div>
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

      {!complete && current ? (
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
