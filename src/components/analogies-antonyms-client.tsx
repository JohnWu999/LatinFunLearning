"use client";

import { useMemo, useState } from "react";
import type { AnalogiesAntonymsLesson, MultipleChoiceQuestion } from "@/lib/analogies-antonyms";

type InteractiveQuestion = MultipleChoiceQuestion & {
  kind: "analogy" | "antonym";
};

type Props = {
  courseId: string;
  lesson: AnalogiesAntonymsLesson;
};
type RewardPayload = { data?: { gems?: number; rank?: number | null; awarded?: number } };

const choiceLabels = ["a", "b", "c", "d"];

function playTone(frequency: number, duration = 0.08, delay = 0, type: OscillatorType = "sine", volume = 0.045) {
  const audioWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
  window.setTimeout(() => void context.close(), (delay + duration + 0.08) * 1000);
}

function playChoiceSound() {
  playTone(660, 0.07, 0, "triangle");
}

function playBackgroundChord(frequencies: number[], duration: number, delay = 0, volume = 0.02) {
  frequencies.forEach((frequency, index) => {
    playTone(frequency, duration, delay + index * 0.015, "sine", volume);
  });
}

function playGameMusic(notes: number[], startDelay: number, volume: number, type: OscillatorType = "square") {
  notes.forEach((frequency, index) => {
    playTone(frequency, 0.09, startDelay + index * 0.095, type, volume);
  });
}

function playCelebrationSound() {
  playBackgroundChord([261.63, 329.63, 392, 523.25], 1.2, 0, 0.014);
  playGameMusic([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98], 0, 0.032);
  playTone(523.25, 0.1, 0.02, "triangle", 0.065);
  playTone(659.25, 0.1, 0.13, "triangle", 0.07);
  playTone(783.99, 0.12, 0.24, "triangle", 0.075);
  playTone(1046.5, 0.22, 0.38, "triangle", 0.085);
  playTone(1318.51, 0.16, 0.6, "triangle", 0.055);
}

function playEncouragementSound() {
  playBackgroundChord([196, 246.94, 293.66, 392], 1.05, 0, 0.012);
  playGameMusic([392, 440, 493.88, 392, 523.25, 493.88, 440, 523.25], 0, 0.024, "triangle");
  playTone(392, 0.12, 0.04, "sine", 0.05);
  playTone(523.25, 0.18, 0.18, "sine", 0.058);
  playTone(659.25, 0.14, 0.38, "sine", 0.04);
}

function speakFeedback(text: string, mood: "celebration" | "encouragement") {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.volume = 1;
  utterance.rate = mood === "celebration" ? 1.06 : 0.98;
  utterance.pitch = mood === "celebration" ? 1.24 : 1.12;

  const voices = window.speechSynthesis.getVoices();
  const americanVoice =
    voices.find((voice) => voice.lang === "en-US" && /female|samantha|allison|ava|nicky/i.test(voice.name)) ??
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.startsWith("en"));

  if (americanVoice) {
    utterance.voice = americanVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

async function applyLessonReward(courseId: string, lessonName: string, amount: number, perfect: boolean) {
  const response = await fetch(appPath("/api/rewards"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId,
      amount,
      source: "analogies-antonyms",
      sourceKey: `analogies-antonyms-${lessonName}`,
      reason: perfect ? `Perfect Analogies & Antonyms score in ${lessonName}` : `Completed Analogies & Antonyms in ${lessonName}`
    })
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as RewardPayload;
  if (typeof payload.data?.gems === "number") {
    window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: payload.data.gems, rank: payload.data.rank ?? null } }));
  }
  return payload.data?.awarded ?? 0;
}

export function AnalogiesAntonymsClient({ courseId, lesson }: Props) {
  const questions = useMemo<InteractiveQuestion[]>(
    () => [
      ...lesson.analogies.map((question) => ({ ...question, kind: "analogy" as const })),
      ...lesson.antonyms.map((question) => ({ ...question, kind: "antonym" as const }))
    ],
    [lesson]
  );
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const readyToSubmit = answeredCount === questions.length;
  const correctCount = questions.reduce((total, question, index) => {
    return total + (submitted && answers[index] === question.correctAnswerIndex ? 1 : 0);
  }, 0);

  function choose(questionIndex: number, optionIndex: number) {
    if (submitted) return;
    playChoiceSound();
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
  }

  async function submit() {
    if (!readyToSubmit || submitted) return;

    const allCorrect = questions.every((question, index) => answers[index] === question.correctAnswerIndex);
    const totalCorrect = questions.reduce((sum, question, index) => sum + (answers[index] === question.correctAnswerIndex ? 1 : 0), 0);
    const bonus = allCorrect ? 4 : totalCorrect >= Math.ceil(questions.length / 2) ? 2 : 0;
    setSubmitted(true);
    if (allCorrect) {
      playCelebrationSound();
      speakFeedback("Excellent work! Perfect score!", "celebration");
    } else {
      playEncouragementSound();
      speakFeedback("Good effort! Review the answers and try again!", "encouragement");
    }
    await applyLessonReward(courseId, lesson.lesson, totalCorrect + bonus, allCorrect);
  }

  return (
    <div className="interactive-aa">
      <div className="interactive-aa-status">
        <span>{answeredCount}/{questions.length} selected</span>
        {submitted ? <strong>{correctCount}/{questions.length} correct</strong> : null}
      </div>

      <div className="analogy-section">
        <h4>Analogies</h4>
        <div className="analogy-question-grid">
          {questions.slice(0, lesson.analogies.length).map((question, index) => (
            <InteractiveCard
              answer={answers[index]}
              index={index}
              key={question.prompt}
              onChoose={choose}
              question={question}
              submitted={submitted}
            />
          ))}
        </div>
      </div>

      <div className="analogy-section">
        <h4>Antonyms</h4>
        <div className="analogy-question-grid">
          {questions.slice(lesson.analogies.length).map((question, index) => {
            const questionIndex = lesson.analogies.length + index;
            return (
              <InteractiveCard
                answer={answers[questionIndex]}
                index={questionIndex}
                key={question.prompt}
                onChoose={choose}
                question={question}
                submitted={submitted}
              />
            );
          })}
        </div>
      </div>

      <div className="interactive-aa-actions">
        <button disabled={!readyToSubmit || submitted} onClick={submit} type="button">
          提交查看答案
        </button>
        {submitted ? (
          <button
            className="secondary"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            type="button"
          >
            重新练习
          </button>
        ) : null}
      </div>
    </div>
  );
}

type InteractiveCardProps = {
  answer?: number;
  index: number;
  onChoose: (questionIndex: number, optionIndex: number) => void;
  question: InteractiveQuestion;
  submitted: boolean;
};

function InteractiveCard({ answer, index, onChoose, question, submitted }: InteractiveCardProps) {
  const correctAnswerIndex = question.correctAnswerIndex;

  return (
    <article className={`analogy-question-card interactive ${question.kind === "antonym" ? "antonym" : ""}`}>
      <strong>{index + 1}. {question.prompt}</strong>
      <div className="interactive-choice-list">
        {question.options.map((option, optionIndex) => {
          const selected = answer === optionIndex;
          const correct = submitted && correctAnswerIndex === optionIndex;
          const wrong = submitted && selected && correctAnswerIndex !== optionIndex;

          return (
            <button
              className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
              disabled={submitted}
              key={option}
              onClick={() => onChoose(index, optionIndex)}
              type="button"
            >
              <span>{choiceLabels[optionIndex]}.</span>
              {option}
            </button>
          );
        })}
      </div>
      {submitted && typeof correctAnswerIndex === "number" ? (
        <p className="interactive-answer">
          Answer: {choiceLabels[correctAnswerIndex]}. {question.options[correctAnswerIndex]}
        </p>
      ) : null}
    </article>
  );
}
