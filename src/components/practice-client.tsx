"use client";

import { useMemo, useState } from "react";

type Exercise = {
  id: string;
  type: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  order: number;
  group?: string | null;
};

type PracticeClientProps = {
  courseId: string;
  lessonId: string;
  exercises: Exercise[];
  isLoggedIn: boolean;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function asOptions(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asAnswer(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

export function PracticeClient({ courseId, lessonId, exercises, isLoggedIn }: PracticeClientProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [answered, setAnswered] = useState<null | { correct: boolean; answer: string }>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const current = exercises[index];
  const progress = useMemo(() => Math.round((stats.total / Math.max(exercises.length, 1)) * 100), [stats.total, exercises.length]);

  if (!current) {
    return (
      <div className="practice-card">
        <h2>本课练习完成</h2>
        <p>
          正确 {stats.correct} / {stats.total}
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  const options = asOptions(current.options);
  const correctAnswer = asAnswer(current.correctAnswer);

  async function submit(answer: string) {
    if (!current || answered) return;
    const correct = normalize(answer) === normalize(correctAnswer);
    setAnswered({ correct, answer });
    setStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    if (isLoggedIn) {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId,
          exerciseId: current.id,
          answer,
          isCorrect: correct,
          gameMode: "practice"
        })
      });
    }
  }

  function next() {
    setSelected("");
    setAnswered(null);
    setIndex((value) => value + 1);
  }

  return (
    <section className="practice-card">
      <div className="practice-topline">
        <span>
          {current.group ?? current.type} · {index + 1}/{exercises.length}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <h2>{current.prompt}</h2>

      {options.length > 1 ? (
        <div className="option-list">
          {options.map((option) => {
            const isCorrect = answered && normalize(option) === normalize(correctAnswer);
            const isWrong = answered && answered.answer === option && !answered.correct;
            return (
              <button
                className={`option-choice ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                disabled={Boolean(answered)}
                key={option}
                onClick={() => submit(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="answer-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit(selected);
          }}
        >
          <input
            disabled={Boolean(answered)}
            onChange={(event) => setSelected(event.target.value)}
            placeholder="输入答案"
            value={selected}
          />
          <button className="button primary" disabled={!selected || Boolean(answered)} type="submit">
            提交
          </button>
        </form>
      )}

      {answered ? (
        <div className={`feedback ${answered.correct ? "correct" : "wrong"}`}>
          <strong>{answered.correct ? "回答正确" : "已记录到错题"}</strong>
          <span>标准答案：{correctAnswer}</span>
          {isLoggedIn ? null : <span>登录后会同步进度和错题。</span>}
        </div>
      ) : null}

      <div className="actions">
        {answered ? (
          <button className="button primary" onClick={next} type="button">
            下一题
          </button>
        ) : null}
      </div>
    </section>
  );
}
