"use client";

type ToneOptions = {
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  cutoff?: number;
  to?: number;
};

type VoiceOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  delayMs?: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(frequency: number, start: number, duration: number, options: ToneOptions = {}) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const startTime = context.currentTime + start;
  const endTime = startTime + duration;
  const volume = options.volume ?? 0.08;
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, endTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(options.cutoff ?? 2600, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + (options.attack ?? 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime + (options.release ?? 0.07));
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + (options.release ?? 0.07) + 0.04);
}

function noise(start: number, duration: number, volume = 0.035, cutoff = 4200) {
  const context = getAudioContext();
  if (!context) return;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index++) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const startTime = context.currentTime + start;
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(cutoff, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

function boing(start = 0, base = 330, top = 720, volume = 0.07) {
  tone(base, start, 0.11, { type: "sine", volume, to: top, attack: 0.004, release: 0.04 });
  tone(top * 0.98, start + 0.1, 0.13, { type: "triangle", volume: volume * 0.8, to: base * 1.35, attack: 0.004 });
}

function sparkle(start = 0, count = 5) {
  for (let index = 0; index < count; index++) {
    tone(1100 + index * 235, start + index * 0.045, 0.07, { type: "sine", volume: 0.035, cutoff: 5200, attack: 0.003 });
  }
  noise(start + 0.02, 0.16, 0.024, 5200);
}

function pickVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ["Samantha", "Ava", "Nicky", "Karen", "Google US English", "Microsoft Aria", "Alex"];
  return (
    preferred.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("en-us")) ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ??
    null
  );
}

export function speakGameFeedback(text: string, options: VoiceOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = "en-US";
  utterance.rate = options.rate ?? 1.06;
  utterance.pitch = options.pitch ?? 1.18;
  utterance.volume = options.volume ?? 0.86;
  window.setTimeout(() => window.speechSynthesis.speak(utterance), options.delayMs ?? 70);
}

export function playKidsCorrect(withVoice = false) {
  boing(0, 360, 760, 0.075);
  tone(880, 0.13, 0.09, { type: "triangle", volume: 0.08 });
  tone(1175, 0.22, 0.11, { type: "sine", volume: 0.07 });
  sparkle(0.25, 4);
  if (withVoice) speakGameFeedback("Hurray!", { rate: 1.18, pitch: 1.32, delayMs: 90 });
}

export function playKidsWrong(withVoice = false) {
  boing(0, 300, 430, 0.055);
  tone(260, 0.12, 0.11, { type: "triangle", volume: 0.045, to: 220, cutoff: 1100 });
  tone(392, 0.27, 0.12, { type: "sine", volume: 0.045 });
  if (withVoice) speakGameFeedback("Oops, try again!", { rate: 0.98, pitch: 1.04, delayMs: 80 });
}

export function playKidsCombo(withVoice = false) {
  [523, 659, 784, 988, 1319].forEach((frequency, index) => boing(index * 0.085, frequency * 0.72, frequency, 0.045));
  sparkle(0.38, 6);
  if (withVoice) speakGameFeedback("Super combo!", { rate: 1.1, pitch: 1.26, delayMs: 80 });
}

export function playGemSparkle(withVoice = false) {
  sparkle(0, 8);
  tone(1568, 0.08, 0.08, { type: "triangle", volume: 0.07 });
  tone(2093, 0.18, 0.08, { type: "triangle", volume: 0.07 });
  tone(3136, 0.3, 0.16, { type: "sine", volume: 0.055 });
  if (withVoice) speakGameFeedback("Gems!", { rate: 1.08, pitch: 1.22, volume: 0.76, delayMs: 100 });
}

export function playKidsHint(withVoice = false) {
  tone(740, 0, 0.14, { type: "sine", volume: 0.045 });
  tone(988, 0.12, 0.16, { type: "sine", volume: 0.045 });
  sparkle(0.16, 3);
  if (withVoice) speakGameFeedback("Here is a little clue.", { rate: 0.94, pitch: 1.1, volume: 0.82, delayMs: 80 });
}

export function playKidsComplete(withVoice = false) {
  [523, 659, 784, 1047, 1319, 1568].forEach((frequency, index) => {
    tone(frequency, index * 0.12, 0.13, { type: "triangle", volume: 0.07 });
  });
  boing(0.55, 420, 840, 0.07);
  sparkle(0.62, 10);
  if (withVoice) speakGameFeedback("You did it!", { rate: 1.06, pitch: 1.2, volume: 0.88, delayMs: 90 });
}

export function playCalmCorrect() {
  tone(659, 0, 0.12, { type: "triangle", volume: 0.085 });
  tone(880, 0.09, 0.16, { type: "sine", volume: 0.075 });
  tone(1320, 0.17, 0.13, { type: "sine", volume: 0.04 });
}

export function playCalmWrong() {
  tone(220, 0, 0.16, { type: "triangle", volume: 0.055, to: 185, cutoff: 1200 });
  tone(165, 0.15, 0.22, { type: "sine", volume: 0.05, to: 145, cutoff: 900 });
}

export function playCalmComplete() {
  [523, 659, 784, 1047, 1175, 1047].forEach((frequency, index) => {
    tone(frequency, index * 0.16, 0.17, { type: "triangle", volume: 0.07 });
  });
  tone(1568, 1.02, 0.42, { type: "sine", volume: 0.045 });
  noise(0.88, 0.28, 0.03, 3600);
}
