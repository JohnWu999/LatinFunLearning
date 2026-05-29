"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RewardGemBurst, useRewardGemBurst } from "@/components/reward-gem-burst";
import type { LessonVocabularyCard } from "@/lib/lesson-vocabulary";

type Props = {
  courseId: string;
  courseSlug: string;
  words: LessonVocabularyCard[];
  userName: string | null | undefined;
  initialMode?: "whack" | "detective" | "sentence" | "passage";
  reviewWordKey?: string;
  reviewWordKeys?: string[];
  returnTo?: string;
  reviewCategory?: "Classic Words" | "Sentence Writing";
};

type RoundWord = LessonVocabularyCard & { lesson: number };
type SentenceChallenge = {
  word: RoundWord;
  sentence: string;
  contextNote?: string;
  source: {
    work: string;
    author: string;
    kind: "source" | "phrase" | "practice";
  };
  options: RoundWord[];
};
type SentenceWritingScore = {
  score: number;
  stars: number;
  gems: number;
  level: string;
  rubric: Array<{ label: string; points: number; max: number; stars: number; note: string }>;
  praise: string;
  advice: string;
};
type PassageChallenge = {
  title: string;
  scene: string;
  source: string;
  blanks: Array<{ word: RoundWord; displayWord: string; before: string; after: string; options: RoundWord[]; active: boolean }>;
};
const ROUND_SIZE = 20;
const TOTAL_ROUNDS = 20;
const DETECTIVE_SIZE = 40;
const SENTENCE_FORGE_SIZE = 65;
const PASSAGE_QUEST_SIZE = 24;
const PASSAGE_ACTIVE_BLANKS = 6;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle<T>(items: T[], seed: string, key: (item: T) => string) {
  return [...items].sort((left, right) => stableHash(`${seed}:${key(left)}`) - stableHash(`${seed}:${key(right)}`));
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

function sentenceTokens(value: string) {
  return value.toLowerCase().match(/[a-z']+/g) ?? [];
}

function targetWordForms(word: string) {
  const base = getWordStatKey(word);
  const forms = new Set([base, `${base}s`, `${base}ed`, `${base}ing`]);
  if (base.endsWith("e")) {
    const withoutE = base.slice(0, -1);
    forms.add(`${withoutE}ed`);
    forms.add(`${withoutE}ing`);
  }
  if (base.endsWith("y")) {
    forms.add(`${base.slice(0, -1)}ies`);
    forms.add(`${base.slice(0, -1)}ied`);
  }
  return forms;
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

function sentenceSource(word: RoundWord) {
  return word.sources.find((source) => source.text.includes("[[")) ??
    word.sources.find((source) => new RegExp(`\\b${escapeRegExp(word.word)}\\b`, "i").test(source.text)) ??
    word.sources[0];
}

function isCompleteLiterarySentence(value: string) {
  const cleaned = value.replace(/\[\[|\]\]/g, "").trim();
  const tokens = sentenceTokens(cleaned);
  const hasEnding = /[.!?]["”']?$/.test(cleaned);
  const hasVerbShape = /\b(am|is|are|was|were|be|being|been|has|have|had|do|does|did|can|could|may|might|must|shall|should|will|would|seems?|seemed|became|become|felt|made|makes|said|saw|found|stood|came|went|turned|looked|thought|knew|spoke)\b/i.test(cleaned);
  return tokens.length >= 9 && hasEnding && hasVerbShape;
}

function practiceSentence(word: RoundWord) {
  const target = `[[${word.word}]]`;
  const definition = word.definition.replace(/[.;:]$/, "");
  const templates = [
    `The character's ${target} reveals ${definition}, and the whole scene turns sharper.`,
    `The narrator lets ${target} rise quietly through the scene, suggesting ${definition}.`,
    `As the conflict deepens, ${target} becomes the word that best captures ${definition}.`,
    `The passage gathers force when ${target} appears, giving the reader a vivid sense of ${definition}.`
  ];
  return templates[stableHash(word.word) % templates.length];
}

function sentenceChallengeText(word: RoundWord, index: number) {
  const source = sentenceSource(word);
  const sourceText = source?.text.trim() ?? "";
  const markedText = sourceText.includes("[[")
    ? sourceText
    : sourceText.replace(new RegExp(`\\b${escapeRegExp(word.word)}\\b`, "i"), `[[${word.word}]]`);

  if (source && markedText.includes("[[") && isCompleteLiterarySentence(markedText)) {
    return {
      sentence: markedText.replace(/\[\[[^\]]+\]\]/g, "_____"),
      contextNote: undefined,
      source: {
        work: source.work,
        author: source.author,
        kind: "source" as const
      }
    };
  }

  if (source && markedText.includes("[[")) {
    return {
      sentence: markedText.replace(/\[\[[^\]]+\]\]/g, "_____"),
      contextNote: `Original phrase from the source. Use the meaning clue to complete it: ${word.definition}.`,
      source: {
        work: source.work,
        author: source.author,
        kind: "phrase" as const
      }
    };
  }

  return {
    sentence: practiceSentence(word).replace(/\[\[[^\]]+\]\]/g, "_____"),
    contextNote: `Practice sentence. No complete source sentence was available for this word in the current data.`,
    source: {
      work: `Practice Sentence ${index + 1}`,
      author: "Classic WordLab",
      kind: "practice" as const
    }
  };
}

function sentenceWritingGemReward(stars: number) {
  if (stars <= 0) return 0;
  return 2 ** stars;
}

function makeSentenceChallenges(allWords: RoundWord[], stats: Record<string, WordErrorStat>, reviewWordKeys: string[] = []) {
  const highErrorWords = allWords
    .filter((word) => (stats[getWordStatKey(word.word)]?.wrong ?? 0) > 0)
    .sort((left, right) => {
      const leftStats = stats[getWordStatKey(left.word)] ?? { attempts: 0, wrong: 0 };
      const rightStats = stats[getWordStatKey(right.word)] ?? { attempts: 0, wrong: 0 };
      return rightStats.wrong - leftStats.wrong || rightStats.attempts - leftStats.attempts;
    });
  const c1Words = allWords.filter((word) => C1_DETECTIVE_WORDS.has(getWordStatKey(word.word)));
  const selected: RoundWord[] = [];
  const seen = new Set<string>();
  const addWord = (word: RoundWord) => {
    const key = getWordStatKey(word.word);
    if (seen.has(key) || selected.length >= SENTENCE_FORGE_SIZE) return;
    selected.push(word);
    seen.add(key);
  };
  reviewWordKeys.forEach((reviewKey) => {
    const reviewWord = wordByKey(allWords, reviewKey);
    if (reviewWord) addWord(reviewWord);
  });
  highErrorWords.forEach(addWord);
  c1Words.forEach(addWord);
  allWords.forEach(addWord);

  return selected.map((word, index) => {
    const challengeText = sentenceChallengeText(word, index);
    const distractors = stableShuffle(
      allWords.filter((candidate) => candidate.word !== word.word && candidate.partOfSpeech === word.partOfSpeech),
      `sentence-distractors-${word.word}`,
      (candidate) => candidate.word
    );
    const fallbackDistractors = stableShuffle(
      allWords.filter((candidate) => candidate.word !== word.word),
      `sentence-fallback-${word.word}`,
      (candidate) => candidate.word
    );
    const optionPool: RoundWord[] = [];
    const optionKeys = new Set<string>();
    [...distractors, ...fallbackDistractors].forEach((candidate) => {
      const key = getWordStatKey(candidate.word);
      if (optionKeys.has(key) || optionPool.length >= 3) return;
      optionPool.push(candidate);
      optionKeys.add(key);
    });
    return {
      word,
      sentence: challengeText.sentence,
      contextNote: challengeText.contextNote,
      source: challengeText.source,
      options: stableShuffle([word, ...optionPool], `sentence-options-${word.word}`, (candidate) => candidate.word)
    };
  });
}

function wordByKey(words: RoundWord[], key: string) {
  return words.find((word) => getWordStatKey(word.word) === getWordStatKey(safeDecode(key)));
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeReviewKeys(keys: Array<string | undefined>) {
  const seen = new Set<string>();
  return keys
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key))
    .map((key) => getWordStatKey(safeDecode(key)))
    .filter((key) => {
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeReturnTo(value?: string) {
  if (!value) return undefined;
  const decoded = safeDecode(value).trim();
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return undefined;
  return decoded;
}

function makePassageOptions(allWords: RoundWord[], target: RoundWord, seed: string) {
  const byPart = allWords.filter((word) => word.word !== target.word && word.partOfSpeech === target.partOfSpeech);
  const fallback = allWords.filter((word) => word.word !== target.word);
  const options: RoundWord[] = [];
  const seen = new Set<string>();
  [...stableShuffle(byPart, `${seed}-part`, (word) => word.word), ...stableShuffle(fallback, `${seed}-fallback`, (word) => word.word)].forEach((word) => {
    const key = getWordStatKey(word.word);
    if (seen.has(key) || options.length >= 3) return;
    options.push(word);
    seen.add(key);
  });
  return stableShuffle([target, ...options], `${seed}-options`, (word) => word.word);
}

function makePassageChallenges(allWords: RoundWord[], stats: Record<string, WordErrorStat>, reviewWordKeys: string[] = []) {
  const blueprints = [
    {
      title: "Caesar Plans the Campaign",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson II, Caesar’s Sesquipedalian Story",
      keys: ["manifest", "vivacious", "countenance", "prodigious", "procure", "placate", "profound", "retort", "derision", "languor"],
      lines: [
        { before: "A ", after: " determination clouded Caesar’s " },
        { before: "", after: " " },
        { before: "", after: " as he pondered the " },
        { before: "", after: " problems of the attack against the Gauls. He would have to " },
        { before: "", after: " supplies for the legions, and he would have to " },
        { before: "", after: " the angry Senate, which was growing " },
        { before: "", after: " weary of his extended campaigns. Cicero, with his lightning " },
        { before: "", after: ", was making a mockery of Caesar’s missives. Even in the streets, Caesar was being held in ", form: "retorts" },
        { before: "", after: " by Romans who could not understand how formidable the tribes of Gauls were. The Gauls were not easy enemies weakened by " },
        { before: "", after: "." }
      ]
    },
    {
      title: "The Senate in Disorder",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson IV, Caesar’s Sesquipedalian Story",
      keys: ["prodigious", "clamor", "profuse", "acute", "retort", "audible", "benevolent", "serene", "countenance", "grotesque", "odious", "vivacious", "manifest", "somber", "prostrate"],
      lines: [
        { before: "A ", after: " " },
        { before: "", after: " rose in the Senate, and the halls were " },
        { before: "", after: " with " },
        { before: "", after: " " },
        { before: "", after: "s and " },
        { before: "", after: ", derisive condescensions that profoundly shattered the " },
        { before: "", after: " " },
        { before: "", after: " of the institution. The scene was surreal; on every ", form: "serenity" },
        { before: "", after: ", a " },
        { before: "", after: " and " },
        { before: "", after: " apprehension dislocated the normal " },
        { before: "", after: " faces. Only the absence of Caesar permitted such " },
        { before: "", after: " corruption, and Caesar would impose a " },
        { before: "", after: " rectitude on the Senate and leave these feasting senators " },
        { before: "", after: " in submission." }
      ]
    },
    {
      title: "The Aqueduct Workers",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson VI, Caesar’s Sesquipedalian Story",
      keys: ["odious", "somber", "prostrate", "vivacious", "alacrity", "doleful", "indolent", "apprehension", "acute", "inexorable", "audible", "retort", "ostentatious", "manifest", "profuse"],
      lines: [
        { before: "Work on the aqueduct had stopped. The ", after: " sun burned down on the " },
        { before: "", after: " workers, " },
        { before: "", after: " on the grass, and the typical " },
        { before: "", after: " " },
        { before: "", after: " of their countenances was replaced by a " },
        { before: "", after: " determination to do no more. It was not that they were " },
        { before: "", after: "; rather, they felt " },
        { before: "", after: ". Another worker had fallen, suffered ", form: "apprehension" },
        { before: "", after: " injuries, and without more scaffolding the accidents would continue ", form: "acute" },
        { before: "", after: ". There was no ", form: "inexorably" },
        { before: "", after: " complaint, no derisive " },
        { before: "", after: " or " },
        { before: "", after: " show of discontent; there was no " },
        { before: "", after: " insurrection, despite the engineers’ " },
        { before: "", after: " expressions of concern." }
      ]
    },
    {
      title: "Calpurnia’s Warning",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson VIII, Caesar’s Sesquipedalian Story",
      keys: ["incredulous", "doleful", "ostentatious", "prodigious", "oblique", "grotesque", "pensive", "apprehension", "benevolent", "serene", "audible", "manifest", "importune", "prostrate", "magnanimous", "peremptory"],
      lines: [
        { before: "Caesar’s wife Calpurnia was ", after: ". The night had swarmed with portents, and now the " },
        { before: "", after: " owl was clamoring in the street in " },
        { before: "", after: " defiance of everything normal. " },
        { before: "", after: " storms had filled the night with lightning, casting " },
        { before: "", after: " beams and " },
        { before: "", after: " shadows in their rooms. Calpurnia was more than " },
        { before: "", after: "; she felt profound " },
        { before: "", after: ". Caesar’s ambition sometimes contradicted his " },
        { before: "", after: " words. Outside now, the sky was " },
        { before: "", after: "; no thunder was " },
        { before: "", after: ", but the warnings had been too " },
        { before: "", after: ". She would " },
        { before: "", after: " Caesar not to go, even if she had to " },
        { before: "", after: " herself and beg. His spirit, so " },
        { before: "", after: ", might rebel, and he might refuse with " },
        { before: "", after: " command." }
      ]
    },
    {
      title: "The Camp at Sunset",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson X, Caesar’s Sesquipedalian Story",
      keys: ["tacit", "melancholy", "profound", "lurid", "inexorable", "prostrate", "doleful", "sanguine", "torpid", "audible", "pensive", "visage", "manifest", "clamor", "placid", "alacrity"],
      lines: [
        { before: "By ", after: " agreement, the Roman soldiers increased their precautions. There was something " },
        { before: "", after: " in this green hillside, something " },
        { before: "", after: " and vaguely threatening, as though the redness of the sunset was only a " },
        { before: "", after: " warning of what was " },
        { before: "", after: ". Even the waning sun seemed " },
        { before: "", after: ", apologetic. The soldiers looked at one another with " },
        { before: "", after: " countenances. " },
        { before: "", after: " conversation descended into " },
        { before: "", after: " murmuring, until metallic sounds became " },
        { before: "", after: ". The " },
        { before: "", after: " " },
        { before: "", after: " of the soldiers changed into ", form: "visages" },
        { before: "", after: " incredulity as the sound rose into a belligerent " },
        { before: "", after: ". The Gauls shattered the " },
        { before: "", after: " repose of the hillside as with howling " },
        { before: "", after: " they raced down upon the legion." }
      ]
    },
    {
      title: "The Fool in the Hall",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson XII, Caesar’s Sesquipedalian Story",
      keys: ["odious", "obsequious", "venerate", "ignominy", "visage", "importune", "inexorable", "oblique", "acquiescence", "impassive", "placid", "affable", "tacit", "incredulous", "countenance", "mortify", "indolent", "retort", "peremptory", "derision"],
      lines: [
        { before: "The ", after: ", " },
        { before: "", after: " fool followed the emperor, ranting about how he " },
        { before: "", after: " his majesty and apologizing for his ", form: "venerated" },
        { before: "", after: ". With a melancholy " },
        { before: "", after: " the fool " },
        { before: "", after: " Caesar ", form: "importuned" },
        { before: "", after: " in ", form: "inexorably" },
        { before: "", after: " phrases, but Caesar would show no " },
        { before: "", after: ". " },
        { before: "", after: ", Caesar continued ", form: "impassively" },
        { before: "", after: " down the hall, past the grotesquely ", form: "placidly" },
        { before: "", after: " merchants and politicians with their " },
        { before: "", after: " agendas. The fool’s " },
        { before: "", after: " " },
        { before: "", after: " registered only a look that would " },
        { before: "", after: " an " },
        { before: "", after: " follower, and Caesar was about to " },
        { before: "", after: " with " },
        { before: "", after: ", condescending " },
        { before: "", after: "." }
      ]
    },
    {
      title: "The Wall at Dusk",
      scene: "Authentic source passage adapted only by blanking target words.",
      source: "Caesar’s English II, Lesson XX, Caesar’s Sesquipedalian Story",
      keys: ["stolid", "impassive", "furtive", "palpable", "apprehension", "austere", "abject", "repose", "imperious", "solicitude", "genial", "eccentric", "sagacity", "doleful", "lurid", "ostentatious", "prostrate", "benevolent", "epithet", "magnanimous"],
      lines: [
        { before: "From the top of the wall, the sentry stood ", after: " and " },
        { before: "", after: ", scanning the darkening verdure for signs of " },
        { before: "", after: " motions. A " },
        { before: "", after: " sense of " },
        { before: "", after: " pervaded the " },
        { before: "", after: " encampment, and the " },
        { before: "", after: " confessions of yesterday’s prisoners fooled no one. The soldiers could get little " },
        { before: "", after: ". Caesar’s " },
        { before: "", after: " admonitions and his " },
        { before: "", after: " for the men made him a " },
        { before: "", after: " commander, though his strategies were often " },
        { before: "", after: ". The men failed to understand the subtle " },
        { before: "", after: " of his plans until the battle was already won. A delegation came with " },
        { before: "", after: " countenances and " },
        { before: "", after: ", " },
        { before: "", after: " trinkets, " },
        { before: "", after: " themselves at Caesar’s feet and importuning his ", form: "prostrating" },
        { before: "", after: " response. “Venerable Caesar” was their " },
        { before: "", after: ", and he seemed to respond " },
        { before: "", after: ".", form: "magnanimously" }
      ]
    }
  ];

  const passageActiveKeyGroups = (keys: string[]) => {
    const groups: string[][] = Array.from(
      { length: Math.max(1, Math.ceil(keys.length / PASSAGE_ACTIVE_BLANKS)) },
      () => []
    );
    keys.forEach((key, index) => {
      groups[index % groups.length].push(key);
    });
    return groups;
  };

  const expandedBlueprints = blueprints.flatMap((blueprint) => {
    const groups = passageActiveKeyGroups(blueprint.keys);
    return groups.map((activeKeys, groupIndex) => ({ ...blueprint, activeKeys, groupIndex, groups: groups.length }));
  });

  const maxGroups = Math.max(...expandedBlueprints.map((blueprint) => blueprint.groups));
  const orderedBlueprints = Array.from({ length: maxGroups }).flatMap((_, groupIndex) =>
    expandedBlueprints
      .filter((blueprint) => blueprint.groupIndex === groupIndex)
      .sort((left, right) => {
        const leftWrong = left.keys.reduce((total, key) => total + (stats[key]?.wrong ?? 0), 0);
        const rightWrong = right.keys.reduce((total, key) => total + (stats[key]?.wrong ?? 0), 0);
        return rightWrong - leftWrong;
      })
  );

  const reviewSet = new Set(reviewWordKeys);
  const reviewFirstBlueprints = reviewSet.size
    ? [...orderedBlueprints].sort((left, right) => {
        const leftHits = left.keys.filter((key) => reviewSet.has(key)).length;
        const rightHits = right.keys.filter((key) => reviewSet.has(key)).length;
        return rightHits - leftHits;
      })
    : orderedBlueprints;

  return reviewFirstBlueprints.map((blueprint) => {
    const highErrorKeys = blueprint.keys
      .filter((key) => (stats[key]?.wrong ?? 0) > 0)
      .sort((left, right) => (stats[right]?.wrong ?? 0) - (stats[left]?.wrong ?? 0));
    const activeKeys = new Set(blueprint.activeKeys);
    reviewSet.forEach((key) => {
      if (blueprint.keys.includes(key)) activeKeys.add(key);
    });
    if (reviewSet.size === 1) {
      const reviewKey = [...reviewSet][0];
      activeKeys.clear();
      if (blueprint.keys.includes(reviewKey)) activeKeys.add(reviewKey);
    }
    highErrorKeys.forEach((key) => {
      if (reviewSet.size === 1) return;
      if (activeKeys.has(key) || activeKeys.size >= PASSAGE_ACTIVE_BLANKS) return;
      const keyIndex = blueprint.keys.indexOf(key);
      const adjacentUsed = [...activeKeys].some((activeKey) => Math.abs(blueprint.keys.indexOf(activeKey) - keyIndex) <= 1);
      if (!adjacentUsed) activeKeys.add(key);
    });
    const blanks = blueprint.keys
      .map((key, blankIndex) => {
        const word = wordByKey(allWords, key);
        const line = blueprint.lines[blankIndex] ?? { before: "The best word here is ", after: "." };
        if (!word) return null;
        return {
          word,
          displayWord: line.form ?? word.word,
          before: line.before,
          after: line.after,
          options: makePassageOptions(allWords, word, `${blueprint.title}-${blankIndex}`),
          active: activeKeys.has(key)
        };
      })
      .filter((item): item is PassageChallenge["blanks"][number] => Boolean(item));
    const title = blueprint.groups > 1 ? `${blueprint.title} · Round ${blueprint.groupIndex + 1}` : blueprint.title;
    const scene = blueprint.groups > 1
      ? `${blueprint.scene} Focus set ${blueprint.groupIndex + 1} of ${blueprint.groups}.`
      : blueprint.scene;
    return { title, scene, source: blueprint.source, blanks };
  }).filter((challenge) => challenge.blanks.length >= 4).slice(0, PASSAGE_QUEST_SIZE);
}

function passageBlankNumber(challenge: PassageChallenge, blankIndex: number) {
  return challenge.blanks.slice(0, blankIndex + 1).filter((blank) => blank.active).length;
}

function evaluateSentenceWriting(word: RoundWord, draft: string): SentenceWritingScore {
  const cleanDraft = draft.trim().replace(/\s+/g, " ");
  const tokens = sentenceTokens(cleanDraft);
  if (tokens.length === 0) {
    return {
      score: 0,
      stars: 0,
      gems: 0,
      level: "No Sentence Yet",
      rubric: [
        { label: "Word Use", points: 0, max: 40, stars: 0, note: "Write a sentence with the target word." },
        { label: "Clarity", points: 0, max: 30, stars: 0, note: "A blank answer cannot be read for clarity." },
        { label: "Meaning", points: 0, max: 20, stars: 0, note: "Add context that shows the meaning." },
        { label: "Mechanics", points: 0, max: 10, stars: 0, note: "Start with a complete sentence." }
      ],
      praise: "No sentence was submitted yet.",
      advice: `Write one complete sentence using "${word.word}" to earn stars.`
    };
  }
  const target = getWordStatKey(word.word);
  const normalizedDraft = cleanDraft.toLowerCase();
  const targetForms = targetWordForms(word.word);
  const includesTarget = tokens.some((token) => targetForms.has(token));
  const sentenceLike = /^[A-Z]/.test(cleanDraft) && /[.!?]$/.test(cleanDraft);
  const lengthGood = tokens.length >= 7 && tokens.length <= 26;
  const meaningClues = sentenceTokens(word.definition)
    .filter((token) => token.length > 3 && !["someone", "something", "especially", "existing", "given", "able"].includes(token));
  const synonymClues = word.synonyms.flatMap(sentenceTokens);
  const clueWords = new Set([...meaningClues, ...synonymClues]);
  const clueMatches = tokens.filter((token) => clueWords.has(token)).length;
  const hasContext = clueMatches > 0 || tokens.length >= 10;
  const hasSubjectVerbShape = tokens.length >= 5 && /\b(is|are|was|were|be|became|become|seems|seemed|made|makes|felt|feels|had|has|will|can|could|would|should|did|does|do)\b/i.test(cleanDraft);
  const repeatedTarget = tokens.filter((token) => targetForms.has(token)).length > 1;

  const wordUse = includesTarget ? (hasContext ? 38 : 30) : 0;
  const clarity = lengthGood ? (hasSubjectVerbShape ? 26 : 20) : tokens.length >= 5 ? 16 : 8;
  const style = hasContext ? (repeatedTarget ? 14 : 20) : 10;
  const mechanics = sentenceLike ? 10 : /^[A-Z]/.test(cleanDraft) || /[.!?]$/.test(cleanDraft) ? 6 : 2;
  const score = Math.min(100, wordUse + clarity + style + mechanics);
  const rubric = [
    { label: "Word Use", points: wordUse, max: 40, stars: Math.max(1, Math.ceil((wordUse / 40) * 5)), note: includesTarget ? "Target word appears in the sentence." : "Target word is missing." },
    { label: "Clarity", points: clarity, max: 30, stars: Math.max(1, Math.ceil((clarity / 30) * 5)), note: lengthGood ? "The sentence has a workable length." : "The sentence needs a fuller shape." },
    { label: "Meaning", points: style, max: 20, stars: Math.max(1, Math.ceil((style / 20) * 5)), note: hasContext ? "Context helps reveal the meaning." : "Add stronger context clues." },
    { label: "Mechanics", points: mechanics, max: 10, stars: Math.max(1, Math.ceil((mechanics / 10) * 5)), note: sentenceLike ? "Capitalization and ending punctuation look good." : "Check capitalization and punctuation." }
  ];
  const averageStars = rubric.reduce((total, item) => total + item.stars, 0) / rubric.length;
  const stars = Math.max(1, Math.min(5, Math.round(averageStars)));
  const gems = sentenceWritingGemReward(stars);
  const level = stars === 5 ? "Excellent Forge" : stars === 4 ? "Strong Sentence" : stars === 3 ? "Good Start" : stars === 2 ? "Needs Sharpening" : "Try Again";

  let advice = `Use "${word.word}" in a complete sentence that clearly shows: ${word.definition}.`;
  if (!includesTarget) advice = `Include the exact word "${word.word}" so the reader can see you can use it.`;
  else if (!lengthGood) advice = "Aim for one clear sentence of 7-26 words, not just a phrase.";
  else if (!sentenceLike) advice = "Begin with a capital letter and end with a period, question mark, or exclamation point.";
  else if (!hasContext) advice = `Add context that makes the meaning of "${word.word}" obvious.`;
  else if (repeatedTarget) advice = `Use "${word.word}" once, then let the rest of the sentence show its meaning.`;

  return {
    score,
    stars,
    gems,
    level,
    rubric,
    praise: score >= 80 ? "Your sentence shows real command of the word." : score >= 65 ? "You are close; sharpen the context." : "This can become stronger with one focused revision.",
    advice
  };
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

function playSentenceForgeSound(kind: "context" | "wrong" | "writing-low" | "writing-mid" | "writing-high") {
  if (typeof window === "undefined") return;
  const audioWindow = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0.08;
  master.connect(context.destination);

  const pattern =
    kind === "context" ? [392, 523, 659, 784] :
    kind === "wrong" ? [220, 174, 146] :
    kind === "writing-high" ? [392, 494, 587, 784, 988, 1175] :
    kind === "writing-mid" ? [330, 392, 494, 659] :
    [196, 247, 294];
  const wave: OscillatorType = kind === "wrong" ? "sawtooth" : kind === "writing-high" ? "triangle" : "sine";
  const step = kind === "writing-high" ? 0.075 : 0.1;
  pattern.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, context.currentTime + index * step);
    gain.gain.linearRampToValueAtTime(kind === "wrong" ? 0.04 : 0.06, context.currentTime + index * step + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * step + (kind === "writing-high" ? 0.24 : 0.18));
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(context.currentTime + index * step);
    oscillator.stop(context.currentTime + index * step + 0.28);
  });

  if (kind === "writing-high") {
    [1568, 1975].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = context.currentTime + 0.18 + index * 0.08;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.38);
    });
  }

  window.setTimeout(() => context.close().catch(() => undefined), 1200);
}

export function ClassicWordQuestClient({
  courseId,
  courseSlug,
  words,
  userName,
  initialMode = "whack",
  reviewWordKey,
  reviewWordKeys,
  returnTo,
  reviewCategory = "Classic Words"
}: Props) {
  const router = useRouter();
  const requestedReviewKeys = useMemo(
    () => normalizeReviewKeys([reviewWordKey, ...(reviewWordKeys ?? [])]),
    [reviewWordKey, reviewWordKeys]
  );
  const requestedReviewKeySet = useMemo(() => new Set(requestedReviewKeys), [requestedReviewKeys]);
  const safeReturnTo = useMemo(() => normalizeReturnTo(returnTo), [returnTo]);
  const allWords = useMemo(() => {
    const seen = new Set<string>();
    const uniqueWords: RoundWord[] = [];
    (words as RoundWord[]).forEach((word) => {
      const key = getWordStatKey(word.word);
      if (seen.has(key)) return;
      seen.add(key);
      uniqueWords.push(word);
    });
    if (!requestedReviewKeys.length) return uniqueWords;
    const reviewWords = requestedReviewKeys
      .map((targetKey) => uniqueWords.find((word) => getWordStatKey(word.word) === targetKey))
      .filter((word): word is RoundWord => Boolean(word));
    const reviewSet = new Set(reviewWords.map((word) => getWordStatKey(word.word)));
    return [...reviewWords, ...uniqueWords.filter((word) => !reviewSet.has(getWordStatKey(word.word)))];
  }, [requestedReviewKeys, words]);
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
    requestedReviewKeys.forEach((reviewKey) => {
      const reviewWord = wordByKey(allWords, reviewKey);
      if (reviewWord) addWord(reviewWord);
    });
    highErrorWords.forEach(addWord);
    c1Words.forEach(addWord);
    allWords.forEach(addWord);
    return selected;
  }, [allWords, requestedReviewKeys, wordErrorStats]);
  const initialRound = useMemo(() => makeRound(allWords, [], 0), [allWords]);
  const sentenceChallenges = useMemo(() => makeSentenceChallenges(allWords, wordErrorStats, requestedReviewKeys), [allWords, requestedReviewKeys, wordErrorStats]);
  const passageChallenges = useMemo(() => makePassageChallenges(allWords, wordErrorStats, requestedReviewKeys), [allWords, requestedReviewKeys, wordErrorStats]);
  const [gameMode] = useState<"whack" | "detective" | "sentence" | "passage">(initialMode);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundWords, setRoundWords] = useState<RoundWord[]>(initialRound.roundWords);
  const [nextFreshIndex, setNextFreshIndex] = useState(initialRound.nextFreshIndex);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"good" | "bad" | "">("");
  const [localGems, setLocalGems] = useState(0);
  const [totalGemsThisQuest, setTotalGemsThisQuest] = useState(0);
  const [whackStreak, setWhackStreak] = useState(0);
  const [hitWords, setHitWords] = useState<string[]>([]);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [questReviewWords, setQuestReviewWords] = useState<string[]>([]);
  const [answeredWord, setAnsweredWord] = useState<string | null>(null);
  const { flyingGems, launchGemBurst } = useRewardGemBurst(".word-quest-page");
  const [detectiveIndex, setDetectiveIndex] = useState(0);
  const [detectivePhase, setDetectivePhase] = useState<"choose" | "spell" | "done">("choose");
  const [detectiveFeedback, setDetectiveFeedback] = useState("");
  const [detectiveFeedbackKind, setDetectiveFeedbackKind] = useState<"good" | "bad" | "">("");
  const [detectiveSpelling, setDetectiveSpelling] = useState("");
  const [detectiveAttempts, setDetectiveAttempts] = useState(0);
  const [detectiveGems, setDetectiveGems] = useState(0);
  const [detectiveMisses, setDetectiveMisses] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [sentenceSelection, setSentenceSelection] = useState("");
  const [sentenceSubmitted, setSentenceSubmitted] = useState(false);
  const [sentenceCorrect, setSentenceCorrect] = useState<boolean | null>(null);
  const [sentenceAttempts, setSentenceAttempts] = useState(0);
  const [sentenceGems, setSentenceGems] = useState(0);
  const [sentenceFeedback, setSentenceFeedback] = useState("");
  const [sentenceStage, setSentenceStage] = useState<"fill" | "write">("fill");
  const [sentenceDraft, setSentenceDraft] = useState("");
  const [sentenceWritingScore, setSentenceWritingScore] = useState<SentenceWritingScore | null>(null);
  const [passageIndex, setPassageIndex] = useState(0);
  const [passageSelections, setPassageSelections] = useState<Record<number, string>>({});
  const [passageSubmitted, setPassageSubmitted] = useState(false);
  const [passageAttempts, setPassageAttempts] = useState(0);
  const [passageGems, setPassageGems] = useState(0);
  const [passageFeedback, setPassageFeedback] = useState("");
  const progressLoadedRef = useRef(false);
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
  const whackComboMultiplier = answeredWord ? Math.max(1, whackStreak || 1) : whackStreak + 1;
  const detectiveCurrent = detectiveWords[detectiveIndex];
  const detectiveComplete = detectiveIndex >= detectiveWords.length || detectivePhase === "done";
  const sentenceCurrent = sentenceChallenges[sentenceIndex];
  const sentenceComplete = sentenceIndex >= sentenceChallenges.length;
  const passageCurrent = passageChallenges[passageIndex];
  const passageComplete = passageIndex >= passageChallenges.length;
  const passageWrongIndexes = useMemo(() => {
    if (!passageCurrent || !passageSubmitted) return [];
    return passageCurrent.blanks
      .map((blank, index) => (!blank.active || passageSelections[index] === blank.word.word ? -1 : index))
      .filter((index) => index >= 0);
  }, [passageCurrent, passageSelections, passageSubmitted]);
  const detectiveOptions = useMemo(() => {
    if (!detectiveCurrent) return [];
    return shuffle([
      detectiveCurrent,
      ...shuffle(allWords.filter((word) => word.word !== detectiveCurrent.word)).slice(0, 2)
    ]);
  }, [allWords, detectiveCurrent]);

  function questProgressKey() {
    return `latinfun_classic_word_quest_${courseId}_${userName ?? "guest"}_${gameMode}`;
  }

  function clearQuestProgress() {
    try {
      window.localStorage.removeItem(questProgressKey());
    } catch {
      // Progress persistence is optional.
    }
  }

  useEffect(() => {
    if (progressLoadedRef.current) return;
    progressLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(questProgressKey());
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        roundIndex?: number;
        roundWords?: RoundWord[];
        nextFreshIndex?: number;
        questionIndex?: number;
        whackStreak?: number;
        hitWords?: string[];
        missedWords?: string[];
        questReviewWords?: string[];
        detectiveIndex?: number;
        detectivePhase?: "choose" | "spell" | "done";
        detectiveAttempts?: number;
        detectiveMisses?: string[];
        sentenceIndex?: number;
        sentenceSelection?: string;
        sentenceSubmitted?: boolean;
        sentenceCorrect?: boolean | null;
        sentenceAttempts?: number;
        sentenceStage?: "fill" | "write";
        passageIndex?: number;
        passageSelections?: Record<number, string>;
        passageSubmitted?: boolean;
        passageAttempts?: number;
      };
      if (gameMode === "whack") {
        if (typeof saved.roundIndex === "number") setRoundIndex(clamp(saved.roundIndex, 0, TOTAL_ROUNDS - 1));
        if (Array.isArray(saved.roundWords) && saved.roundWords.length) setRoundWords(saved.roundWords);
        if (typeof saved.nextFreshIndex === "number") setNextFreshIndex(saved.nextFreshIndex);
        if (typeof saved.questionIndex === "number") setQuestionIndex(Math.max(0, saved.questionIndex));
        if (typeof saved.whackStreak === "number") setWhackStreak(saved.whackStreak);
        if (Array.isArray(saved.hitWords)) setHitWords(saved.hitWords);
        if (Array.isArray(saved.missedWords)) setMissedWords(saved.missedWords);
        if (Array.isArray(saved.questReviewWords)) setQuestReviewWords(saved.questReviewWords);
      }
      if (gameMode === "detective") {
        if (typeof saved.detectiveIndex === "number") setDetectiveIndex(Math.max(0, saved.detectiveIndex));
        if (saved.detectivePhase && saved.detectivePhase !== "done") setDetectivePhase(saved.detectivePhase);
        if (typeof saved.detectiveAttempts === "number") setDetectiveAttempts(saved.detectiveAttempts);
        if (Array.isArray(saved.detectiveMisses)) setDetectiveMisses(saved.detectiveMisses);
        setDetectiveSpelling("");
      }
      if (gameMode === "sentence") {
        if (typeof saved.sentenceIndex === "number") setSentenceIndex(Math.max(0, saved.sentenceIndex));
        if (typeof saved.sentenceSelection === "string") setSentenceSelection(saved.sentenceSelection);
        if (typeof saved.sentenceSubmitted === "boolean") setSentenceSubmitted(saved.sentenceSubmitted);
        if (typeof saved.sentenceAttempts === "number") setSentenceAttempts(saved.sentenceAttempts);
        if (typeof saved.sentenceCorrect === "boolean" || saved.sentenceCorrect === null) setSentenceCorrect(saved.sentenceCorrect);
        if (saved.sentenceStage) setSentenceStage(saved.sentenceStage);
        setSentenceDraft("");
        setSentenceWritingScore(null);
      }
      if (gameMode === "passage") {
        if (typeof saved.passageIndex === "number") setPassageIndex(Math.max(0, saved.passageIndex));
        if (saved.passageSelections && typeof saved.passageSelections === "object") setPassageSelections(saved.passageSelections);
        if (typeof saved.passageSubmitted === "boolean") setPassageSubmitted(saved.passageSubmitted);
        if (typeof saved.passageAttempts === "number") setPassageAttempts(saved.passageAttempts);
      }
    } catch {
      clearQuestProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!progressLoadedRef.current) return;
    const isComplete =
      (gameMode === "whack" && questComplete) ||
      (gameMode === "detective" && detectiveComplete) ||
      (gameMode === "sentence" && sentenceComplete) ||
      (gameMode === "passage" && passageComplete);
    if (isComplete) {
      clearQuestProgress();
      return;
    }
    try {
      const progress =
        gameMode === "whack"
          ? { roundIndex, roundWords, nextFreshIndex, questionIndex, whackStreak, hitWords, missedWords, questReviewWords }
          : gameMode === "detective"
            ? { detectiveIndex, detectivePhase, detectiveAttempts, detectiveMisses }
            : gameMode === "sentence"
              ? { sentenceIndex, sentenceSelection, sentenceSubmitted, sentenceCorrect, sentenceAttempts, sentenceStage }
              : { passageIndex, passageSelections, passageSubmitted, passageAttempts };
      window.localStorage.setItem(questProgressKey(), JSON.stringify(progress));
    } catch {
      // Progress persistence is optional.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameMode,
    roundIndex,
    roundWords,
    nextFreshIndex,
    questionIndex,
    whackStreak,
    hitWords,
    missedWords,
    questReviewWords,
    detectiveIndex,
    detectivePhase,
    detectiveAttempts,
    detectiveMisses,
    sentenceIndex,
    sentenceSelection,
    sentenceSubmitted,
    sentenceCorrect,
    sentenceAttempts,
    sentenceStage,
    passageIndex,
    passageSelections,
    passageSubmitted,
    passageAttempts,
    questComplete,
    detectiveComplete,
    sentenceComplete,
    passageComplete
  ]);

  useEffect(() => {
    if (progressLoadedRef.current) return;
    setRoundIndex(0);
    setRoundWords(initialRound.roundWords);
    setNextFreshIndex(initialRound.nextFreshIndex);
    setQuestionIndex(0);
    setLocalGems(0);
    setTotalGemsThisQuest(0);
    setWhackStreak(0);
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

  useEffect(() => {
    if (gameMode !== "detective" || detectivePhase !== "spell") return;
    setDetectiveSpelling("");
  }, [detectiveCurrent?.word, detectivePhase, gameMode]);

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

  async function recordGameMistake(input: {
    category: "Latin Stems" | "Classic Words" | "Analogies & Antonyms" | "Sentence Writing";
    itemKey: string;
    itemLabel: string;
    mistakeType: string;
    sourceModule: string;
    prompt?: string;
    userAnswer?: unknown;
    correctAnswer?: unknown;
  }) {
    await fetch(appPath("/api/mistakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        ...input
      })
    }).catch(() => undefined);
  }

  async function markReviewWordMastered(word: string, category: "Classic Words" | "Sentence Writing" = "Classic Words") {
    const itemKey = getWordStatKey(word);
    if (!requestedReviewKeySet.has(itemKey)) return;
    await fetch(appPath("/api/mistakes"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        category,
        itemKey,
        itemLabel: word
      })
    }).catch(() => undefined);
  }

  function shouldReturnAfterSingleReview(word: string, category: "Classic Words" | "Sentence Writing" = "Classic Words") {
    return Boolean(
      safeReturnTo &&
        category === reviewCategory &&
        requestedReviewKeys.length === 1 &&
        requestedReviewKeySet.has(getWordStatKey(word))
    );
  }

  async function finishReviewWord(word: string, category: "Classic Words" | "Sentence Writing" = "Classic Words", delay = 900) {
    const shouldReturn = shouldReturnAfterSingleReview(word, category);
    await markReviewWordMastered(word, category);
    if (shouldReturn && safeReturnTo) {
      window.setTimeout(() => router.push(safeReturnTo), delay);
    }
    return shouldReturn;
  }

  async function whack(choice: RoundWord, source: HTMLElement | null) {
    if (!current || answeredWord) return;
    const correct = choice.word === current.word;
    setAnsweredWord(choice.word);

    if (correct) {
      recordWordOutcome(current.word, false);
      const nextStreak = whackStreak + 1;
      const gems = nextStreak;
      setWhackStreak(nextStreak);
      setLocalGems((value) => value + gems);
      setTotalGemsThisQuest((value) => value + gems);
      setHitWords((items) => [...items, current.word]);
      setFeedback(nextStreak === 1 ? `Hit! x1 combo · +1 gem` : `Combo x${nextStreak}! +${gems} gems`);
      setFeedbackKind("good");
      playWhackSound(nextStreak >= 5 ? "bonus" : "hit");
      launchGemBurst(gems, source);
      window.setTimeout(() => speakWhackReaction("correct"), 280);
      const shouldReturn = shouldReturnAfterSingleReview(current.word, "Classic Words");
      void finishReviewWord(current.word);
      await applyGems(gems, `word-whack-hit-${roundIndex}-${questionIndex}-${current.word}-${Date.now()}`, `Whack-a-Word hit: ${current.word}`);
      if (shouldReturn) return;
    } else {
      recordWordOutcome(current.word, true);
      void recordGameMistake({
        category: "Classic Words",
        itemKey: getWordStatKey(current.word),
        itemLabel: current.word,
        mistakeType: "Definition",
        sourceModule: "Whack-a-Word",
        prompt: current.definition,
        userAnswer: choice.word,
        correctAnswer: current.word
      });
      setLocalGems((value) => Math.max(0, value - 1));
      setWhackStreak(0);
      setMissedWords((items) => Array.from(new Set([...items, current.word])));
      setQuestReviewWords((items) => Array.from(new Set([...items, current.word])));
      setFeedback(`Miss! -1 gem. Listen again next time.`);
      setFeedbackKind("bad");
      playWhackSound("miss");
      window.setTimeout(() => speakWhackReaction("wrong"), 280);
      await applyGems(-1, `word-whack-miss-${current.word}-${Date.now()}`, `Whack-a-Word miss: ${current.word}`);
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
    setWhackStreak(0);
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
    setWhackStreak(0);
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
    void recordGameMistake({
      category: "Classic Words",
      itemKey: getWordStatKey(detectiveCurrent.word),
      itemLabel: detectiveCurrent.word,
      mistakeType: "Classic Vocabulary",
      sourceModule: "Word Detective",
      prompt: detectiveClue(detectiveCurrent, detectiveIndex),
      userAnswer: choice.word,
      correctAnswer: detectiveCurrent.word
    });
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
      launchGemBurst(gems);
      const shouldReturn = shouldReturnAfterSingleReview(detectiveCurrent.word, "Classic Words");
      void finishReviewWord(detectiveCurrent.word);
      await applyGems(gems, `word-detective-${detectiveCurrent.word}-${detectiveIndex}`, `Word Detective solved: ${detectiveCurrent.word}`);
      if (shouldReturn) return;
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
    void recordGameMistake({
      category: "Classic Words",
      itemKey: getWordStatKey(detectiveCurrent.word),
      itemLabel: detectiveCurrent.word,
      mistakeType: "Spelling",
      sourceModule: "Word Detective",
      prompt: `Spell the selected word: ${detectiveCurrent.definition}`,
      userAnswer: detectiveSpelling,
      correctAnswer: detectiveCurrent.word
    });
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

  async function submitSentenceForge() {
    if (!sentenceCurrent || sentenceComplete) return;
    if (!sentenceSelection) {
      setSentenceFeedback("Choose one word to forge the sentence.");
      setSentenceSubmitted(false);
      setSentenceCorrect(null);
      return;
    }
    const correct = sentenceSelection === sentenceCurrent.word.word;
    setSentenceSubmitted(true);
    setSentenceCorrect(correct);

    if (correct) {
      recordWordOutcome(sentenceCurrent.word.word, false);
      const gems = sentenceAttempts === 0 ? 4 : 2;
      setSentenceGems((value) => value + gems);
      setSentenceFeedback(`Context forged. +${gems} gems.`);
      playSentenceForgeSound("context");
      launchGemBurst(gems);
      const shouldReturn = shouldReturnAfterSingleReview(sentenceCurrent.word.word, "Classic Words");
      void finishReviewWord(sentenceCurrent.word.word);
      await applyGems(gems, `sentence-forge-${sentenceCurrent.word.word}-${sentenceIndex}`, `Sentence Forge solved: ${sentenceCurrent.word.word}`);
      if (shouldReturn) return;
      return;
    }

    recordWordOutcome(sentenceCurrent.word.word, true);
    void recordGameMistake({
      category: "Classic Words",
      itemKey: getWordStatKey(sentenceCurrent.word.word),
      itemLabel: sentenceCurrent.word.word,
      mistakeType: "Literary Context",
      sourceModule: "Sentence Forge",
      prompt: sentenceCurrent.sentence,
      userAnswer: sentenceSelection,
      correctAnswer: sentenceCurrent.word.word
    });
    setSentenceAttempts((value) => value + 1);
    setSentenceFeedback(`Meaning clue: ${sentenceCurrent.word.definition}`);
    playSentenceForgeSound("wrong");
  }

  function trySentenceAgain() {
    setSentenceSelection("");
    setSentenceSubmitted(false);
    setSentenceCorrect(null);
    setSentenceFeedback("");
  }

  function nextSentence() {
    setSentenceIndex((value) => value + 1);
    setSentenceSelection("");
    setSentenceSubmitted(false);
    setSentenceCorrect(null);
    setSentenceAttempts(0);
    setSentenceFeedback("");
    setSentenceStage("fill");
    setSentenceDraft("");
    setSentenceWritingScore(null);
  }

  function restartSentenceForge() {
    setSentenceIndex(0);
    setSentenceSelection("");
    setSentenceSubmitted(false);
    setSentenceCorrect(null);
    setSentenceAttempts(0);
    setSentenceGems(0);
    setSentenceFeedback("");
    setSentenceStage("fill");
    setSentenceDraft("");
    setSentenceWritingScore(null);
  }

  function handleSentenceKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter") return;
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
    event.preventDefault();
    if (sentenceStage === "write") {
      if (sentenceWritingScore) nextSentence();
      return;
    }
    if (sentenceSubmitted && sentenceCorrect) {
      setSentenceStage("write");
      return;
    }
    if (sentenceSubmitted && sentenceCorrect === false) {
      trySentenceAgain();
      return;
    }
    void submitSentenceForge();
  }

  async function submitSentenceWriting() {
    if (!sentenceCurrent || sentenceStage !== "write" || sentenceWritingScore) return;
    const score = evaluateSentenceWriting(sentenceCurrent.word, sentenceDraft);
    setSentenceWritingScore(score);
    const wordUseStars = score.rubric.find((item) => item.label === "Word Use")?.stars ?? score.stars;
    if (score.stars <= 3 || wordUseStars <= 2) {
      void recordGameMistake({
        category: "Sentence Writing",
        itemKey: getWordStatKey(sentenceCurrent.word.word),
        itemLabel: sentenceCurrent.word.word,
        mistakeType: wordUseStars <= 2 ? "Word Use" : "Low Score",
        sourceModule: "Sentence Forge",
        prompt: `Write one original sentence using "${sentenceCurrent.word.word}".`,
        userAnswer: sentenceDraft,
        correctAnswer: sentenceCurrent.word.definition
      });
    }
    if (score.stars >= 4 && wordUseStars >= 4) {
      void finishReviewWord(sentenceCurrent.word.word, "Sentence Writing", 1400);
    }
    if (score.gems > 0) {
      setSentenceGems((value) => value + score.gems);
      playSentenceForgeSound(score.stars >= 5 ? "writing-high" : score.stars >= 3 ? "writing-mid" : "writing-low");
      launchGemBurst(score.gems);
      await applyGems(score.gems, `sentence-forge-writing-${sentenceCurrent.word.word}-${sentenceIndex}`, `Sentence Forge writing: ${sentenceCurrent.word.word}`);
    } else {
      playSentenceForgeSound("wrong");
    }
  }

  async function submitPassageQuest() {
    if (!passageCurrent || passageComplete) return;
    const activeBlanks = passageCurrent.blanks.filter((blank) => blank.active);
    const answeredCount = passageCurrent.blanks.filter((blank, index) => blank.active && Boolean(passageSelections[index])).length;
    if (answeredCount < activeBlanks.length) {
      setPassageFeedback(`Choose a word for all ${activeBlanks.length} blanks.`);
      setPassageSubmitted(false);
      return;
    }

    setPassageSubmitted(true);
    const wrongIndexes = passageCurrent.blanks
      .map((blank, index) => (!blank.active || passageSelections[index] === blank.word.word ? -1 : index))
      .filter((index) => index >= 0);

    if (wrongIndexes.length === 0) {
      passageCurrent.blanks.filter((blank) => blank.active).forEach((blank) => {
        recordWordOutcome(blank.word.word, false);
        void finishReviewWord(blank.word.word, "Classic Words", 1200);
      });
      const gems = passageAttempts === 0 ? 18 : passageAttempts === 1 ? 10 : 6;
      setPassageGems((value) => value + gems);
      setPassageFeedback(`Passage complete. +${gems} gems.`);
      playSentenceForgeSound(gems >= 18 ? "writing-high" : "context");
      launchGemBurst(gems);
      await applyGems(gems, `passage-quest-${passageCurrent.title}-${passageIndex}`, `Passage Quest solved: ${passageCurrent.title}`);
      return;
    }

    wrongIndexes.forEach((index) => {
      const blank = passageCurrent.blanks[index];
      recordWordOutcome(blank.word.word, true);
      void recordGameMistake({
        category: "Classic Words",
        itemKey: getWordStatKey(blank.word.word),
        itemLabel: blank.word.word,
        mistakeType: "Paragraph Context",
        sourceModule: "Passage Quest",
        prompt: `${passageCurrent.title}: blank ${passageBlankNumber(passageCurrent, index)}`,
        userAnswer: passageSelections[index],
        correctAnswer: blank.word.definition
      });
    });
    setPassageAttempts((value) => value + 1);
    setPassageFeedback(`${wrongIndexes.length} blank${wrongIndexes.length === 1 ? "" : "s"} need another look. Use the meaning clues below.`);
    playSentenceForgeSound("wrong");
  }

  function revisePassageQuest() {
    setPassageSubmitted(false);
    setPassageFeedback("");
  }

  function nextPassageQuest() {
    setPassageIndex((value) => value + 1);
    setPassageSelections({});
    setPassageSubmitted(false);
    setPassageAttempts(0);
    setPassageFeedback("");
  }

  function restartPassageQuest() {
    setPassageIndex(0);
    setPassageSelections({});
    setPassageSubmitted(false);
    setPassageAttempts(0);
    setPassageGems(0);
    setPassageFeedback("");
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
          <Link className={gameMode === "sentence" ? "active" : ""} href={`/courses/${courseSlug}/classic-word-quest/sentence-forge`}>Sentence Forge</Link>
          <Link className={gameMode === "passage" ? "active" : ""} href={`/courses/${courseSlug}/classic-word-quest/passage-quest`}>Passage Quest</Link>
        </div>
        {gameMode === "detective" ? (
          <div className="detective-hero">
            <span>Case 01 · Confidential</span>
            <h1>Word Detective</h1>
            <p>A letter has arrived. Open the clue, identify the word, then spell the evidence.</p>
          </div>
        ) : gameMode === "passage" ? (
          <div className="passage-quest-hero">
            <span>Paragraph Lab</span>
            <h1>Passage Quest</h1>
            <p>Use context across a whole passage. Choose the words that make the paragraph work.</p>
          </div>
        ) : gameMode === "sentence" ? (
          <div className="sentence-forge-hero">
            <span>Context Lab</span>
            <h1>Sentence Forge</h1>
            <p>Read the literary clue. Choose the classic word that completes the sentence.</p>
          </div>
        ) : (
          <>
            <h1>Whack-a-Word</h1>
            <p>Round {roundIndex + 1} / {TOTAL_ROUNDS} · Listen fast. Whack the right classic word.</p>
          </>
        )}
        <div className={`word-quest-stats ${gameMode === "detective" ? "detective-case-stats" : gameMode === "sentence" || gameMode === "passage" ? "sentence-forge-stats" : ""}`}>
          {gameMode === "detective" ? (
            <>
              <div><em>Case</em><strong>{detectiveComplete ? detectiveWords.length : detectiveIndex + 1}</strong><span>/ {detectiveWords.length}</span></div>
              <div ref={gemCounterRef}><em>Gems</em><strong>{detectiveGems}</strong><span>evidence reward</span></div>
              <div><em>File</em><strong>{detectiveMisses.length}</strong><span>review words</span></div>
              <div><em>Stage</em><strong>{detectivePhase === "spell" ? "SPELL" : "CLUE"}</strong><span>current step</span></div>
            </>
          ) : gameMode === "passage" ? (
            <>
              <div><em>Passage</em><strong>{passageComplete ? passageChallenges.length : passageIndex + 1}</strong><span>/ {passageChallenges.length}</span></div>
              <div ref={gemCounterRef}><em>Gems</em><strong>{passageGems}</strong><span>paragraph reward</span></div>
              <div><em>Blanks</em><strong>{passageCurrent?.blanks.filter((blank) => blank.active).length ?? 0}</strong><span>classic words</span></div>
              <div><em>Attempt</em><strong>{passageAttempts + 1}</strong><span>current passage</span></div>
            </>
          ) : gameMode === "sentence" ? (
            <>
              <div><em>Sentence</em><strong>{sentenceComplete ? sentenceChallenges.length : sentenceIndex + 1}</strong><span>/ {sentenceChallenges.length}</span></div>
              <div ref={gemCounterRef}><em>Gems</em><strong>{sentenceGems}</strong><span>context reward</span></div>
              <div><em>Attempt</em><strong>{sentenceAttempts + 1}</strong><span>current sentence</span></div>
              <div><em>Stage</em><strong>{sentenceStage === "write" ? "WRITE" : "FORGE"}</strong><span>{sentenceStage === "write" ? "make a sentence" : "fill the blank"}</span></div>
            </>
          ) : (
            <>
              <div><strong>{complete ? roundWords.length : questionIndex + 1}</strong><span>/ {roundWords.length}</span></div>
              <div ref={gemCounterRef}><strong>{localGems}</strong><span>gems this run</span></div>
              <div><strong>x{whackComboMultiplier}</strong><span>combo reward</span></div>
              <div><strong>{missedWords.length}</strong><span>review words</span></div>
            </>
          )}
        </div>
        {requestedReviewKeys.length > 1 ? (
          <div className="word-quest-review-banner">
            Mistake Review · {requestedReviewKeys.length} words
          </div>
        ) : null}
      </section>
      <RewardGemBurst gems={flyingGems} />

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
                  autoComplete="off"
                  autoCorrect="off"
                  id="detective-spelling"
                  key={`detective-spelling-${detectiveCurrent.word}`}
                  name={`detective-spelling-${getWordStatKey(detectiveCurrent.word)}`}
                  onChange={(event) => setDetectiveSpelling(event.target.value)}
                  placeholder="type the full word"
                  spellCheck={false}
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
      ) : gameMode === "passage" ? (
        !passageComplete && passageCurrent ? (
          <section className="passage-quest-board">
            <article className="passage-quest-card">
              <span>Passage {passageIndex + 1}</span>
              <h2>{passageCurrent.title}</h2>
              <p>{passageCurrent.scene}</p>
              <small>{passageCurrent.source}</small>
              <div className="passage-quest-text" aria-label="Passage with word choices">
                {passageCurrent.blanks.map((blank, index) => {
                  const selected = passageSelections[index];
                  const isWrong = passageSubmitted && selected !== blank.word.word;
                  const isCorrect = passageSubmitted && selected === blank.word.word;
                  return (
                    <span className={`passage-line ${!blank.active ? "plain" : isWrong ? "wrong" : isCorrect ? "correct" : ""}`} key={`${blank.word.word}-${index}`}>
                      {blank.active ? <b>{passageBlankNumber(passageCurrent, index)}</b> : null}
                      <span>{blank.before}</span>
                      {blank.active ? (
                        <select
                          aria-label={`Blank ${passageBlankNumber(passageCurrent, index)}`}
                          disabled={passageSubmitted && passageWrongIndexes.length === 0}
                          onChange={(event) => {
                            setPassageSelections((currentSelections) => ({ ...currentSelections, [index]: event.target.value }));
                          }}
                          value={selected ?? ""}
                        >
                          <option value="">choose</option>
                          {blank.options.map((option) => (
                            <option key={`${option.lesson}-${option.word}`} value={option.word}>
                              {option.word}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <strong className="passage-inline-word">{blank.displayWord}</strong>
                      )}
                      <span>{blank.after}</span>
                    </span>
                  );
                })}
              </div>
            </article>

            {passageSubmitted && passageWrongIndexes.length > 0 ? (
              <div className="passage-clue-panel">
                {passageWrongIndexes.map((index) => {
                  const blank = passageCurrent.blanks[index];
                  return (
                    <div key={`${blank.word.word}-clue`}>
                      <strong>Blank {passageBlankNumber(passageCurrent, index)}</strong>
                      <span>{blank.word.definition}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {passageFeedback ? (
              <div className={`sentence-forge-feedback ${passageSubmitted && passageWrongIndexes.length === 0 ? "good" : passageSubmitted ? "bad" : ""}`}>
                {passageFeedback}
              </div>
            ) : null}

            <div className="sentence-forge-actions">
              {passageSubmitted && passageWrongIndexes.length === 0 ? (
                <button className="battle-main-button" onClick={nextPassageQuest} type="button">
                  Next Passage
                </button>
              ) : passageSubmitted ? (
                <button className="battle-main-button sentence-retry" onClick={revisePassageQuest} type="button">
                  Revise Passage
                </button>
              ) : (
                <button className="battle-main-button" onClick={submitPassageQuest} type="button">
                  Submit Passage
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="whack-result sentence-forge-result">
            <h2>Passages Complete!</h2>
            <p>You completed {passageChallenges.length} paragraph quests and earned {passageGems} gems in this run.</p>
            <button className="battle-main-button" onClick={restartPassageQuest} type="button">Play Again</button>
          </section>
        )
      ) : gameMode === "sentence" ? (
        !sentenceComplete && sentenceCurrent ? (
          <section className="sentence-forge-board" onKeyDownCapture={handleSentenceKeyDown} tabIndex={-1}>
            <div className="sentence-forge-anvil" aria-hidden="true">⚒</div>
            <article className="sentence-forge-card">
              <span>
                {sentenceCurrent.source.kind === "source"
                  ? "Literary Context"
                  : sentenceCurrent.source.kind === "phrase"
                    ? "Original Source Phrase"
                    : "Practice Sentence"}
              </span>
              <p>{sentenceCurrent.sentence}</p>
              {sentenceCurrent.contextNote ? <small>{sentenceCurrent.contextNote}</small> : null}
              <em>
                <cite>《{sentenceCurrent.source.work}》</cite>
                <i>{sentenceCurrent.source.author}</i>
              </em>
            </article>
            {sentenceStage === "fill" ? (
              <>
                <div className="sentence-forge-options" role="radiogroup" aria-label="Choose the word that completes the sentence">
                  {sentenceCurrent.options.map((choice) => {
                    const selected = sentenceSelection === choice.word;
                    const wrong = sentenceSubmitted && selected && !sentenceCorrect;
                    const correct = sentenceSubmitted && selected && sentenceCorrect;
                    return (
                      <button
                        className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                        key={`${choice.lesson}-${choice.word}-${choice.definition}`}
                        onClick={() => {
                          if (sentenceSubmitted && sentenceCorrect) return;
                          setSentenceSelection(choice.word);
                          if (sentenceSubmitted) {
                            setSentenceSubmitted(false);
                            setSentenceCorrect(null);
                            setSentenceFeedback("");
                          }
                        }}
                        type="button"
                      >
                        <strong>{choice.word}</strong>
                        <span>{choice.partOfSpeech}</span>
                      </button>
                    );
                  })}
                </div>
                {sentenceFeedback ? (
                  <div className={`sentence-forge-feedback ${sentenceCorrect ? "good" : sentenceCorrect === false ? "bad" : ""}`}>
                    {sentenceFeedback}
                  </div>
                ) : null}
                <div className="sentence-forge-actions">
                  {sentenceSubmitted && sentenceCorrect ? (
                    <button className="battle-main-button" onClick={() => setSentenceStage("write")} type="button">Write Your Sentence</button>
                  ) : sentenceSubmitted && sentenceCorrect === false ? (
                    <button className="battle-main-button sentence-retry" onClick={trySentenceAgain} type="button">Try Again</button>
                  ) : (
                    <button className="battle-main-button" onClick={submitSentenceForge} type="button">Submit</button>
                  )}
                </div>
              </>
            ) : (
              <section className="sentence-writing-panel">
                <div className="sentence-writing-target">
                  <span>Target Word</span>
                  <strong>{sentenceCurrent.word.word}</strong>
                  <p>{sentenceCurrent.word.definition}</p>
                </div>
                <div className="sentence-writing-reward">
                  <span>Writing reward doubles with every star</span>
                  <div>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <b key={star}>
                        <span>{"★".repeat(star)}</span>
                        <em>
                          +{sentenceWritingGemReward(star)}
                          <i aria-hidden="true" />
                        </em>
                      </b>
                    ))}
                  </div>
                </div>
                <label htmlFor="sentence-writing-input">Write one original sentence using this word.</label>
                <textarea
                  autoComplete="off"
                  autoCorrect="off"
                  id="sentence-writing-input"
                  key={`sentence-writing-${sentenceCurrent.word.word}`}
                  name={`sentence-writing-${getWordStatKey(sentenceCurrent.word.word)}`}
                  onChange={(event) => {
                    setSentenceDraft(event.target.value);
                    if (sentenceWritingScore) setSentenceWritingScore(null);
                  }}
                  placeholder={`Example idea: Use "${sentenceCurrent.word.word}" naturally in a complete sentence.`}
                  spellCheck={false}
                  value={sentenceDraft}
                />
                {sentenceWritingScore ? (
                  <div className="sentence-score-card">
                    <div className="sentence-score-main">
                      <strong aria-label={`${sentenceWritingScore.stars} out of 5 stars`}>
                        {"★".repeat(sentenceWritingScore.stars)}
                        {"☆".repeat(5 - sentenceWritingScore.stars)}
                      </strong>
                      <span>{sentenceWritingScore.level}</span>
                      <em className="sentence-gem-award">
                        +{sentenceWritingScore.gems}
                        <i aria-hidden="true" />
                        <small>writing multiplier</small>
                      </em>
                    </div>
                    <p>{sentenceWritingScore.praise}</p>
                    <div className="sentence-score-advice">
                      <b>Coach note</b>
                      <span>{sentenceWritingScore.advice}</span>
                    </div>
                    <ul>
                      {sentenceWritingScore.rubric.map((item) => (
                        <li key={item.label}>
                          <b>{item.label}</b>
                          <span className="sentence-rubric-stars" aria-label={`${item.stars} out of 5 stars`}>
                            <i>{"★".repeat(item.stars)}</i>
                            <em>{"★".repeat(5 - item.stars)}</em>
                            <small>{item.stars}/5</small>
                          </span>
                          <small>{item.note}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="sentence-forge-actions">
                  {sentenceWritingScore ? (
                    <button className="battle-main-button" onClick={nextSentence} type="button">Next Sentence</button>
                  ) : (
                    <button className="battle-main-button" onClick={submitSentenceWriting} type="button">Score My Sentence</button>
                  )}
                </div>
              </section>
            )}
          </section>
        ) : (
          <section className="whack-result sentence-forge-result">
            <h2>Forge Complete!</h2>
            <p>You completed {sentenceChallenges.length} context sentences and earned {sentenceGems} gems in this run.</p>
            <button className="battle-main-button" onClick={restartSentenceForge} type="button">Play Again</button>
          </section>
        )
      ) : !complete && current ? (
        <section className="whack-board">
          <div className="whack-prompt">
            <button className="whack-speaker" onClick={() => speakWord(current.word)} type="button">🔊 Replay</button>
            <span>Listen, then strike the matching word.</span>
          </div>

          <div className={`whack-feedback ${feedbackKind}`}>{feedback}</div>
          <div className={`whack-combo-meter ${whackComboMultiplier > 1 ? "active" : ""}`}>
            <span>Combo</span>
            <strong>x{whackComboMultiplier}</strong>
          </div>

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
