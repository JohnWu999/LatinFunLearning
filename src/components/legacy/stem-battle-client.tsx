"use client";

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
  | { type: "fill"; stem: Stem; masked: string; answer: string }
  | { type: "find"; stem: Stem; exWord: string; answer: string }
  | { type: "match"; left: Array<{ id: string; text: string; sub: string }>; right: Array<{ id: string; text: string }>; round: number }
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

type Screen = "cover" | "select" | "game" | "result";

const emptyRun = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  correct: 0,
  wrong: 0,
  qi: 0
};

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
  if (stem.length <= 2) return `${stem[0]}_`;
  return `${stem[0]}${"_".repeat(stem.length - 2)}${stem[stem.length - 1]}`;
}

function levelIndices(level: GameLevel, stems: Stem[]) {
  return Array.isArray(level.indices)
    ? level.indices.map((item) => Number(item)).filter((item) => Number.isFinite(item) && stems[item])
    : [];
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
  const audioRef = useRef<AudioContext | null>(null);

  const activeQuestion = questions[run.qi];
  const totalStars = Object.values(best).reduce((sum, item) => sum + item.stars, 0);
  const bestTotal = Object.values(best).reduce((sum, item) => sum + item.score, 0);

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
    window.localStorage.setItem(`latinfun_battle_${courseId}`, JSON.stringify({ best, unlocked }));
  }, [best, unlocked, courseId]);

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

  function initAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
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

  function generateQuestions(level: GameLevel, forceWrongMode = false): GameQuestion[] {
    if (forceWrongMode) {
      return shuffle(
        weakStems().map((stem, index) => {
          const mod = index % 4;
          if (mod === 0) return { type: "fill", stem, masked: maskStem(stem.key), answer: stem.key };
          if (mod === 1) return { type: "find", stem, exWord: stem.examples[0] ?? stem.key, answer: stem.key };
          if (mod === 2) return { type: "tf", stem, text: `${stem.key} = ${wrongMeaning(stem)}`, answer: false };
          return { type: "pick", stem, meaning: stem.meaning ?? "", answer: stem.key, options: optionsFor(stem) };
        })
      );
    }

    if (level.type === "fill") {
      return levelIndices(level, stems).map((index) => {
        const stem = stems[index];
        return { type: "fill", stem, masked: maskStem(stem.key), answer: stem.key };
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
        rounds.push({ type: "match", left, right, round: rounds.length + 1 });
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

  function startLevel(level: GameLevel, asWrongPractice = false) {
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
    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        knowledgePointId: "stem" in question ? question.stem.id : undefined,
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
    beep(isCorrect ? "sine" : "sawtooth", isCorrect ? 760 : 160, isCorrect ? 0.09 : 0.16);
    setFeedback(isCorrect ? (activeLevel?.isBoss ? "击退!" : wrongMode ? "记住了!" : "正确!") : activeLevel?.isBoss ? "魔王反击!" : "再想想!");
    window.setTimeout(() => {
      setFeedback("");
      setLocked(false);
      setAnswer("");
      setMatchedPairs({});
      setSelectedMatch(null);
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
    if (isCorrect) {
      setMatchedPairs((prev) => ({ ...prev, [id]: true }));
      const stem = stems.find((item) => item.id === id);
      if (stem) recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, true, id);
      setRun((prev) => ({
        ...prev,
        score: prev.score + (prev.combo >= 2 ? 13 : 10),
        combo: prev.combo + 1,
        maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
        correct: prev.correct + 1
      }));
      setFeedback("连线正确!");
      beep("sine", 720);
      const nextMatched = { ...matchedPairs, [id]: true };
      if (question.left.every((item) => nextMatched[item.id])) {
        window.setTimeout(() => {
          setFeedback("");
          setMatchedPairs({});
          setSelectedMatch(null);
          setRun((prev) => ({ ...prev, qi: prev.qi + 1 }));
        }, 620);
      } else {
        window.setTimeout(() => setFeedback(""), 520);
      }
    } else {
      const stem = stems.find((item) => item.id === selectedMatch.id || item.id === id);
      if (stem) recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, false, id);
      setRun((prev) => ({ ...prev, combo: 0, wrong: prev.wrong + 1 }));
      setFeedback("不匹配");
      beep("sawtooth", 150, 0.16);
      window.setTimeout(() => setFeedback(""), 620);
    }
    setSelectedMatch(null);
  }

  function finishLevel() {
    if (!activeLevel) return;
    const total = questions.length || 1;
    const accuracy = run.correct / total;
    const stars = activeLevel.isBoss && run.wrong === 0 ? 3 : accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    setBest((prev) => {
      const id = activeLevel.legacyId ?? activeLevel.order;
      const current = prev[id];
      if (current && current.score >= run.score && current.stars >= stars) return prev;
      return { ...prev, [id]: { score: Math.max(current?.score ?? 0, run.score), stars: Math.max(current?.stars ?? 0, stars), correct: run.correct, wrong: run.wrong } };
    });
    const nextId = (activeLevel.legacyId ?? activeLevel.order) + 1;
    setUnlocked((prev) => (nextId <= levels.length && !prev.includes(nextId) ? [...prev, nextId] : prev));
    setResultTitle(wrongMode && run.wrong === 0 ? "错题已全部掌握！" : activeLevel.isBoss ? "魔王已被击败!" : `${activeLevel.title} 完成！`);
    setScreen("result");
    beep("triangle", 520, 0.18);
  }

  useEffect(() => {
    if (screen === "game" && questions.length > 0 && run.qi >= questions.length) finishLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.qi, questions.length, screen]);

  const progress = questions.length > 0 ? Math.min(100, Math.round((run.qi / questions.length) * 100)) : 0;
  const resultStars = questions.length ? (run.correct / questions.length >= 0.9 ? 3 : run.correct / questions.length >= 0.7 ? 2 : 1) : 1;

  return (
    <main className="battle-page">
      <a className="legacy-back battle-home-link" href={`/courses/${courseSlug}`}>
        ← 返回学习中心首页
      </a>

      {screen === "cover" ? (
        <section className="battle-cover">
          <div className="battle-user">👤 {userName}</div>
          <h1>Caesar&apos;s English II</h1>
          <p>拉丁词根闯关</p>
          <div className="legacy-gold-line" />
          <span>6 种题型 · {stems.length} 个词根 · 大魔王挑战</span>
          <div className="battle-stats">
            <div><strong>{totalStars}</strong><span>总星级</span></div>
            <div><strong>{bestTotal}</strong><span>最高总分</span></div>
            <div><strong>{unlocked.length}</strong><span>已解锁</span></div>
          </div>
          <button className="battle-main-button" onClick={() => setScreen("select")} type="button">🎮 开始挑战</button>
        </section>
      ) : null}

      {screen === "select" ? (
        <section className="battle-select">
          <h1>选择关卡</h1>
          <div className="battle-level-grid">
            {levels.map((level) => {
              const levelNo = level.legacyId ?? level.order;
              const lockedLevel = !unlocked.includes(levelNo) && levelNo !== 1;
              const record = best[levelNo];
              return (
                <article className={`battle-level-card ${level.isBoss ? "boss" : ""} ${lockedLevel ? "locked" : ""}`} key={level.id}>
                  <button disabled={lockedLevel} onClick={() => startLevel(level)} type="button">
                    <strong>{level.title}</strong>
                    <span>{level.subtitle}</span>
                    <small>{level.description}</small>
                    <em>{record ? `${record.score} 分 · ${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}` : lockedLevel ? "未解锁" : "未挑战"}</em>
                  </button>
                  {!level.isBoss ? (
                    <button className="battle-wrong-button" disabled={wrongStemIds.size === 0 || lockedLevel} onClick={() => startLevel(level, true)} type="button">
                      📝 {wrongStemIds.size ? `错题 ${wrongStemIds.size}` : "无错题"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {screen === "game" && activeLevel ? (
        <section className="battle-game">
          <div className={`battle-hud ${activeLevel.isBoss ? "boss" : ""} ${wrongMode ? "wrong" : ""}`}>
            <strong>⚡ {run.score}</strong>
            <span>{run.combo >= 2 ? `连击 x${run.combo}` : activeLevel.title}</span>
            <span>{timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}` : `${Math.min(run.qi + 1, questions.length)}/${questions.length}`}</span>
          </div>
          <div className="battle-progress"><div style={{ width: `${progress}%` }} /></div>
          <div className={`battle-feedback ${feedback ? "show" : ""}`}>{feedback}</div>
          <QuestionCard
            answer={answer}
            locked={locked}
            matchedPairs={matchedPairs}
            onAnswerChange={setAnswer}
            onMatch={chooseMatch}
            onSubmit={(isCorrect, value) => activeQuestion && applyResult(isCorrect, activeQuestion, value)}
            question={activeQuestion}
            selectedMatch={selectedMatch}
          />
        </section>
      ) : null}

      {screen === "result" && activeLevel ? (
        <section className={`battle-result ${activeLevel.isBoss ? "boss" : ""}`}>
          <h1>{resultTitle}</h1>
          <p>{run.correct === questions.length ? "太棒了！全部答对！" : run.correct / Math.max(questions.length, 1) >= 0.8 ? "表现优秀！" : "继续加油！"}</p>
          <strong>{run.score}</strong>
          <div className="battle-stars">{"★".repeat(resultStars)}{"☆".repeat(3 - resultStars)}</div>
          <div className="battle-result-grid">
            <div><b>{run.correct}</b><span>正确</span></div>
            <div><b>{run.wrong}</b><span>错题</span></div>
            <div><b>{run.maxCombo}</b><span>最大连击</span></div>
          </div>
          <div className="battle-actions">
            <button className="button primary" onClick={() => startLevel(activeLevel, wrongMode)} type="button">再来一次</button>
            <button className="button" onClick={() => setScreen("select")} type="button">返回关卡</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function QuestionCard({
  question,
  answer,
  locked,
  selectedMatch,
  matchedPairs,
  onAnswerChange,
  onSubmit,
  onMatch
}: {
  question: GameQuestion | undefined;
  answer: string;
  locked: boolean;
  selectedMatch: { side: "left" | "right"; id: string } | null;
  matchedPairs: Record<string, boolean>;
  onAnswerChange: (value: string) => void;
  onSubmit: (isCorrect: boolean, value: unknown) => void;
  onMatch: (side: "left" | "right", id: string) => void;
}) {
  if (!question) return null;

  if (question.type === "match") {
    return (
      <div className="battle-question">
        <div className="battle-q-type">LEVEL · 连线配对 · 第 {question.round} 轮</div>
        <h2>点击左栏词根，再点击右栏对应的例词</h2>
        <div className="battle-match-area">
          <div>
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
          <div>
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
    question.type === "fill"
      ? question.masked
      : question.type === "find"
        ? `"${question.exWord}"`
        : question.type === "boss-type"
          ? `"${question.exWord}"`
          : question.parts;
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
      ? "拼写补全"
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
        onSubmit(normalize(answer) === normalize(expected), answer);
      }}
    >
      <div className="battle-q-type">{label}</div>
      <h2>{prompt}<span>{hint}</span></h2>
      <input disabled={locked} onChange={(event) => onAnswerChange(event.target.value)} placeholder="输入答案" value={answer} />
      <button className="battle-submit" disabled={locked || !answer.trim()} type="submit">确认</button>
    </form>
  );
}
