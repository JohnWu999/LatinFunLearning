"use client";

import { Volume2 } from "lucide-react";

type PronunciationButtonProps = {
  word: string;
};

export function PronunciationButton({ word }: PronunciationButtonProps) {
  function speak() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    utterance.pitch = 1;

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

  return (
    <button
      aria-label={`Listen to the pronunciation of ${word}`}
      className="pronunciation-button"
      onClick={speak}
      title={`Listen to ${word}`}
      type="button"
    >
      <Volume2 size={16} strokeWidth={2.2} />
    </button>
  );
}
