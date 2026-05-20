"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LessonVocabularyCard } from "@/lib/lesson-vocabulary";

type Scene = {
  start: number;
  end: number;
  visual: "opening" | "placate" | "derision" | "vivacious" | "procure" | "retort" | "recap";
  subtitle: string;
  focusWord?: string;
  caption: string;
  audioSrc: string;
  tone: "storm" | "spark" | "quest" | "answer" | "recap";
};

type Props = {
  words: LessonVocabularyCard[];
};

const DURATION = 96;

const scenes: Scene[] = [
  {
    start: 0,
    end: 9,
    visual: "opening",
    subtitle: "In the old library, five students need a rare map before the bell rings.",
    caption: "五个词，会在同一个故事里出现。",
    audioSrc: "/audio/classic-words/lesson-1/opening.m4a",
    tone: "storm"
  },
  {
    start: 9,
    end: 24,
    visual: "placate",
    subtitle: "Mara raises her hands and tries to placate the angry crowd.",
    focusWord: "placate",
    caption: "placate: calm someone who is angry",
    audioSrc: "/audio/classic-words/lesson-1/placate.m4a",
    tone: "storm"
  },
  {
    start: 24,
    end: 39,
    visual: "derision",
    subtitle: "A rival laughs with derision: not a joke, but mocking scorn.",
    focusWord: "derision",
    caption: "derision: ridicule; mocking scorn",
    audioSrc: "/audio/classic-words/lesson-1/derision.m4a",
    tone: "spark"
  },
  {
    start: 39,
    end: 54,
    visual: "vivacious",
    subtitle: "Leo stays vivacious, full of lively energy, and points to the shelves.",
    focusWord: "vivacious",
    caption: "vivacious: lively and spirited",
    audioSrc: "/audio/classic-words/lesson-1/vivacious.m4a",
    tone: "spark"
  },
  {
    start: 54,
    end: 69,
    visual: "procure",
    subtitle: "The team must procure the missing key by solving the librarian's clue.",
    focusWord: "procure",
    caption: "procure: get something by effort",
    audioSrc: "/audio/classic-words/lesson-1/procure.m4a",
    tone: "quest"
  },
  {
    start: 69,
    end: 84,
    visual: "retort",
    subtitle: "When the rival sneers again, Mara gives one quick retort.",
    focusWord: "retort",
    caption: "retort: a quick, sharp reply",
    audioSrc: "/audio/classic-words/lesson-1/retort.m4a",
    tone: "answer"
  },
  {
    start: 84,
    end: 96,
    visual: "recap",
    subtitle: "Quick check: Which word means mocking scorn? Derision.",
    caption: "placate · derision · vivacious · procure · retort",
    audioSrc: "/audio/classic-words/lesson-1/recap.m4a",
    tone: "recap"
  }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function getScene(progress: number) {
  return scenes.find((scene) => progress >= scene.start && progress < scene.end) ?? scenes[scenes.length - 1];
}

export function ClassicWordsVideoPreview({ words }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [time, setTime] = useState(0);
  const spokenSceneRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scene = getScene(time);
  const focusedWord = words.find((word) => word.word === scene.focusWord);
  const progress = (time / DURATION) * 100;

  function stopNarration() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  function speakScene(currentScene: Scene) {
    if (!soundOn || !audioRef.current) return;
    stopNarration();
    audioRef.current.src = currentScene.audioSrc;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      setSoundOn(false);
    });
  }

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setTime((current) => {
        if (current >= DURATION) {
          window.clearInterval(interval);
          setIsPlaying(false);
          return DURATION;
        }
        return clamp(current + 0.25, 0, DURATION);
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      stopNarration();
      return;
    }
    if (spokenSceneRef.current === scene.visual) return;
    spokenSceneRef.current = scene.visual;
    speakScene(scene);

    return () => {
      stopNarration();
    };
  }, [isPlaying, scene, soundOn]);

  useEffect(() => {
    return () => stopNarration();
  }, []);

  return (
    <section className={`cw-pure-video tone-${scene.tone} scene-${scene.visual}`} aria-label="Lesson 1 Classic Words video">
      <div className="cw-video-canvas">
        <audio ref={audioRef} preload="auto" />
        <div className="cw-video-meter">
          <span>Lesson 1</span>
          <strong>{formatTime(time)} / {formatTime(DURATION)}</strong>
        </div>

        <div className="cw-cinematic-scene" aria-hidden="true">
          <div className="cw-shelves back" />
          <div className="cw-shelves side" />
          <div className="cw-window" />
          <div className="cw-arch" />
          <div className="cw-table" />
          <div className="cw-character main" />
          <div className="cw-character second" />
          <div className="cw-character rival" />
          <div className="cw-crowd">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="cw-map" />
          <div className="cw-key" />
          <div className="cw-clue-card">CLUE</div>
          <div className="cw-action-line calm-one" />
          <div className="cw-action-line calm-two" />
          <div className="cw-derision-burst">HA!</div>
          <div className="cw-derision-shadow">mocking scorn</div>
          <div className="cw-vivacious-spark spark-one" />
          <div className="cw-vivacious-spark spark-two" />
          <div className="cw-vivacious-spark spark-three" />
          <div className="cw-retort-bubble">Then help us find it.</div>
          <div className="cw-recap-board">
            {words.map((word) => (
              <span key={word.word}>{word.word}</span>
            ))}
          </div>
          {focusedWord ? <div className="cw-word-burst">{focusedWord.word}</div> : null}
        </div>

        <div className="cw-subtitle-band">
          <p>{scene.subtitle}</p>
          <span>{scene.caption}</span>
        </div>

        <div className="cw-video-controls">
          <button
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            className="cw-control-button primary"
            onClick={() => {
              if (time >= DURATION) setTime(0);
              setIsPlaying((value) => {
                if (value) {
                  stopNarration();
                  return false;
                }
                spokenSceneRef.current = "";
                return true;
              });
            }}
            type="button"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            aria-label="Restart preview"
            className="cw-control-button"
            onClick={() => {
              setTime(0);
              setIsPlaying(false);
              spokenSceneRef.current = "";
              stopNarration();
            }}
            type="button"
          >
            <RotateCcw size={18} />
            <span>Restart</span>
          </button>
          <button
            aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
            className="cw-control-button icon-only"
            onClick={() => {
              setSoundOn((value) => {
                if (value) stopNarration();
                spokenSceneRef.current = "";
                return !value;
              });
            }}
            type="button"
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="cw-progress-track" aria-hidden="true">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
