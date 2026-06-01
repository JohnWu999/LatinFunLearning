"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RewardGemBurst, useRewardGemBurst } from "@/components/reward-gem-burst";
import { fetchProgressState, saveProgressState } from "@/lib/client-progress-state";
import {
  playGemSparkle,
  playKidsCombo,
  playKidsComplete,
  playKidsCorrect,
  playKidsHint,
  playKidsWrong,
  speakGameFeedback
} from "@/lib/sound-effects";

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
  userId: string;
  userName: string;
  stems: Stem[];
  levels: GameLevel[];
  buildQuestions: BuildQuestion[];
};

type Screen = "select" | "root-match-select" | "jeopardy" | "build-word" | "boss" | "game" | "result";
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
type BuildWordFamilyWord = { id: string; word: string; answer: string[]; meaning: string };
type BuildWordChallenge = {
  id: string;
  label: string;
  warmup: { answer: string; parts: string[]; meaning: string; success: string };
  familyWords: BuildWordFamilyWord[];
  familyTiles: BuildWordPart[];
};
type BuildWordMap = {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  className: string;
  stems: { id: string; label: string; status: string; detail: string }[];
};
type BuildWordFamilyAnswer = Record<string, BuildWordPart[]>;
type BossStageId = "recall" | "forge" | "context" | "passage";
type BossContextItem = { id: string; sentence: string; answer: string; options: string[]; clue: string };
type BossPassageBlank = { id: string; answer: string; definition: string; options: string[] };
type BossLoopContent = { contextItems: BossContextItem[]; passageText: string[]; passageBlanks: BossPassageBlank[] };
type SavedBattleSession = {
  activeLevel: GameLevel;
  questions: GameQuestion[];
  run: typeof emptyRun;
  answer?: string;
  wrongMode: boolean;
  timeLeft: number;
  matchedPairs: Record<string, boolean>;
  savedAt: number;
};
type RewardPayload = { data?: { gems?: number; rank?: number | null; awarded?: number; duplicate?: boolean } };

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

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

const buildWordChallenges: Record<string, BuildWordChallenge> = {
  com: {
    id: "com",
    label: "com",
    warmup: {
      answer: "commandeer",
      parts: ["mand", "eer", "com"],
      meaning: "to officially take control of something",
      success: "Recte! You built commandeer."
    },
    familyWords: [
      { id: "common", word: "common", answer: ["com", "mon"], meaning: "shared by two or more people" },
      { id: "communicate", word: "communicate", answer: ["com", "mun", "icate"], meaning: "to share information, thoughts, or feelings" },
      { id: "commute", word: "commute", answer: ["com", "mute"], meaning: "to travel regularly between home and school or work" }
    ],
    familyTiles: [
      { id: "com-1", label: "com" },
      { id: "mon-1", label: "mon" },
      { id: "mute-1", label: "mute" },
      { id: "com-2", label: "com" },
      { id: "icate-1", label: "icate" },
      { id: "mun-1", label: "mun" },
      { id: "com-3", label: "com" }
    ]
  },
  intra: {
    id: "intra",
    label: "intra",
    warmup: {
      answer: "intramural",
      parts: ["mural", "intra"],
      meaning: "happening within an institution, especially a school",
      success: "Recte! You built intramural."
    },
    familyWords: [
      { id: "intracellular", word: "intracellular", answer: ["intra", "cell", "ular"], meaning: "located or happening within a cell" },
      { id: "intravenous", word: "intravenous", answer: ["intra", "ven", "ous"], meaning: "going within a vein" },
      { id: "intrastate", word: "intrastate", answer: ["intra", "state"], meaning: "within one state" }
    ],
    familyTiles: [
      { id: "intra-1", label: "intra" },
      { id: "cell-1", label: "cell" },
      { id: "ular-1", label: "ular" },
      { id: "intra-2", label: "intra" },
      { id: "ven-1", label: "ven" },
      { id: "ous-1", label: "ous" },
      { id: "intra-3", label: "intra" },
      { id: "state-1", label: "state" }
    ]
  },
  cent: {
    id: "cent",
    label: "cent",
    warmup: {
      answer: "centennial",
      parts: ["ial", "cent", "enn"],
      meaning: "related to a one-hundredth anniversary",
      success: "Recte! You built centennial."
    },
    familyWords: [
      { id: "century", word: "century", answer: ["cent", "ury"], meaning: "a period of one hundred years" },
      { id: "centimeter", word: "centimeter", answer: ["centi", "meter"], meaning: "one hundredth of a meter" },
      { id: "centurion", word: "centurion", answer: ["cent", "urion"], meaning: "a Roman officer connected with one hundred soldiers" }
    ],
    familyTiles: [
      { id: "cent-1", label: "cent" },
      { id: "ury-1", label: "ury" },
      { id: "centi-1", label: "centi" },
      { id: "meter-1", label: "meter" },
      { id: "cent-2", label: "cent" },
      { id: "urion-1", label: "urion" }
    ]
  },
  ad: {
    id: "ad",
    label: "ad",
    warmup: {
      answer: "adhere",
      parts: ["here", "ad"],
      meaning: "to stick to something",
      success: "Recte! You built adhere."
    },
    familyWords: [
      { id: "adapt", word: "adapt", answer: ["ad", "apt"], meaning: "to adjust to a situation" },
      { id: "advocate", word: "advocate", answer: ["ad", "voc", "ate"], meaning: "to speak in support of a cause" },
      { id: "adjacent", word: "adjacent", answer: ["ad", "jac", "ent"], meaning: "next to or very near something" }
    ],
    familyTiles: [
      { id: "ad-1", label: "ad" },
      { id: "apt-1", label: "apt" },
      { id: "ad-2", label: "ad" },
      { id: "voc-1", label: "voc" },
      { id: "ate-1", label: "ate" },
      { id: "ad-3", label: "ad" },
      { id: "jac-1", label: "jac" },
      { id: "ent-1", label: "ent" }
    ]
  },
  fer: {
    id: "fer",
    label: "fer",
    warmup: {
      answer: "infer",
      parts: ["fer", "in"],
      meaning: "to conclude from evidence",
      success: "Recte! You built infer."
    },
    familyWords: [
      { id: "transfer", word: "transfer", answer: ["trans", "fer"], meaning: "to carry or move something across" },
      { id: "aquifer", word: "aquifer", answer: ["aqui", "fer"], meaning: "an underground layer that carries water" },
      { id: "conifer", word: "conifer", answer: ["coni", "fer"], meaning: "a tree that carries cones" }
    ],
    familyTiles: [
      { id: "trans-1", label: "trans" },
      { id: "fer-1", label: "fer" },
      { id: "aqui-1", label: "aqui" },
      { id: "fer-2", label: "fer" },
      { id: "coni-1", label: "coni" },
      { id: "fer-3", label: "fer" }
    ]
  },
  vita: {
    id: "vita",
    label: "vita",
    warmup: {
      answer: "vitality",
      parts: ["ity", "vita", "l"],
      meaning: "strength, energy",
      success: "Recte! You built vitality."
    },
    familyWords: [
      { id: "vital", word: "vital", answer: ["vita", "l"], meaning: "full of life; very important" },
      { id: "vitamin", word: "vitamin", answer: ["vita", "min"], meaning: "a substance needed to keep living things healthy" },
      { id: "revitalize", word: "revitalize", answer: ["re", "vita", "lize"], meaning: "to bring energy or life back to something" }
    ],
    familyTiles: [
      { id: "vita-1", label: "vita" },
      { id: "l-1", label: "l" },
      { id: "vita-2", label: "vita" },
      { id: "min-1", label: "min" },
      { id: "re-1", label: "re" },
      { id: "vita-3", label: "vita" },
      { id: "lize-1", label: "lize" }
    ]
  },
  vid: {
    id: "vid",
    label: "vid",
    warmup: {
      answer: "videlicet",
      parts: ["elicet", "vid"],
      meaning: "namely; that is; for example",
      success: "Recte! You built videlicet."
    },
    familyWords: [
      { id: "video", word: "video", answer: ["vid", "eo"], meaning: "moving images that we can look at" },
      { id: "evidence", word: "evidence", answer: ["e", "vid", "ence"], meaning: "facts brought out for people to look at and judge" },
      { id: "provide", word: "provide", answer: ["pro", "vid", "e"], meaning: "to supply; to look ahead and prepare" }
    ],
    familyTiles: [
      { id: "vid-1", label: "vid" },
      { id: "eo-1", label: "eo" },
      { id: "e-1", label: "e" },
      { id: "vid-2", label: "vid" },
      { id: "ence-1", label: "ence" },
      { id: "pro-1", label: "pro" },
      { id: "vid-3", label: "vid" },
      { id: "e-2", label: "e" }
    ]
  },
  pater: {
    id: "pater",
    label: "pater",
    warmup: {
      answer: "paternal",
      parts: ["nal", "pater"],
      meaning: "of the father",
      success: "Recte! You built paternal."
    },
    familyWords: [
      { id: "paternity", word: "paternity", answer: ["pater", "nity"], meaning: "fatherhood; the state of being a father" },
      { id: "patriarch", word: "patriarch", answer: ["patri", "arch"], meaning: "the male head of a family or group" },
      { id: "expatriate", word: "expatriate", answer: ["ex", "patri", "ate"], meaning: "a person living outside the fatherland" }
    ],
    familyTiles: [
      { id: "pater-1", label: "pater" },
      { id: "nity-1", label: "nity" },
      { id: "patri-1", label: "patri" },
      { id: "arch-1", label: "arch" },
      { id: "ex-1", label: "ex" },
      { id: "patri-2", label: "patri" },
      { id: "ate-1", label: "ate" }
    ]
  },
  matri: {
    id: "matri",
    label: "matri",
    warmup: {
      answer: "matriarch",
      parts: ["arch", "matri"],
      meaning: "a female head of a family or tribe",
      success: "Recte! You built matriarch."
    },
    familyWords: [
      { id: "maternal", word: "maternal", answer: ["mater", "nal"], meaning: "motherly; related to a mother" },
      { id: "matrilineal", word: "matrilineal", answer: ["matri", "lineal"], meaning: "traced through the mother's family line" },
      { id: "matrimony", word: "matrimony", answer: ["matri", "mony"], meaning: "marriage" }
    ],
    familyTiles: [
      { id: "mater-1", label: "mater" },
      { id: "nal-1", label: "nal" },
      { id: "matri-1", label: "matri" },
      { id: "lineal-1", label: "lineal" },
      { id: "matri-2", label: "matri" },
      { id: "mony-1", label: "mony" }
    ]
  },
  pop: {
    id: "pop",
    label: "pop",
    warmup: {
      answer: "populous",
      parts: ["ous", "popul"],
      meaning: "densely populated",
      success: "Recte! You built populous."
    },
    familyWords: [
      { id: "popular", word: "popular", answer: ["popul", "ar"], meaning: "liked by many people" },
      { id: "population", word: "population", answer: ["popul", "ation"], meaning: "the people living in a place" },
      { id: "populace", word: "populace", answer: ["popul", "ace"], meaning: "the ordinary people living in a place" }
    ],
    familyTiles: [
      { id: "popul-1", label: "popul" },
      { id: "ar-1", label: "ar" },
      { id: "popul-2", label: "popul" },
      { id: "ation-1", label: "ation" },
      { id: "popul-3", label: "popul" },
      { id: "ace-1", label: "ace" }
    ]
  },
  loco: {
    id: "loco",
    label: "loco",
    warmup: {
      answer: "localized",
      parts: ["ized", "local"],
      meaning: "restricted to a place",
      success: "Recte! You built localized."
    },
    familyWords: [
      { id: "locomotive", word: "locomotive", answer: ["loco", "motive"], meaning: "a vehicle that moves from place to place" },
      { id: "location", word: "location", answer: ["loc", "ation"], meaning: "a place or position" },
      { id: "dislocate", word: "dislocate", answer: ["dis", "loc", "ate"], meaning: "to put something out of place" }
    ],
    familyTiles: [
      { id: "loco-1", label: "loco" },
      { id: "motive-1", label: "motive" },
      { id: "loc-1", label: "loc" },
      { id: "ation-1", label: "ation" },
      { id: "dis-1", label: "dis" },
      { id: "loc-2", label: "loc" },
      { id: "ate-1", label: "ate" }
    ]
  },
  sur: {
    id: "sur",
    label: "sur",
    warmup: {
      answer: "surfeit",
      parts: ["feit", "sur"],
      meaning: "an excessive amount; too much",
      success: "Recte! You built surfeit."
    },
    familyWords: [
      { id: "surface", word: "surface", answer: ["sur", "face"], meaning: "the outside or top layer over the rest" },
      { id: "surrealist", word: "surrealist", answer: ["sur", "real", "ist"], meaning: "an artist who goes beyond ordinary reality" },
      { id: "surplus", word: "surplus", answer: ["sur", "plus"], meaning: "more than what is needed or used" }
    ],
    familyTiles: [
      { id: "sur-1", label: "sur" },
      { id: "face-1", label: "face" },
      { id: "sur-2", label: "sur" },
      { id: "real-1", label: "real" },
      { id: "ist-1", label: "ist" },
      { id: "sur-3", label: "sur" },
      { id: "plus-1", label: "plus" }
    ]
  },
  alter: {
    id: "alter",
    label: "alter",
    warmup: {
      answer: "altercation",
      parts: ["cation", "alter"],
      meaning: "a noisy argument",
      success: "Recte! You built altercation."
    },
    familyWords: [
      { id: "alteration", word: "alteration", answer: ["alter", "ation"], meaning: "a change that makes something different" },
      { id: "alternative", word: "alternative", answer: ["alter", "native"], meaning: "another choice or option" },
      { id: "altruism", word: "altruism", answer: ["altr", "uism"], meaning: "care for other people before yourself" }
    ],
    familyTiles: [
      { id: "alter-1", label: "alter" },
      { id: "ation-1", label: "ation" },
      { id: "alter-2", label: "alter" },
      { id: "native-1", label: "native" },
      { id: "altr-1", label: "altr" },
      { id: "uism-1", label: "uism" }
    ]
  },
  contra: {
    id: "contra",
    label: "contra",
    warmup: {
      answer: "contrary",
      parts: ["ry", "contra"],
      meaning: "the opposite",
      success: "Recte! You built contrary."
    },
    familyWords: [
      { id: "contradict", word: "contradict", answer: ["contra", "dict"], meaning: "to speak against what someone says" },
      { id: "contrast", word: "contrast", answer: ["contra", "st"], meaning: "to show how things are different" },
      { id: "contravene", word: "contravene", answer: ["contra", "vene"], meaning: "to go against a rule or law" }
    ],
    familyTiles: [
      { id: "contra-1", label: "contra" },
      { id: "dict-1", label: "dict" },
      { id: "contra-2", label: "contra" },
      { id: "st-1", label: "st" },
      { id: "contra-3", label: "contra" },
      { id: "vene-1", label: "vene" }
    ]
  },
  stell: {
    id: "stell",
    label: "stell",
    warmup: {
      answer: "stellar",
      parts: ["ar", "stell"],
      meaning: "of a star; excellent",
      success: "Recte! You built stellar."
    },
    familyWords: [
      { id: "constellation", word: "constellation", answer: ["con", "stell", "ation"], meaning: "a group of stars" },
      { id: "interstellar", word: "interstellar", answer: ["inter", "stell", "ar"], meaning: "between the stars" },
      { id: "stelliform", word: "stelliform", answer: ["stell", "iform"], meaning: "shaped like a star" }
    ],
    familyTiles: [
      { id: "con-1", label: "con" },
      { id: "stell-1", label: "stell" },
      { id: "ation-1", label: "ation" },
      { id: "inter-1", label: "inter" },
      { id: "stell-2", label: "stell" },
      { id: "ar-1", label: "ar" },
      { id: "stell-3", label: "stell" },
      { id: "iform-1", label: "iform" }
    ]
  },
  amat: {
    id: "amat",
    label: "amat",
    warmup: {
      answer: "amatory",
      parts: ["ory", "amat"],
      meaning: "romantic",
      success: "Recte! You built amatory."
    },
    familyWords: [
      { id: "amorous", word: "amorous", answer: ["amor", "ous"], meaning: "full of romantic love" },
      { id: "amateur", word: "amateur", answer: ["amat", "eur"], meaning: "a person who does something for love, not as a profession" },
      { id: "amity", word: "amity", answer: ["am", "ity"], meaning: "friendly feeling or peaceful friendship" }
    ],
    familyTiles: [
      { id: "amor-1", label: "amor" },
      { id: "ous-1", label: "ous" },
      { id: "amat-1", label: "amat" },
      { id: "eur-1", label: "eur" },
      { id: "am-1", label: "am" },
      { id: "ity-1", label: "ity" }
    ]
  },
  luna: {
    id: "luna",
    label: "luna",
    warmup: {
      answer: "sublunar",
      parts: ["sub", "lunar"],
      meaning: "under the moon",
      success: "Recte! You built sublunar."
    },
    familyWords: [
      { id: "lunar", word: "lunar", answer: ["lun", "ar"], meaning: "related to the moon" },
      { id: "lunatic", word: "lunatic", answer: ["lun", "atic"], meaning: "wildly foolish or unreasonable" },
      { id: "lunation", word: "lunation", answer: ["lun", "ation"], meaning: "one complete cycle of the moon" }
    ],
    familyTiles: [
      { id: "lun-1", label: "lun" },
      { id: "ar-1", label: "ar" },
      { id: "lun-2", label: "lun" },
      { id: "atic-1", label: "atic" },
      { id: "lun-3", label: "lun" },
      { id: "ation-1", label: "ation" }
    ]
  },
  greg: {
    id: "greg",
    label: "greg",
    warmup: {
      answer: "aggregate",
      parts: ["ate", "greg", "ag"],
      meaning: "a collected mass",
      success: "Recte! You built aggregate."
    },
    familyWords: [
      { id: "congregate", word: "congregate", answer: ["con", "greg", "ate"], meaning: "to gather together as a group" },
      { id: "segregate", word: "segregate", answer: ["se", "greg", "ate"], meaning: "to separate from a group" },
      { id: "gregarious", word: "gregarious", answer: ["greg", "arious"], meaning: "friendly and group-loving" }
    ],
    familyTiles: [
      { id: "con-1", label: "con" },
      { id: "greg-1", label: "greg" },
      { id: "ate-1", label: "ate" },
      { id: "se-1", label: "se" },
      { id: "greg-2", label: "greg" },
      { id: "ate-2", label: "ate" },
      { id: "greg-3", label: "greg" },
      { id: "arious-1", label: "arious" }
    ]
  },
  clam: {
    id: "clam",
    label: "clam",
    warmup: {
      answer: "declaim",
      parts: ["de", "claim"],
      meaning: "to speak passionately against something",
      success: "Recte! You built declaim."
    },
    familyWords: [
      { id: "clamor", word: "clamor", answer: ["clam", "or"], meaning: "a loud outcry" },
      { id: "exclamation", word: "exclamation", answer: ["ex", "clam", "ation"], meaning: "a sudden loud cry or remark" },
      { id: "proclaim", word: "proclaim", answer: ["pro", "claim"], meaning: "to announce publicly and strongly" }
    ],
    familyTiles: [
      { id: "clam-1", label: "clam" },
      { id: "or-1", label: "or" },
      { id: "ex-1", label: "ex" },
      { id: "clam-2", label: "clam" },
      { id: "ation-1", label: "ation" },
      { id: "pro-1", label: "pro" },
      { id: "claim-1", label: "claim" }
    ]
  },
  tang: {
    id: "tang",
    label: "tang",
    warmup: {
      answer: "entangled",
      parts: ["ed", "tang", "en", "l"],
      meaning: "snared, trapped, or involved",
      success: "Recte! You built entangled."
    },
    familyWords: [
      { id: "tangle", word: "tangle", answer: ["tang", "le"], meaning: "to twist together in a knot" },
      { id: "tangent", word: "tangent", answer: ["tang", "ent"], meaning: "a line that touches a curve at one point" },
      { id: "intangible", word: "intangible", answer: ["in", "tang", "ible"], meaning: "unable to be touched" }
    ],
    familyTiles: [
      { id: "tang-1", label: "tang" },
      { id: "le-1", label: "le" },
      { id: "tang-2", label: "tang" },
      { id: "ent-1", label: "ent" },
      { id: "in-1", label: "in" },
      { id: "tang-3", label: "tang" },
      { id: "ible-1", label: "ible" }
    ]
  },
  mar: {
    id: "mar",
    label: "mar",
    warmup: {
      answer: "mariner",
      parts: ["iner", "mar"],
      meaning: "a sailor",
      success: "Recte! You built mariner."
    },
    familyWords: [
      { id: "marine", word: "marine", answer: ["mar", "ine"], meaning: "related to the sea" },
      { id: "maritime", word: "maritime", answer: ["mari", "time"], meaning: "connected with the sea or ships" },
      { id: "submarine", word: "submarine", answer: ["sub", "mar", "ine"], meaning: "a vessel that travels under the sea" }
    ],
    familyTiles: [
      { id: "mar-1", label: "mar" },
      { id: "ine-1", label: "ine" },
      { id: "mari-1", label: "mari" },
      { id: "time-1", label: "time" },
      { id: "sub-1", label: "sub" },
      { id: "mar-2", label: "mar" },
      { id: "ine-2", label: "ine" }
    ]
  },
  junct: {
    id: "junct",
    label: "junct",
    warmup: {
      answer: "adjunct",
      parts: ["ad", "junct"],
      meaning: "an unessential addition",
      success: "Recte! You built adjunct."
    },
    familyWords: [
      { id: "conjunction", word: "conjunction", answer: ["con", "junct", "ion"], meaning: "a word or idea that joins things" },
      { id: "junction", word: "junction", answer: ["junct", "ion"], meaning: "a place where things join" },
      { id: "disjunction", word: "disjunction", answer: ["dis", "junct", "ion"], meaning: "a separation between things" }
    ],
    familyTiles: [
      { id: "con-1", label: "con" },
      { id: "junct-1", label: "junct" },
      { id: "ion-1", label: "ion" },
      { id: "junct-2", label: "junct" },
      { id: "ion-2", label: "ion" },
      { id: "dis-1", label: "dis" },
      { id: "junct-3", label: "junct" },
      { id: "ion-3", label: "ion" }
    ]
  },
  luc: {
    id: "luc",
    label: "luc",
    warmup: {
      answer: "elucidate",
      parts: ["e", "luc", "idate"],
      meaning: "to explain or clarify",
      success: "Recte! You built elucidate."
    },
    familyWords: [
      { id: "lucidity", word: "lucidity", answer: ["luc", "idity"], meaning: "clearness of thought or expression" },
      { id: "translucent", word: "translucent", answer: ["trans", "luc", "ent"], meaning: "letting light pass through" },
      { id: "pellucid", word: "pellucid", answer: ["pel", "lucid"], meaning: "very clear and easy to understand" }
    ],
    familyTiles: [
      { id: "luc-1", label: "luc" },
      { id: "idity-1", label: "idity" },
      { id: "trans-1", label: "trans" },
      { id: "luc-2", label: "luc" },
      { id: "ent-1", label: "ent" },
      { id: "pel-1", label: "pel" },
      { id: "lucid-1", label: "lucid" }
    ]
  },
  medi: {
    id: "medi",
    label: "medi",
    warmup: {
      answer: "mediate",
      parts: ["ate", "medi"],
      meaning: "to intervene in a dispute",
      success: "Recte! You built mediate."
    },
    familyWords: [
      { id: "medium", word: "medium", answer: ["medi", "um"], meaning: "the middle way or material between things" },
      { id: "mediterranean", word: "mediterranean", answer: ["medi", "terranean"], meaning: "in the middle of lands" },
      { id: "immediate", word: "immediate", answer: ["im", "medi", "ate"], meaning: "happening with nothing in between" }
    ],
    familyTiles: [
      { id: "medi-1", label: "medi" },
      { id: "um-1", label: "um" },
      { id: "medi-2", label: "medi" },
      { id: "terranean-1", label: "terranean" },
      { id: "im-1", label: "im" },
      { id: "medi-3", label: "medi" },
      { id: "ate-1", label: "ate" }
    ]
  },
  tempor: {
    id: "tempor",
    label: "tempor",
    warmup: {
      answer: "temporary",
      parts: ["ary", "tempor"],
      meaning: "lasting for only a limited time",
      success: "Recte! You built temporary."
    },
    familyWords: [
      { id: "temporal", word: "temporal", answer: ["tempor", "al"], meaning: "related to time" },
      { id: "contemporary", word: "contemporary", answer: ["con", "tempor", "ary"], meaning: "belonging to the same time period" },
      { id: "extemporaneous", word: "extemporaneous", answer: ["ex", "tempor", "aneous"], meaning: "spoken or done without preparation" }
    ],
    familyTiles: [
      { id: "aneous-1", label: "aneous" },
      { id: "tempor-1", label: "tempor" },
      { id: "con-1", label: "con" },
      { id: "al-1", label: "al" },
      { id: "tempor-2", label: "tempor" },
      { id: "ex-1", label: "ex" },
      { id: "ary-1", label: "ary" },
      { id: "tempor-3", label: "tempor" }
    ]
  },
  grat: {
    id: "grat",
    label: "grat",
    warmup: {
      answer: "gratify",
      parts: ["ify", "grat"],
      meaning: "to please or satisfy someone",
      success: "Recte! You built gratify."
    },
    familyWords: [
      { id: "grateful", word: "grateful", answer: ["grat", "eful"], meaning: "feeling thankful and pleased" },
      { id: "gratuitous", word: "gratuitous", answer: ["grat", "uitous"], meaning: "given or done without a good reason" },
      { id: "ingratiate", word: "ingratiate", answer: ["in", "grat", "iate"], meaning: "to try to win favor by pleasing someone" }
    ],
    familyTiles: [
      { id: "uitous-1", label: "uitous" },
      { id: "grat-1", label: "grat" },
      { id: "in-1", label: "in" },
      { id: "iate-1", label: "iate" },
      { id: "grat-2", label: "grat" },
      { id: "eful-1", label: "eful" },
      { id: "grat-3", label: "grat" }
    ]
  },
  curr: {
    id: "curr",
    label: "curr",
    warmup: {
      answer: "current",
      parts: ["ent", "curr"],
      meaning: "happening or running now",
      success: "Recte! You built current."
    },
    familyWords: [
      { id: "currency", word: "currency", answer: ["curr", "ency"], meaning: "money that runs in use in a country" },
      { id: "concurrent", word: "concurrent", answer: ["con", "curr", "ent"], meaning: "happening at the same time" },
      { id: "recurrent", word: "recurrent", answer: ["re", "curr", "ent"], meaning: "running back or happening again and again" }
    ],
    familyTiles: [
      { id: "con-1", label: "con" },
      { id: "curr-1", label: "curr" },
      { id: "ent-1", label: "ent" },
      { id: "ency-1", label: "ency" },
      { id: "re-1", label: "re" },
      { id: "curr-2", label: "curr" },
      { id: "curr-3", label: "curr" },
      { id: "ent-2", label: "ent" }
    ]
  },
  trans: {
    id: "trans",
    label: "trans",
    warmup: {
      answer: "transition",
      parts: ["ition", "trans"],
      meaning: "a change from one state to another",
      success: "Recte! You built transition."
    },
    familyWords: [
      { id: "transfer", word: "transfer", answer: ["trans", "fer"], meaning: "to carry or move something across" },
      { id: "transmit", word: "transmit", answer: ["trans", "mit"], meaning: "to send something across" },
      { id: "transcend", word: "transcend", answer: ["trans", "cend"], meaning: "to rise above a usual limit" }
    ],
    familyTiles: [
      { id: "trans-1", label: "trans" },
      { id: "mit-1", label: "mit" },
      { id: "fer-1", label: "fer" },
      { id: "trans-2", label: "trans" },
      { id: "cend-1", label: "cend" },
      { id: "trans-3", label: "trans" }
    ]
  },
  migr: {
    id: "migr",
    label: "migr",
    warmup: {
      answer: "migration",
      parts: ["ation", "migr"],
      meaning: "movement from one place to another",
      success: "Recte! You built migration."
    },
    familyWords: [
      { id: "migrant", word: "migrant", answer: ["migr", "ant"], meaning: "a person or animal that moves from place to place" },
      { id: "migratory", word: "migratory", answer: ["migr", "atory"], meaning: "wandering or moving regularly from place to place" },
      { id: "immigration", word: "immigration", answer: ["im", "migr", "ation"], meaning: "movement into a country to live there" }
    ],
    familyTiles: [
      { id: "migr-1", label: "migr" },
      { id: "atory-1", label: "atory" },
      { id: "im-1", label: "im" },
      { id: "ation-1", label: "ation" },
      { id: "ant-1", label: "ant" },
      { id: "migr-2", label: "migr" },
      { id: "migr-3", label: "migr" }
    ]
  },
  rupt: {
    id: "rupt",
    label: "rupt",
    warmup: {
      answer: "rupture",
      parts: ["ure", "rupt"],
      meaning: "a break or burst",
      success: "Recte! You built rupture."
    },
    familyWords: [
      { id: "abrupt", word: "abrupt", answer: ["ab", "rupt"], meaning: "sudden or broken off sharply" },
      { id: "interrupt", word: "interrupt", answer: ["inter", "rupt"], meaning: "to break into something that is happening" },
      { id: "disrupt", word: "disrupt", answer: ["dis", "rupt"], meaning: "to break apart the normal flow of something" }
    ],
    familyTiles: [
      { id: "rupt-1", label: "rupt" },
      { id: "inter-1", label: "inter" },
      { id: "dis-1", label: "dis" },
      { id: "rupt-2", label: "rupt" },
      { id: "ab-1", label: "ab" },
      { id: "rupt-3", label: "rupt" }
    ]
  },
  clud: {
    id: "clud",
    label: "clud",
    warmup: {
      answer: "conclude",
      parts: ["con", "clude"],
      meaning: "to close an argument or bring it to an end",
      success: "Recte! You built conclude."
    },
    familyWords: [
      { id: "include", word: "include", answer: ["in", "clude"], meaning: "to close something in as part of a group" },
      { id: "preclude", word: "preclude", answer: ["pre", "clude"], meaning: "to prevent or close off before it can happen" },
      { id: "seclusion", word: "seclusion", answer: ["se", "clus", "ion"], meaning: "the state of being closed apart from others" }
    ],
    familyTiles: [
      { id: "pre-1", label: "pre" },
      { id: "clude-1", label: "clude" },
      { id: "se-1", label: "se" },
      { id: "in-1", label: "in" },
      { id: "ion-1", label: "ion" },
      { id: "clus-1", label: "clus" },
      { id: "clude-2", label: "clude" }
    ]
  },
  se: {
    id: "se",
    label: "se",
    warmup: {
      answer: "separate",
      parts: ["se", "parate"],
      meaning: "to set apart",
      success: "Recte! You built separate."
    },
    familyWords: [
      { id: "secede", word: "secede", answer: ["se", "cede"], meaning: "to go apart from a larger group" },
      { id: "sequester", word: "sequester", answer: ["se", "quester"], meaning: "to set apart or isolate" },
      { id: "segregate", word: "segregate", answer: ["se", "greg", "ate"], meaning: "to separate one group from another" }
    ],
    familyTiles: [
      { id: "quester-1", label: "quester" },
      { id: "se-1", label: "se" },
      { id: "greg-1", label: "greg" },
      { id: "se-2", label: "se" },
      { id: "ate-1", label: "ate" },
      { id: "cede-1", label: "cede" },
      { id: "se-3", label: "se" }
    ]
  },
  plu: {
    id: "plu",
    label: "plu",
    warmup: {
      answer: "plural",
      parts: ["al", "plur"],
      meaning: "more than one",
      success: "Recte! You built plural."
    },
    familyWords: [
      { id: "plurality", word: "plurality", answer: ["plur", "ality"], meaning: "the state of being more than one" },
      { id: "pluripotent", word: "pluripotent", answer: ["pluri", "potent"], meaning: "able to become many different cell types" },
      { id: "plus", word: "plus", answer: ["plu", "s"], meaning: "more; added to something" }
    ],
    familyTiles: [
      { id: "potent-1", label: "potent" },
      { id: "plur-1", label: "plur" },
      { id: "plu-1", label: "plu" },
      { id: "s-1", label: "s" },
      { id: "ality-1", label: "ality" },
      { id: "pluri-1", label: "pluri" }
    ]
  },
  germ: {
    id: "germ",
    label: "germ",
    warmup: {
      answer: "germinate",
      parts: ["inate", "germ"],
      meaning: "to begin to grow or sprout",
      success: "Recte! You built germinate."
    },
    familyWords: [
      { id: "germinal", word: "germinal", answer: ["germ", "inal"], meaning: "in an early stage of growth" },
      { id: "germane", word: "germane", answer: ["germ", "ane"], meaning: "closely related and relevant" },
      { id: "germicide", word: "germicide", answer: ["germi", "cide"], meaning: "something that kills germs" }
    ],
    familyTiles: [
      { id: "germ-1", label: "germ" },
      { id: "ane-1", label: "ane" },
      { id: "germi-1", label: "germi" },
      { id: "cide-1", label: "cide" },
      { id: "inal-1", label: "inal" },
      { id: "germ-2", label: "germ" }
    ]
  },
  fus: {
    id: "fus",
    label: "fus",
    warmup: {
      answer: "infuse",
      parts: ["in", "fuse"],
      meaning: "to pour into or fill with",
      success: "Recte! You built infuse."
    },
    familyWords: [
      { id: "diffuse", word: "diffuse", answer: ["dif", "fuse"], meaning: "to pour or spread widely" },
      { id: "effusive", word: "effusive", answer: ["ef", "fus", "ive"], meaning: "pouring out strong emotion" },
      { id: "transfusion", word: "transfusion", answer: ["trans", "fus", "ion"], meaning: "the transfer of blood into a person" }
    ],
    familyTiles: [
      { id: "fus-1", label: "fus" },
      { id: "trans-1", label: "trans" },
      { id: "dif-1", label: "dif" },
      { id: "fuse-1", label: "fuse" },
      { id: "ive-1", label: "ive" },
      { id: "ef-1", label: "ef" },
      { id: "ion-1", label: "ion" },
      { id: "fus-2", label: "fus" }
    ]
  },
  culp: {
    id: "culp",
    label: "culp",
    warmup: {
      answer: "culprit",
      parts: ["rit", "culp"],
      meaning: "the person blamed for a problem",
      success: "Recte! You built culprit."
    },
    familyWords: [
      { id: "culpable", word: "culpable", answer: ["culp", "able"], meaning: "deserving blame" },
      { id: "exculpate", word: "exculpate", answer: ["ex", "culp", "ate"], meaning: "to clear someone from blame" },
      { id: "inculpate", word: "inculpate", answer: ["in", "culp", "ate"], meaning: "to accuse or place blame on someone" }
    ],
    familyTiles: [
      { id: "culp-1", label: "culp" },
      { id: "ate-1", label: "ate" },
      { id: "ex-1", label: "ex" },
      { id: "able-1", label: "able" },
      { id: "culp-2", label: "culp" },
      { id: "in-1", label: "in" },
      { id: "ate-2", label: "ate" },
      { id: "culp-3", label: "culp" }
    ]
  },
  pugn: {
    id: "pugn",
    label: "pugn",
    warmup: {
      answer: "pugnacious",
      parts: ["acious", "pugn"],
      meaning: "eager to fight or argue",
      success: "Recte! You built pugnacious."
    },
    familyWords: [
      { id: "pugilist", word: "pugilist", answer: ["pugil", "ist"], meaning: "a person who fights with fists; a boxer" },
      { id: "repugnant", word: "repugnant", answer: ["re", "pugn", "ant"], meaning: "strongly offensive or fighting against one's feelings" },
      { id: "impugn", word: "impugn", answer: ["im", "pugn"], meaning: "to attack or challenge as false" }
    ],
    familyTiles: [
      { id: "re-1", label: "re" },
      { id: "pugil-1", label: "pugil" },
      { id: "ant-1", label: "ant" },
      { id: "pugn-1", label: "pugn" },
      { id: "im-1", label: "im" },
      { id: "ist-1", label: "ist" },
      { id: "pugn-2", label: "pugn" }
    ]
  },
  urb: {
    id: "urb",
    label: "urb",
    warmup: {
      answer: "urban",
      parts: ["an", "urb"],
      meaning: "related to a city",
      success: "Recte! You built urban."
    },
    familyWords: [
      { id: "suburban", word: "suburban", answer: ["sub", "urb", "an"], meaning: "related to a residential area near a city" },
      { id: "urbane", word: "urbane", answer: ["urb", "ane"], meaning: "polished and city-like in manner" },
      { id: "conurbation", word: "conurbation", answer: ["con", "urb", "ation"], meaning: "a large urban area formed by connected cities" }
    ],
    familyTiles: [
      { id: "urb-1", label: "urb" },
      { id: "sub-1", label: "sub" },
      { id: "ation-1", label: "ation" },
      { id: "ane-1", label: "ane" },
      { id: "urb-2", label: "urb" },
      { id: "con-1", label: "con" },
      { id: "an-1", label: "an" },
      { id: "urb-3", label: "urb" }
    ]
  },
  numer: {
    id: "numer",
    label: "numer",
    warmup: {
      answer: "numeral",
      parts: ["al", "numer"],
      meaning: "a symbol that represents a number",
      success: "Recte! You built numeral."
    },
    familyWords: [
      { id: "numerous", word: "numerous", answer: ["numer", "ous"], meaning: "many in number" },
      { id: "enumerate", word: "enumerate", answer: ["e", "numer", "ate"], meaning: "to list or count one by one" },
      { id: "innumerable", word: "innumerable", answer: ["in", "numer", "able"], meaning: "too many to be counted" }
    ],
    familyTiles: [
      { id: "numer-1", label: "numer" },
      { id: "e-1", label: "e" },
      { id: "ous-1", label: "ous" },
      { id: "able-1", label: "able" },
      { id: "numer-2", label: "numer" },
      { id: "in-1", label: "in" },
      { id: "ate-1", label: "ate" },
      { id: "numer-3", label: "numer" }
    ]
  },
  acr: {
    id: "acr",
    label: "acr",
    warmup: {
      answer: "acrid",
      parts: ["id", "acr"],
      meaning: "sharp, bitter, or harsh",
      success: "Recte! You built acrid."
    },
    familyWords: [
      { id: "acrimony", word: "acrimony", answer: ["acri", "mony"], meaning: "sharp bitterness in speech or feeling" },
      { id: "acrimonious", word: "acrimonious", answer: ["acri", "monious"], meaning: "bitter and sharp in tone" },
      { id: "acridity", word: "acridity", answer: ["acr", "idity"], meaning: "sharpness or bitterness of taste, smell, or manner" }
    ],
    familyTiles: [
      { id: "acri-1", label: "acri" },
      { id: "idity-1", label: "idity" },
      { id: "monious-1", label: "monious" },
      { id: "acr-1", label: "acr" },
      { id: "mony-1", label: "mony" },
      { id: "acri-2", label: "acri" }
    ]
  },
  per: {
    id: "per",
    label: "per",
    warmup: {
      answer: "perforate",
      parts: ["ate", "for", "per"],
      meaning: "to make a hole through something",
      success: "Recte! You built perforate."
    },
    familyWords: [
      { id: "pervade", word: "pervade", answer: ["per", "vade"], meaning: "to spread through every part" },
      { id: "permeate", word: "permeate", answer: ["per", "meate"], meaning: "to pass through and spread within" },
      { id: "persevere", word: "persevere", answer: ["per", "severe"], meaning: "to continue through difficulty" }
    ],
    familyTiles: [
      { id: "meate-1", label: "meate" },
      { id: "per-1", label: "per" },
      { id: "severe-1", label: "severe" },
      { id: "per-2", label: "per" },
      { id: "vade-1", label: "vade" },
      { id: "per-3", label: "per" }
    ]
  },
  anim: {
    id: "anim",
    label: "anim",
    warmup: {
      answer: "animate",
      parts: ["ate", "anim"],
      meaning: "to give life or spirit to something",
      success: "Recte! You built animate."
    },
    familyWords: [
      { id: "animal", word: "animal", answer: ["anim", "al"], meaning: "a living creature with breath or life" },
      { id: "animosity", word: "animosity", answer: ["anim", "osity"], meaning: "strong hostility of mind" },
      { id: "magnanimous", word: "magnanimous", answer: ["magn", "anim", "ous"], meaning: "great-minded and generous" }
    ],
    familyTiles: [
      { id: "anim-1", label: "anim" },
      { id: "magn-1", label: "magn" },
      { id: "osity-1", label: "osity" },
      { id: "al-1", label: "al" },
      { id: "ous-1", label: "ous" },
      { id: "anim-2", label: "anim" },
      { id: "anim-3", label: "anim" }
    ]
  },
  tort: {
    id: "tort",
    label: "tort",
    warmup: {
      answer: "contort",
      parts: ["con", "tort"],
      meaning: "to twist out of shape",
      success: "Recte! You built contort."
    },
    familyWords: [
      { id: "distort", word: "distort", answer: ["dis", "tort"], meaning: "to twist the truth or shape of something" },
      { id: "tortuous", word: "tortuous", answer: ["tort", "uous"], meaning: "twisting and full of turns" },
      { id: "extortion", word: "extortion", answer: ["ex", "tort", "ion"], meaning: "the act of twisting money from someone by force" }
    ],
    familyTiles: [
      { id: "tort-1", label: "tort" },
      { id: "dis-1", label: "dis" },
      { id: "ion-1", label: "ion" },
      { id: "ex-1", label: "ex" },
      { id: "uous-1", label: "uous" },
      { id: "tort-2", label: "tort" },
      { id: "tort-3", label: "tort" }
    ]
  },
  sanct: {
    id: "sanct",
    label: "sanct",
    warmup: {
      answer: "sanctify",
      parts: ["ify", "sanct"],
      meaning: "to make holy",
      success: "Recte! You built sanctify."
    },
    familyWords: [
      { id: "sanctuary", word: "sanctuary", answer: ["sanct", "uary"], meaning: "a holy or protected place" },
      { id: "sanctimonious", word: "sanctimonious", answer: ["sanct", "imonious"], meaning: "pretending to be morally holy or superior" },
      { id: "sacrosanct", word: "sacrosanct", answer: ["sacro", "sanct"], meaning: "so holy or important that it must not be criticized" }
    ],
    familyTiles: [
      { id: "sanct-1", label: "sanct" },
      { id: "sacro-1", label: "sacro" },
      { id: "imonious-1", label: "imonious" },
      { id: "sanct-2", label: "sanct" },
      { id: "uary-1", label: "uary" },
      { id: "sanct-3", label: "sanct" }
    ]
  },
  voc: {
    id: "voc",
    label: "voc",
    warmup: {
      answer: "vocalize",
      parts: ["ize", "voc", "al"],
      meaning: "to give voice to a sound or idea",
      success: "Recte! You built vocalize."
    },
    familyWords: [
      { id: "vocabulary", word: "vocabulary", answer: ["voc", "abulary"], meaning: "the words used by a person or group" },
      { id: "invoke", word: "invoke", answer: ["in", "voke"], meaning: "to call upon for help or authority" },
      { id: "equivocate", word: "equivocate", answer: ["equi", "voc", "ate"], meaning: "to speak in a way that avoids a clear answer" }
    ],
    familyTiles: [
      { id: "voc-1", label: "voc" },
      { id: "equi-1", label: "equi" },
      { id: "voke-1", label: "voke" },
      { id: "ate-1", label: "ate" },
      { id: "abulary-1", label: "abulary" },
      { id: "in-1", label: "in" },
      { id: "voc-2", label: "voc" }
    ]
  },
  punct: {
    id: "punct",
    label: "punct",
    warmup: {
      answer: "puncture",
      parts: ["ure", "punct"],
      meaning: "to make a small pointed hole",
      success: "Recte! You built puncture."
    },
    familyWords: [
      { id: "punctual", word: "punctual", answer: ["punct", "ual"], meaning: "arriving at the exact point in time" },
      { id: "punctuate", word: "punctuate", answer: ["punct", "uate"], meaning: "to mark writing with points or signs" },
      { id: "compunction", word: "compunction", answer: ["com", "punct", "ion"], meaning: "a sharp feeling of guilt" }
    ],
    familyTiles: [
      { id: "punct-1", label: "punct" },
      { id: "com-1", label: "com" },
      { id: "uate-1", label: "uate" },
      { id: "ion-1", label: "ion" },
      { id: "ual-1", label: "ual" },
      { id: "punct-2", label: "punct" },
      { id: "punct-3", label: "punct" }
    ]
  },
  trib: {
    id: "trib",
    label: "trib",
    warmup: {
      answer: "tribute",
      parts: ["ute", "trib"],
      meaning: "something paid or given to show respect",
      success: "Recte! You built tribute."
    },
    familyWords: [
      { id: "contribute", word: "contribute", answer: ["con", "tribute"], meaning: "to give or pay together with others" },
      { id: "tributary", word: "tributary", answer: ["tribut", "ary"], meaning: "a stream that pays its water into a larger river" },
      { id: "retribution", word: "retribution", answer: ["re", "tribut", "ion"], meaning: "punishment paid back for wrongdoing" }
    ],
    familyTiles: [
      { id: "tribut-1", label: "tribut" },
      { id: "con-1", label: "con" },
      { id: "ary-1", label: "ary" },
      { id: "tribute-1", label: "tribute" },
      { id: "re-1", label: "re" },
      { id: "ion-1", label: "ion" },
      { id: "tribut-2", label: "tribut" }
    ]
  },
  cap: {
    id: "cap",
    label: "cap",
    warmup: {
      answer: "capture",
      parts: ["ure", "capt"],
      meaning: "to take hold of or take prisoner",
      success: "Recte! You built capture."
    },
    familyWords: [
      { id: "captain", word: "captain", answer: ["capt", "ain"], meaning: "a leader who takes charge" },
      { id: "captivate", word: "captivate", answer: ["capt", "ivate"], meaning: "to take hold of someone's attention" },
      { id: "captious", word: "captious", answer: ["capt", "ious"], meaning: "eager to take notice of small faults" }
    ],
    familyTiles: [
      { id: "capt-1", label: "capt" },
      { id: "ivate-1", label: "ivate" },
      { id: "ious-1", label: "ious" },
      { id: "capt-2", label: "capt" },
      { id: "ain-1", label: "ain" },
      { id: "capt-3", label: "capt" }
    ]
  },
  pond: {
    id: "pond",
    label: "pond",
    warmup: {
      answer: "ponder",
      parts: ["er", "pond"],
      meaning: "to weigh something carefully in the mind",
      success: "Recte! You built ponder."
    },
    familyWords: [
      { id: "ponderous", word: "ponderous", answer: ["ponder", "ous"], meaning: "heavy and slow-moving" },
      { id: "preponderance", word: "preponderance", answer: ["pre", "ponder", "ance"], meaning: "greater weight, force, or importance" },
      { id: "imponderable", word: "imponderable", answer: ["im", "ponder", "able"], meaning: "too difficult to weigh or judge" }
    ],
    familyTiles: [
      { id: "pre-1", label: "pre" },
      { id: "ponder-1", label: "ponder" },
      { id: "able-1", label: "able" },
      { id: "im-1", label: "im" },
      { id: "ous-1", label: "ous" },
      { id: "ponder-2", label: "ponder" },
      { id: "ance-1", label: "ance" },
      { id: "ponder-3", label: "ponder" }
    ]
  },
  rect: {
    id: "rect",
    label: "rect",
    warmup: {
      answer: "rectify",
      parts: ["ify", "rect"],
      meaning: "to make right",
      success: "Recte! You built rectify."
    },
    familyWords: [
      { id: "correct", word: "correct", answer: ["cor", "rect"], meaning: "right; made right" },
      { id: "rectitude", word: "rectitude", answer: ["rect", "itude"], meaning: "moral uprightness or right conduct" },
      { id: "rectilinear", word: "rectilinear", answer: ["recti", "linear"], meaning: "moving or formed in straight lines" }
    ],
    familyTiles: [
      { id: "rect-1", label: "rect" },
      { id: "itude-1", label: "itude" },
      { id: "cor-1", label: "cor" },
      { id: "linear-1", label: "linear" },
      { id: "recti-1", label: "recti" },
      { id: "rect-2", label: "rect" }
    ]
  },
  de: {
    id: "de",
    label: "de",
    warmup: {
      answer: "decode",
      parts: ["code", "de"],
      meaning: "to change a message into understandable form",
      success: "Recte! You built decode."
    },
    familyWords: [
      { id: "decrease", word: "decrease", answer: ["de", "crease"], meaning: "to become smaller in amount, size, or number" },
      { id: "descend", word: "descend", answer: ["de", "scend"], meaning: "to move downward from a higher place" },
      { id: "deduct", word: "deduct", answer: ["de", "duct"], meaning: "to subtract something from a total" }
    ],
    familyTiles: [
      { id: "de-1", label: "de" },
      { id: "crease-1", label: "crease" },
      { id: "de-2", label: "de" },
      { id: "duct-1", label: "duct" },
      { id: "scend-1", label: "scend" },
      { id: "de-3", label: "de" }
    ]
  }
};

const buildWordMapStems = (ids: string[]) =>
  ids.map((id, index) => ({ id, label: id, status: index === 0 ? "available" : "locked", detail: index === 0 ? "3 family words" : "locked" }));

const buildWordMaps: BuildWordMap[] = [
  {
    id: "sky-board",
    title: "Sky Board",
    shortTitle: "Map 1",
    subtitle: "Fly the first route and unlock each stem family.",
    className: "sky",
    stems: buildWordMapStems(["com", "intra", "cent", "ad", "fer", "vita", "vid", "pater", "matri", "pop", "loco", "sur"])
  },
  {
    id: "river-route",
    title: "River Route",
    shortTitle: "Map 2",
    subtitle: "Follow the river into stronger word families.",
    className: "river",
    stems: buildWordMapStems(["alter", "contra", "stell", "amat", "luna", "greg", "clam", "tang", "mar", "junct", "luc", "medi"])
  },
  {
    id: "mountain-trail",
    title: "Mountain Trail",
    shortTitle: "Map 3",
    subtitle: "Climb toward harder stems.",
    className: "mountain",
    stems: buildWordMapStems(["tempor", "grat", "curr", "trans", "migr", "rupt", "clud", "se", "plu", "germ", "fus", "culp"])
  },
  {
    id: "castle-gate",
    title: "Castle Gate",
    shortTitle: "Map 4",
    subtitle: "Break through the final wall of stem families.",
    className: "castle",
    stems: buildWordMapStems(["pugn", "urb", "numer", "acr", "per", "anim", "tort", "sanct", "voc", "punct", "trib", "cap"])
  },
  {
    id: "star-tower",
    title: "Star Tower",
    shortTitle: "Map 5",
    subtitle: "Finish the last stems and celebrate the summit.",
    className: "star",
    stems: buildWordMapStems(["pond", "rect"])
  }
];

const buildWordMainStemIds = buildWordMaps.flatMap((map) => map.stems.map((stem) => stem.id));

const buildWordChallengeFor = (stemId: string) => buildWordChallenges[stemId];

const emptyBuildWordFamilyAnswers = (challenge: BuildWordChallenge): BuildWordFamilyAnswer =>
  Object.fromEntries(challenge.familyWords.map((word) => [word.id, []]));

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
  boss: { icon: "♛", label: "Boss", mission: "Use stems, words, and context together." },
  "root-match-menu": { icon: "↔", label: "Match", mission: "Choose a difficulty and match Latin stems." },
  "jeopardy-menu": { icon: "?", label: "Board", mission: "Pick a square and win stem points." },
  "build-word-menu": { icon: "＋", label: "Build", mission: "Build nonfiction words from Latin stems." }
};

const bossStageMeta: Record<BossStageId, { title: string; subtitle: string }> = {
  recall: { title: "Quick Recall", subtitle: "Warm up with stems that need one more look." },
  forge: { title: "Word Family Forge", subtitle: "Choose the word that grows from the clue." },
  context: { title: "Meaning in Context", subtitle: "Pick the word that fits the sentence naturally." },
  passage: { title: "Complete the Passage", subtitle: "Use context to make the paragraph flow." }
};

const bossStageOrder: BossStageId[] = ["recall", "forge", "context", "passage"];
const bossTotalLoops = 10;
const bossBaseReward = 16;

function bossLoopReward(loopIndex: number) {
  return bossBaseReward * 2 ** Math.min(loopIndex, bossTotalLoops - 1);
}

const bossLoopContents: BossLoopContent[] = [
  {
    contextItems: [
      {
        id: "placate",
        sentence: "The captain spoke calmly to ______ the worried crew before the storm arrived.",
        answer: "placate",
        options: ["placate", "contradict", "migrate", "rupture"],
        clue: "The sentence needs a word for calming strong feelings."
      },
      {
        id: "evidence",
        sentence: "The historian needed clear ______ before making a claim about the ancient letter.",
        answer: "evidence",
        options: ["evidence", "surplus", "amity", "vitality"],
        clue: "The blank asks for proof people can examine."
      },
      {
        id: "contrary",
        sentence: "Mira expected the path to be easy; on the ______, it climbed sharply through the rocks.",
        answer: "contrary",
        options: ["contrary", "common", "lunar", "adjacent"],
        clue: "The phrase turns the idea in the opposite direction."
      }
    ],
    passageText: [
      "In the old library, the students found a map with ",
      " notes in the margin. They had to ",
      " their ideas clearly, compare each clue with real ",
      ", and ",
      " the final symbol from one page to another. By the end, the group felt a new ",
      " for classical words."
    ],
    passageBlanks: [
      { id: "common", answer: "common", definition: "shared by several people or belonging to a group", options: ["common", "communal", "popular", "ordinary"] },
      { id: "communicate", answer: "communicate", definition: "to share information, thoughts, or feelings", options: ["communicate", "commute", "command", "contradict"] },
      { id: "evidence", answer: "evidence", definition: "facts or signs that help prove whether something is true", options: ["evidence", "vitality", "videlicet", "surplus"] },
      { id: "transfer", answer: "transfer", definition: "to move something from one place, person, or situation to another", options: ["transfer", "translate", "transmit", "transport"] },
      { id: "vitality", answer: "vitality", definition: "energy, liveliness, or strength", options: ["vitality", "vitamin", "amity", "vital"] }
    ]
  },
  {
    contextItems: [
      {
        id: "alternative",
        sentence: "When the first plan failed, the team chose an ______ route across the valley.",
        answer: "alternative",
        options: ["alternative", "altercation", "contrary", "intrastate"],
        clue: "The sentence needs a word for another possible choice."
      },
      {
        id: "contradict",
        sentence: "A new witness appeared to ______ the story that everyone had believed.",
        answer: "contradict",
        options: ["contradict", "contrast", "communicate", "commute"],
        clue: "The blank needs a verb meaning to speak against a statement."
      },
      {
        id: "constellation",
        sentence: "The children traced a bright ______ above the campfire and named its stars.",
        answer: "constellation",
        options: ["constellation", "stellar", "lunation", "intramural"],
        clue: "The sentence points to a group of stars."
      }
    ],
    passageText: [
      "At the night camp, Leo offered an ",
      " plan when clouds covered the trail. The guide asked him not to ",
      " the map without proof, so he pointed to a familiar ",
      " and waited for the ",
      " moonlight to return. By morning, the group walked on in quiet ",
      "."
    ],
    passageBlanks: [
      { id: "alternative", answer: "alternative", definition: "another possible choice or option", options: ["alternative", "alteration", "altercation", "altruism"] },
      { id: "contradict", answer: "contradict", definition: "to say the opposite of something or speak against it", options: ["contradict", "contrast", "contravene", "communicate"] },
      { id: "constellation", answer: "constellation", definition: "a group of stars forming a pattern", options: ["constellation", "stellar", "stelliform", "lunation"] },
      { id: "lunar", answer: "lunar", definition: "related to the moon", options: ["lunar", "lunatic", "sublunar", "stellar"] },
      { id: "amity", answer: "amity", definition: "friendly feeling or peaceful friendship", options: ["amity", "amorous", "amateur", "amatory"] }
    ]
  },
  {
    contextItems: [
      {
        id: "temporary",
        sentence: "The bridge was only ______, so the hikers crossed it carefully.",
        answer: "temporary",
        options: ["temporary", "gratitude", "current", "migrant"],
        clue: "The word means lasting for a short time."
      },
      {
        id: "current",
        sentence: "The river's strong ______ pulled the small boat toward the bend.",
        answer: "current",
        options: ["current", "gratitude", "rupture", "germinate"],
        clue: "The sentence asks for moving water."
      },
      {
        id: "seclude",
        sentence: "The writer chose to ______ herself in a quiet cabin until the chapter was finished.",
        answer: "seclude",
        options: ["seclude", "include", "migrate", "fuse"],
        clue: "The context means to keep apart from others."
      }
    ],
    passageText: [
      "During the mountain study, the class made a ",
      " shelter beside a fast ",
      ". They wrote notes of ",
      " to their guide, watched seeds begin to ",
      ", and learned not to ",
      " themselves from the group when the trail grew hard."
    ],
    passageBlanks: [
      { id: "temporary", answer: "temporary", definition: "lasting for only a limited time", options: ["temporary", "temporal", "contemporary", "temporize"] },
      { id: "current", answer: "current", definition: "moving water or the flow of something", options: ["current", "curriculum", "recur", "course"] },
      { id: "gratitude", answer: "gratitude", definition: "a feeling of thankfulness", options: ["gratitude", "gratuity", "gratis", "grateful"] },
      { id: "germinate", answer: "germinate", definition: "to begin to grow or develop", options: ["germinate", "germane", "germ", "migrate"] },
      { id: "seclude", answer: "seclude", definition: "to keep apart from others", options: ["seclude", "include", "exclude", "conclude"] }
    ]
  },
  {
    contextItems: [
      {
        id: "urban",
        sentence: "The museum studied how ______ life changed as the city grew.",
        answer: "urban",
        options: ["urban", "pugnant", "numeral", "sacred"],
        clue: "The sentence points to life in a city."
      },
      {
        id: "sanctuary",
        sentence: "The small garden became a quiet ______ for readers after school.",
        answer: "sanctuary",
        options: ["sanctuary", "vocation", "tribunal", "caption"],
        clue: "The word suggests a safe or peaceful place."
      },
      {
        id: "vocation",
        sentence: "After volunteering at the clinic, Ana began to think medicine might be her ______.",
        answer: "vocation",
        options: ["vocation", "vocabulary", "punctuation", "torture"],
        clue: "The sentence asks for a calling or life work."
      }
    ],
    passageText: [
      "In the old ",
      " district, a student counted each ",
      " on the stone wall and copied its ",
      ". The court nearby felt like a ",
      ", but the library remained a ",
      " for anyone who loved words."
    ],
    passageBlanks: [
      { id: "urban", answer: "urban", definition: "related to a city", options: ["urban", "suburban", "urbane", "rural"] },
      { id: "numeral", answer: "numeral", definition: "a symbol or word that represents a number", options: ["numeral", "numerous", "number", "enumerate"] },
      { id: "caption", answer: "caption", definition: "a short title or explanation with an image or text", options: ["caption", "capture", "capital", "chapter"] },
      { id: "tribunal", answer: "tribunal", definition: "a court or place of judgment", options: ["tribunal", "tribute", "tribune", "tribal"] },
      { id: "sanctuary", answer: "sanctuary", definition: "a safe, peaceful, or protected place", options: ["sanctuary", "sacred", "sanction", "sanctify"] }
    ]
  },
  {
    contextItems: [
      { id: "ponderous", sentence: "The old gate was so ______ that three students had to push it open.", answer: "ponderous", options: ["ponderous", "rectify", "punctual", "animate"], clue: "The sentence needs a word meaning heavy or slow." },
      { id: "rectify", sentence: "After finding the error, the editor worked to ______ the final page.", answer: "rectify", options: ["rectify", "ponder", "tribute", "vocalize"], clue: "The blank means to correct something." },
      { id: "punctual", sentence: "The guide was always ______, arriving exactly when the bell rang.", answer: "punctual", options: ["punctual", "punctured", "numerous", "urban"], clue: "The sentence points to being on time." }
    ],
    passageText: [
      "At the observatory, the telescope looked ",
      ", but it helped students ",
      " a mistaken star chart. Their teacher asked for a ",
      " report, a clear ",
      " of the discovery, and a short ",
      " to the scientist who first named the star."
    ],
    passageBlanks: [
      { id: "ponderous", answer: "ponderous", definition: "heavy, slow, or awkward because of weight", options: ["ponderous", "ponderable", "portable", "powerful"] },
      { id: "rectify", answer: "rectify", definition: "to correct or make right", options: ["rectify", "direct", "erect", "rectangle"] },
      { id: "punctual", answer: "punctual", definition: "arriving or happening at the right time", options: ["punctual", "punctured", "punctuate", "punctilious"] },
      { id: "caption", answer: "caption", definition: "a short explanation beside an image or text", options: ["caption", "capture", "capital", "chapter"] },
      { id: "tribute", answer: "tribute", definition: "words or actions showing respect or admiration", options: ["tribute", "tribunal", "tribune", "contribute"] }
    ]
  },
  {
    contextItems: [
      { id: "migration", sentence: "The birds began their long ______ as the weather turned cold.", answer: "migration", options: ["migration", "rupture", "fusion", "seclusion"], clue: "The context points to movement from one region to another." },
      { id: "rupture", sentence: "Too much pressure can ______ a weak pipe.", answer: "rupture", options: ["rupture", "migrate", "include", "gratify"], clue: "The blank means to break or burst." },
      { id: "fusion", sentence: "The project was a ______ of science, art, and classical language.", answer: "fusion", options: ["fusion", "confusion", "germination", "gratitude"], clue: "The word means a joining together." }
    ],
    passageText: [
      "In science class, students tracked animal ",
      " across a map. They learned how a sudden ",
      " in an ice shelf could change a route, how cultures sometimes ",
      " ideas, and how one tiny seed may ",
      " after a long winter. The lesson ended with real ",
      " for patient observation."
    ],
    passageBlanks: [
      { id: "migration", answer: "migration", definition: "movement from one place or region to another", options: ["migration", "immigration", "emigration", "motion"] },
      { id: "rupture", answer: "rupture", definition: "a break or burst", options: ["rupture", "eruption", "interrupt", "corrupt"] },
      { id: "fuse", answer: "fuse", definition: "to join together into one", options: ["fuse", "refuse", "confuse", "infuse"] },
      { id: "germinate", answer: "germinate", definition: "to begin to grow or develop", options: ["germinate", "germane", "generate", "migrate"] },
      { id: "gratitude", answer: "gratitude", definition: "thankfulness", options: ["gratitude", "gratuity", "gratis", "greatness"] }
    ]
  },
  {
    contextItems: [
      { id: "populous", sentence: "The ______ market was crowded with shoppers and musicians.", answer: "populous", options: ["populous", "popular", "paternal", "localized"], clue: "The sentence needs a word meaning full of people." },
      { id: "localized", sentence: "The storm damage was ______ to one small neighborhood.", answer: "localized", options: ["localized", "locomotive", "popularized", "maternal"], clue: "The blank means limited to a particular place." },
      { id: "matriarch", sentence: "The family listened carefully when the wise ______ spoke.", answer: "matriarch", options: ["matriarch", "patriarch", "population", "centurion"], clue: "The sentence points to a female head of a family." }
    ],
    passageText: [
      "In the ",
      " town square, a respected ",
      " told stories about her childhood. A ",
      " exhibit showed the exact ",
      " of her first home, and a ",
      " marker celebrated one hundred years of local history."
    ],
    passageBlanks: [
      { id: "populous", answer: "populous", definition: "having many people", options: ["populous", "popular", "populace", "population"] },
      { id: "matriarch", answer: "matriarch", definition: "a female head of a family or group", options: ["matriarch", "patriarch", "maternal", "matrimony"] },
      { id: "localized", answer: "localized", definition: "limited to a particular place", options: ["localized", "location", "locomotive", "dislocated"] },
      { id: "location", answer: "location", definition: "a place or position", options: ["location", "locomotion", "locality", "dislocation"] },
      { id: "centennial", answer: "centennial", definition: "related to a one-hundredth anniversary", options: ["centennial", "century", "centimeter", "centurion"] }
    ]
  },
  {
    contextItems: [
      { id: "intravenous", sentence: "The medicine was given through an ______ line in the patient's arm.", answer: "intravenous", options: ["intravenous", "intrastate", "intramural", "adjacent"], clue: "The word means within a vein." },
      { id: "advocate", sentence: "The speaker rose to ______ for cleaner parks in the city.", answer: "advocate", options: ["advocate", "adjacent", "adapt", "adhere"], clue: "The blank means to speak in support of a cause." },
      { id: "infer", sentence: "From the footprints, the students could ______ that someone had crossed the garden.", answer: "infer", options: ["infer", "transfer", "conifer", "adhere"], clue: "The sentence asks for drawing a conclusion from evidence." }
    ],
    passageText: [
      "At the health fair, Maya learned that ",
      " fluids move within a vein. Later, she chose to ",
      " for better school clinics. Her poster helped readers ",
      " the need from clear ",
      ", and she promised to ",
      " the design for younger students."
    ],
    passageBlanks: [
      { id: "intravenous", answer: "intravenous", definition: "within or into a vein", options: ["intravenous", "intracellular", "intrastate", "intramural"] },
      { id: "advocate", answer: "advocate", definition: "to speak in support of something", options: ["advocate", "vocalize", "evoke", "adjoin"] },
      { id: "infer", answer: "infer", definition: "to conclude from evidence", options: ["infer", "refer", "transfer", "confer"] },
      { id: "evidence", answer: "evidence", definition: "facts used to support a belief or claim", options: ["evidence", "provide", "video", "videlicet"] },
      { id: "adapt", answer: "adapt", definition: "to adjust for a new use or situation", options: ["adapt", "adopt", "adhere", "adjacent"] }
    ]
  },
  {
    contextItems: [
      { id: "amorous", sentence: "The old poem sounded ______, full of tender feeling.", answer: "amorous", options: ["amorous", "amateur", "lunar", "gregarious"], clue: "The context points to romantic feeling." },
      { id: "gregarious", sentence: "The ______ student loved group projects and lunchtime debates.", answer: "gregarious", options: ["gregarious", "solitary", "lunar", "amorous"], clue: "The word describes someone sociable." },
      { id: "tangible", sentence: "The model gave the class a ______ way to understand the ancient machine.", answer: "tangible", options: ["tangible", "intangible", "juncture", "marine"], clue: "The word means able to be touched or clearly experienced." }
    ],
    passageText: [
      "In drama club, a ",
      " actor made every rehearsal lively. The script included an ",
      " letter, a ",
      " scene under moonlight, and a ",
      " prop that students could actually hold. At a key ",
      ", the whole cast finally understood the story."
    ],
    passageBlanks: [
      { id: "gregarious", answer: "gregarious", definition: "sociable; enjoying groups", options: ["gregarious", "gregation", "aggregate", "segregated"] },
      { id: "amorous", answer: "amorous", definition: "showing romantic love", options: ["amorous", "amatory", "amateur", "amity"] },
      { id: "lunar", answer: "lunar", definition: "related to the moon", options: ["lunar", "lunatic", "lunation", "sublunar"] },
      { id: "tangible", answer: "tangible", definition: "able to be touched or clearly understood", options: ["tangible", "intangible", "tangent", "contact"] },
      { id: "juncture", answer: "juncture", definition: "an important point where things join or change", options: ["juncture", "junction", "adjunct", "conjunction"] }
    ]
  },
  {
    contextItems: [
      { id: "animate", sentence: "The artist used color to ______ the flat drawing.", answer: "animate", options: ["animate", "sanctify", "torture", "number"], clue: "The blank means to bring life or energy to something." },
      { id: "tortuous", sentence: "The ______ road twisted around the mountain for miles.", answer: "tortuous", options: ["tortuous", "tortured", "punctual", "sacred"], clue: "The word describes something full of twists." },
      { id: "sacred", sentence: "The community treated the quiet grove as a ______ place.", answer: "sacred", options: ["sacred", "urban", "vocal", "acute"], clue: "The sentence points to something holy or deeply respected." }
    ],
    passageText: [
      "The museum guide tried to ",
      " ancient statues with stories. A ",
      " path led visitors to a ",
      " room, where each ",
      " mark in the inscription changed the meaning. The final display made a sharp, ",
      " point about careful reading."
    ],
    passageBlanks: [
      { id: "animate", answer: "animate", definition: "to give life, motion, or energy", options: ["animate", "animation", "animal", "animosity"] },
      { id: "tortuous", answer: "tortuous", definition: "full of twists and turns", options: ["tortuous", "tortured", "torture", "distort"] },
      { id: "sacred", answer: "sacred", definition: "holy or deeply respected", options: ["sacred", "sanctuary", "sanction", "secret"] },
      { id: "punctuation", answer: "punctuation", definition: "marks that organize written language", options: ["punctuation", "puncture", "punctual", "punctilious"] },
      { id: "acute", answer: "acute", definition: "sharp, serious, or keen", options: ["acute", "acrid", "accurate", "acerbic"] }
    ]
  }
];

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
  if (feedback.includes("Try") || feedback.includes("Look again") || feedback.includes("再想想") || feedback.includes("反击") || feedback.includes("Iterum") || feedback.includes("Cave")) return "wrong";
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

export function StemBattleClient({ courseId, courseSlug, isLoggedIn, userId, userName, stems, levels, buildQuestions }: Props) {
  const { flyingGems, launchGemBurst } = useRewardGemBurst(".battle-page");
  const [screen, setScreen] = useState<Screen>("select");
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
  const [activeBuildStemId, setActiveBuildStemId] = useState("com");
  const activeBuildChallenge = buildWordChallengeFor(activeBuildStemId) ?? buildWordChallenges.com;
  const [buildFamilyTiles, setBuildFamilyTiles] = useState<BuildWordPart[]>(() => buildWordChallenges.com.familyTiles);
  const [buildFamilyAnswers, setBuildFamilyAnswers] = useState<BuildWordFamilyAnswer>(() => emptyBuildWordFamilyAnswers(buildWordChallenges.com));
  const [buildFamilyFeedback, setBuildFamilyFeedback] = useState("");
  const [buildFamilyBuilt, setBuildFamilyBuilt] = useState(false);
  const [buildFamilyWrongCount, setBuildFamilyWrongCount] = useState(0);
  const [buildWarmupReviewing, setBuildWarmupReviewing] = useState(false);
  const [buildReviewWordId, setBuildReviewWordId] = useState<string | null>(null);
  const [selectedFamilyRow, setSelectedFamilyRow] = useState(buildWordChallenges.com.familyWords[0]?.id ?? "");
  const [selectedFamilyWord, setSelectedFamilyWord] = useState<string | null>(null);
  const [buildFamilyMatches, setBuildFamilyMatches] = useState<Record<string, string>>({});
  const [completedBuildStems, setCompletedBuildStems] = useState<string[]>([]);
  const [activeBuildMapIndex, setActiveBuildMapIndex] = useState(0);
  const [buildProgressLoaded, setBuildProgressLoaded] = useState(false);
  const [pendingUnlockMapIndex, setPendingUnlockMapIndex] = useState<number | null>(null);
  const [buildMapTransitioning, setBuildMapTransitioning] = useState(false);
  const [buildRewardPoints, setBuildRewardPoints] = useState(0);
  const [showBuildFinale, setShowBuildFinale] = useState(false);
  const [bossStems, setBossStems] = useState<Stem[]>([]);
  const [bossStage, setBossStage] = useState<BossStageId>("recall");
  const [bossStep, setBossStep] = useState(0);
  const [bossFeedback, setBossFeedback] = useState("");
  const [bossScore, setBossScore] = useState(0);
  const [bossPassageAnswers, setBossPassageAnswers] = useState<Record<string, string>>({});
  const [bossPassageMistakes, setBossPassageMistakes] = useState<string[]>([]);
  const [bossComplete, setBossComplete] = useState(false);
  const [bossLoop, setBossLoop] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const fillRevealTimersRef = useRef<number[]>([]);
  const fillWrongAttemptsRef = useRef<Record<string, number>>({});
  const buildReturnTimerRef = useRef<number | null>(null);
  const buildReviewTimersRef = useRef<number[]>([]);
  const buildVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const activeQuestion = questions[run.qi];
  const displayLevels = useMemo(() => {
    const completeStemLevel = levels.find((level) => level.type === "fill");
    const bossLevel = levels.find((level) => level.isBoss || level.type === "boss");
    return [rootMatchingHubLevel, completeStemLevel, jeopardyHubLevel, buildAWordHubLevel, bossLevel].filter(Boolean) as GameLevel[];
  }, [levels]);
  const activeBuildMap = buildWordMaps[activeBuildMapIndex] ?? buildWordMaps[0];
  const activeBuildMapStems = activeBuildMap.stems;
  const pendingUnlockMap = pendingUnlockMapIndex === null ? null : buildWordMaps[pendingUnlockMapIndex];
  const buildWordAllComplete = buildWordMainStemIds.length > 0 && buildWordMainStemIds.every((stemId) => completedBuildStems.includes(stemId));

  function userStorageKey(name: string) {
    return `latinfun_${name}_${courseId}_${userId}`;
  }

  function battleProgressKey() {
    return userStorageKey("battle");
  }

  function savedSessionKey() {
    return userStorageKey("battle_session");
  }

  function buildWordProgressKey() {
    return userStorageKey("build_word_progress");
  }

  function buildWordSessionKey() {
    return userStorageKey("build_word_session");
  }

  function battleProgressServerKey() {
    return "stem-battle:battle-progress";
  }

  function savedSessionServerKey() {
    return "stem-battle:saved-session";
  }

  function buildWordProgressServerKey() {
    return "stem-battle:build-word-progress";
  }

  function buildWordSessionServerKey() {
    return "stem-battle:build-word-session";
  }

  function nextBuildMapIndex(completedStems = completedBuildStems) {
    const nextIndex = buildWordMaps.findIndex((map) =>
      map.stems.some((stem) => buildWordChallengeFor(stem.id) && !completedStems.includes(stem.id))
    );
    if (nextIndex !== -1) return nextIndex;
    const lastPlayableMap = [...buildWordMaps].reverse().findIndex((map) => map.stems.some((stem) => buildWordChallengeFor(stem.id)));
    return lastPlayableMap === -1 ? 0 : buildWordMaps.length - 1 - lastPlayableMap;
  }

  function buildWordPreviewState() {
    const params = new URLSearchParams(window.location.search);
    const match = params.get("preview")?.match(/^map([1-5])last2$/);
    if (!match) return null;
    const mapIndex = Number(match[1]) - 1;
    const previewMap = buildWordMaps[mapIndex] ?? buildWordMaps[0];
    const completedBeforeMap = buildWordMaps.slice(0, mapIndex).flatMap((map) => map.stems.map((stem) => stem.id));
    const completedInMap = previewMap.stems.slice(0, Math.max(0, previewMap.stems.length - 2)).map((stem) => stem.id);
    return { mapIndex, completed: [...completedBeforeMap, ...completedInMap] };
  }

  function updateBuildRewardDisplay(gems: number, rank?: number | null) {
    setBuildRewardPoints(Math.max(0, gems));
    window.dispatchEvent(new CustomEvent("latinfun:gems-updated", { detail: { gems: Math.max(0, gems), rank } }));
  }

  async function refreshBuildRewards() {
    if (!isLoggedIn) return;
    try {
      const response = await fetch(appPath(`/api/rewards?courseId=${courseId}`));
      if (!response.ok) return;
      const payload = (await response.json()) as RewardPayload;
      if (typeof payload.data?.gems === "number") {
        updateBuildRewardDisplay(payload.data.gems, payload.data.rank ?? null);
      }
    } catch {
      return;
    }
  }

  async function applyGameReward(amount: number, source: string, sourceKey: string, reason: string) {
    if (!isLoggedIn) {
      setBuildRewardPoints((points) => Math.max(0, points + amount));
      if (amount > 0) launchGemBurst(amount);
      return amount;
    }

    try {
      const response = await fetch(appPath("/api/rewards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          amount,
          source,
          sourceKey,
          reason
        })
      });
      if (!response.ok) throw new Error("Reward request failed");
      const payload = (await response.json()) as RewardPayload;
      if (typeof payload.data?.gems === "number") {
        updateBuildRewardDisplay(payload.data.gems, payload.data.rank ?? null);
      }
      const awarded = payload.data?.awarded ?? amount;
      if (awarded > 0) {
        launchGemBurst(awarded);
        playGemSparkle(false);
      }
      return awarded;
    } catch {
      setBuildRewardPoints((points) => Math.max(0, points + amount));
      if (amount > 0) {
        launchGemBurst(amount);
        playGemSparkle(false);
      }
      return amount;
    }
  }

  function applyBuildReward(amount: number, sourceKey: string, reason: string) {
    return applyGameReward(amount, "build-a-word", sourceKey, reason);
  }

  function battleLevelKey() {
    if (!activeLevel) return "battle";
    return activeLevel.id || `level-${activeLevel.legacyId ?? activeLevel.order}`;
  }

  function jeopardyCellBonus(value: number) {
    if (value <= 200) return 2;
    if (value <= 400) return 4;
    return 6;
  }

  function rootMatchRoundBonus(mode: RootMatchMode | null) {
    if (mode === "hard") return 5;
    if (mode === "medium") return 4;
    return 3;
  }

  function battleCompletionBonus(accuracy: number, isBoss: boolean) {
    if (isBoss && accuracy === 1) return 18;
    if (isBoss) return 12;
    if (accuracy >= 0.95) return 10;
    if (accuracy >= 0.8) return 7;
    if (accuracy >= 0.6) return 4;
    return 2;
  }

  function scheduleBuildWordMapReturn(showFinale = false) {
    if (buildReturnTimerRef.current) {
      window.clearTimeout(buildReturnTimerRef.current);
    }

    buildReturnTimerRef.current = window.setTimeout(() => {
      setScreen("build-word");
      setBuildWordStage("map");
      setBuildFamilyFeedback("");
      setSelectedFamilyWord(null);
      buildReturnTimerRef.current = null;
      if (showFinale) {
        setShowBuildFinale(true);
        playBuildFinaleSound();
      }
    }, 1400);
  }

  function clearBuildReviewTimers() {
    buildReviewTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    buildReviewTimersRef.current = [];
    window.speechSynthesis?.cancel();
  }

  function scheduleBuildReviewTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    buildReviewTimersRef.current.push(timer);
  }

  function getBuildEnglishVoice() {
    if (buildVoiceRef.current) return buildVoiceRef.current;
    if (!("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    const preferredVoice =
      englishVoices.find((voice) => /en-US/i.test(voice.lang) && /samantha|alex|jenny|aria|natural|google us english|microsoft/i.test(voice.name)) ??
      englishVoices.find((voice) => /en-US/i.test(voice.lang)) ??
      englishVoices.find((voice) => /en-/i.test(voice.lang)) ??
      null;

    buildVoiceRef.current = preferredVoice;
    return preferredVoice;
  }

  function speakBuildText(
    text: string,
    options: { rate?: number; pitch?: number; cancel?: boolean; onEnd?: () => void } = {}
  ) {
    const { rate = 0.9, pitch = 1, cancel = false, onEnd } = options;
    if (!("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }
    if (cancel) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    const usVoice = getBuildEnglishVoice();
    if (usVoice) utterance.voice = usVoice;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  }

  function reviewBuildWordOnce(word: string, definition: string, startDelay = 0, onComplete?: () => void) {
    scheduleBuildReviewTimer(() => {
      speakBuildText(word, {
        rate: 0.9,
        cancel: true,
        onEnd: () => {
          scheduleBuildReviewTimer(() => {
            speakBuildText(definition, {
              rate: 0.88,
              pitch: 0.98,
              onEnd: onComplete
            });
          }, 1000);
        }
      });
    }, startDelay);
  }

  useEffect(() => {
    let cancelled = false;
    const raw = window.localStorage.getItem(battleProgressKey());
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { best?: typeof best; unlocked?: number[] };
        setBest(parsed.best ?? {});
        setUnlocked(parsed.unlocked ?? [1]);
      } catch {
        setBest({});
      }
    }
    if (isLoggedIn) {
      fetchProgressState<{ best?: typeof best; unlocked?: number[] }>(courseId, battleProgressServerKey()).then((serverState) => {
        if (cancelled || !serverState) return;
        setBest((current) => ({ ...serverState.best, ...current }));
        if (Array.isArray(serverState.unlocked)) {
          setUnlocked((current) => [...new Set([...serverState.unlocked!, ...current])]);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [courseId, userId, isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    function restoreSession(parsed: SavedBattleSession) {
      if (parsed.activeLevel && parsed.questions?.length && parsed.run && parsed.run.qi < parsed.questions.length) {
        setSavedSession(parsed);
      }
    }

    const raw = window.localStorage.getItem(savedSessionKey());
    if (raw) {
      try {
        restoreSession(JSON.parse(raw) as SavedBattleSession);
      } catch {
        window.localStorage.removeItem(savedSessionKey());
      }
    }
    if (isLoggedIn) {
      fetchProgressState<SavedBattleSession>(courseId, savedSessionServerKey()).then((serverState) => {
        if (cancelled || !serverState) return;
        restoreSession(serverState);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId, isLoggedIn]);

  useEffect(() => {
    const state = { best, unlocked };
    window.localStorage.setItem(battleProgressKey(), JSON.stringify(state));
    if (isLoggedIn) void saveProgressState(courseId, battleProgressServerKey(), state);
  }, [best, unlocked, courseId, userId, isLoggedIn]);

  useEffect(() => {
    setBuildProgressLoaded(false);
    let cancelled = false;
    const previewState = buildWordPreviewState();
    if (previewState) {
      setCompletedBuildStems(previewState.completed);
      setActiveBuildMapIndex(previewState.mapIndex);
      setBuildProgressLoaded(true);
      return;
    }
    let localCompleted: string[] = [];
    try {
      const raw = window.localStorage.getItem(buildWordProgressKey());
      if (raw) {
        const parsed = JSON.parse(raw) as { completed?: string[] };
        localCompleted = Array.isArray(parsed.completed) ? parsed.completed.filter((item): item is string => typeof item === "string") : [];
      }
    } catch {
      window.localStorage.removeItem(buildWordProgressKey());
    }

    setCompletedBuildStems(localCompleted);
    setActiveBuildMapIndex(nextBuildMapIndex(localCompleted));
    setBuildProgressLoaded(true);

    if (isLoggedIn) {
      fetchProgressState<{ completed?: string[] }>(courseId, buildWordProgressServerKey()).then((serverState) => {
        if (cancelled || !serverState) return;
        const serverCompleted = Array.isArray(serverState.completed)
          ? serverState.completed.filter((item): item is string => typeof item === "string")
          : [];
        const merged = [...new Set([...localCompleted, ...serverCompleted])];
        setCompletedBuildStems(merged);
        setActiveBuildMapIndex(nextBuildMapIndex(merged));
        window.localStorage.setItem(buildWordProgressKey(), JSON.stringify({ completed: merged }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId, isLoggedIn]);

  useEffect(() => {
    if (!buildProgressLoaded) return;
    if (buildWordPreviewState()) return;
    const state = { completed: completedBuildStems };
    window.localStorage.setItem(buildWordProgressKey(), JSON.stringify(state));
    if (isLoggedIn) void saveProgressState(courseId, buildWordProgressServerKey(), state);
  }, [buildProgressLoaded, completedBuildStems, courseId, userId, isLoggedIn]);

  useEffect(() => {
    refreshBuildRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId, isLoggedIn]);

  useEffect(() => {
    if (buildWordPreviewState()) return;
    let cancelled = false;
    function restoreBuildSession(saved: {
      screen?: Screen;
      stage?: BuildWordStage;
      activeStemId?: string;
      mapIndex?: number;
      tiles?: string[];
      answer?: string[];
      familyTiles?: BuildWordPart[];
      familyAnswers?: BuildWordFamilyAnswer;
      familyWrongCount?: number;
      selectedFamilyRow?: string;
    }) {
      if (saved.screen !== "build-word" || !saved.stage) return;
      const challenge = buildWordChallengeFor(saved.activeStemId ?? "com");
      if (!challenge) return;
      setScreen("build-word");
      setBuildWordStage(saved.stage);
      setActiveBuildStemId(challenge.id);
      if (typeof saved.mapIndex === "number") setActiveBuildMapIndex(saved.mapIndex);
      setBuildWordTiles(Array.isArray(saved.tiles) ? saved.tiles : challenge.warmup.parts);
      setBuildWordAnswer(Array.isArray(saved.answer) ? saved.answer : []);
      setBuildWordFeedback("");
      setBuildFamilyTiles(Array.isArray(saved.familyTiles) ? saved.familyTiles : shuffle(challenge.familyTiles));
      setBuildFamilyAnswers(saved.familyAnswers ?? emptyBuildWordFamilyAnswers(challenge));
      setBuildFamilyFeedback("");
      setBuildFamilyBuilt(false);
      setBuildFamilyWrongCount(saved.familyWrongCount ?? 0);
      setBuildWarmupReviewing(false);
      setBuildReviewWordId(null);
      setSelectedFamilyRow(saved.selectedFamilyRow ?? challenge.familyWords[0]?.id ?? "");
      setSelectedFamilyWord(null);
      setBuildFamilyMatches({});
    }

    try {
      const raw = window.localStorage.getItem(buildWordSessionKey());
      if (raw) {
        const saved = JSON.parse(raw) as {
          screen?: Screen;
          stage?: BuildWordStage;
          activeStemId?: string;
          mapIndex?: number;
          tiles?: string[];
          answer?: string[];
          familyTiles?: BuildWordPart[];
          familyAnswers?: BuildWordFamilyAnswer;
          familyWrongCount?: number;
          selectedFamilyRow?: string;
        };
        restoreBuildSession(saved);
      }
    } catch {
      window.localStorage.removeItem(buildWordSessionKey());
    }
    if (isLoggedIn) {
      fetchProgressState<Parameters<typeof restoreBuildSession>[0]>(courseId, buildWordSessionServerKey()).then((serverState) => {
        if (cancelled || !serverState) return;
        restoreBuildSession(serverState);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId, isLoggedIn]);

  useEffect(() => {
    try {
      if (screen !== "build-word") {
        window.localStorage.removeItem(buildWordSessionKey());
        if (isLoggedIn) void saveProgressState(courseId, buildWordSessionServerKey(), null);
        return;
      }
      const state = {
        screen,
        stage: buildWordStage,
        activeStemId: activeBuildStemId,
        mapIndex: activeBuildMapIndex,
        tiles: buildWordTiles,
        answer: buildWordAnswer,
        familyTiles: buildFamilyTiles,
        familyAnswers: buildFamilyAnswers,
        familyWrongCount: buildFamilyWrongCount,
        selectedFamilyRow
      };
      window.localStorage.setItem(buildWordSessionKey(), JSON.stringify(state));
      if (isLoggedIn) void saveProgressState(courseId, buildWordSessionServerKey(), state);
    } catch {
      // Local progress persistence is optional.
    }
  }, [activeBuildMapIndex, activeBuildStemId, buildFamilyAnswers, buildFamilyTiles, buildFamilyWrongCount, buildWordAnswer, buildWordStage, buildWordTiles, courseId, screen, selectedFamilyRow, userId, isLoggedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    const previewState = buildWordPreviewState();
    if (previewState) {
      setScreen("build-word");
      setBuildWordStage("map");
      setActiveBuildMapIndex(previewState.mapIndex);
      setPendingUnlockMapIndex(null);
      setBuildMapTransitioning(false);
      setCompletedBuildStems(previewState.completed);
      setBuildRewardPoints((points) => Math.max(points, 120));
      return;
    }
    if (preview === "clam" || preview === "alter") {
      const challenge = buildWordChallenges[preview];
      setScreen("build-word");
      setBuildWordStage("family");
      setActiveBuildMapIndex(1);
      setActiveBuildStemId(challenge.id);
      setBuildFamilyTiles(shuffle(challenge.familyTiles));
      setBuildFamilyAnswers(emptyBuildWordFamilyAnswers(challenge));
      setBuildFamilyFeedback("");
      setBuildFamilyBuilt(false);
      setBuildFamilyWrongCount(0);
      setBuildWarmupReviewing(false);
      setBuildReviewWordId(null);
      setSelectedFamilyRow(challenge.familyWords[0]?.id ?? "");
      setSelectedFamilyWord(null);
      setBuildFamilyMatches({});
      setCompletedBuildStems([...buildWordMaps[0].stems.map((stem) => stem.id), "alter", "contra", "stell", "amat", "luna", "greg"]);
      setBuildRewardPoints((points) => Math.max(points, 120));
      return;
    }
    if (preview !== "map2unlock") return;
    setScreen("build-word");
    setBuildWordStage("map");
    setActiveBuildMapIndex(0);
    setCompletedBuildStems(buildWordMaps[0].stems.map((stem) => stem.id));
    setPendingUnlockMapIndex(1);
    setBuildRewardPoints((points) => Math.max(points, 120));
  }, []);

  useEffect(() => {
    return () => {
      if (buildReturnTimerRef.current) {
        window.clearTimeout(buildReturnTimerRef.current);
      }
      clearBuildReviewTimers();
    };
  }, []);

  useEffect(() => {
    if (screen !== "game" || !activeLevel || questions.length === 0 || run.qi >= questions.length) return;

    const session: SavedBattleSession = {
      activeLevel,
      questions,
      run,
      answer: "",
      wrongMode,
      timeLeft,
      matchedPairs,
      savedAt: Date.now()
    };
    window.localStorage.setItem(savedSessionKey(), JSON.stringify(session));
    if (isLoggedIn) void saveProgressState(courseId, savedSessionServerKey(), session);
    setSavedSession(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, activeLevel, questions, run, wrongMode, timeLeft, matchedPairs, courseId, userId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(appPath(`/api/mistakes?courseId=${courseId}`))
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
    return userStorageKey("root_match_stats");
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
    playKidsCorrect(false);
  }

  function playMatchWrongSound() {
    playKidsWrong(false);
  }

  function playAnswerCorrectSound() {
    playKidsCorrect(false);
  }

  function playAnswerWrongSound() {
    playKidsWrong(false);
  }

  function playRoundCelebrationSound() {
    playKidsComplete(false);
  }

  function playGroupCelebrationSound() {
    playKidsComplete(false);
    return;
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

  function playBuildFinaleSound() {
    playKidsComplete(true);
    return;
    playToneSequence([
      [523.25, 0, 0.16, "triangle", 0.078],
      [659.25, 150, 0.16, "triangle", 0.078],
      [783.99, 300, 0.18, "triangle", 0.082],
      [1046.5, 490, 0.22, "triangle", 0.086],
      [1318.51, 760, 0.18, "sine", 0.07],
      [1567.98, 940, 0.18, "sine", 0.072],
      [2093, 1160, 0.28, "triangle", 0.078],
      [1760, 1540, 0.16, "triangle", 0.065],
      [2093, 1730, 0.18, "triangle", 0.072],
      [2637.02, 1960, 0.24, "sine", 0.07],
      [3135.96, 2320, 0.28, "triangle", 0.062],
      [2349.32, 2820, 0.18, "sine", 0.054],
      [2637.02, 3180, 0.18, "triangle", 0.058],
      [3135.96, 3540, 0.22, "triangle", 0.06],
      [4186.01, 4020, 0.42, "sine", 0.05],
      [523.25, 4620, 0.34, "triangle", 0.04],
      [1046.5, 4620, 0.34, "sine", 0.032]
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

  function bossStemPool(loopIndex = bossLoop) {
    const priority = weakStems();
    const ids = new Set<string>();
    const combined = [...priority, ...stems].filter((stem) => {
      if (ids.has(stem.id)) return false;
      ids.add(stem.id);
      return Boolean(stem.meaning);
    });
    if (combined.length <= 8) return combined;
    const offset = (loopIndex * 8) % combined.length;
    return [...combined.slice(offset), ...combined.slice(0, offset)].slice(0, 8);
  }

  function bossForgeItems(pool = bossStems) {
    return pool
      .map((stem) => buildWordChallengeFor(stem.key) ?? buildWordChallengeFor(stem.id))
      .filter((challenge): challenge is BuildWordChallenge => Boolean(challenge))
      .flatMap((challenge) => challenge.familyWords.map((word) => ({ ...word, stem: challenge.label })))
      .slice(0, 3);
  }

  function bossLoopContent(loopIndex = bossLoop) {
    return bossLoopContents[loopIndex % bossLoopContents.length];
  }

  function normalizedBossLoop(loopIndex = bossLoop) {
    return Math.min(Math.max(loopIndex, 0), bossTotalLoops - 1);
  }

  function bossStageTotal(stage: BossStageId) {
    if (stage === "recall") return Math.min(3, bossStems.length);
    if (stage === "forge") return Math.max(1, bossForgeItems().length);
    if (stage === "context") return bossLoopContent().contextItems.length;
    return 1;
  }

  function bossStageIndex(stage = bossStage) {
    return bossStageOrder.indexOf(stage);
  }

  function advanceBossStage() {
    const nextStage = bossStageOrder[bossStageIndex() + 1];
    if (!nextStage) {
      finishBossChallenge();
      return;
    }
    setBossStage(nextStage);
    setBossStep(0);
    setBossFeedback("");
  }

  function advanceBossStep() {
    const total = bossStageTotal(bossStage);
    window.setTimeout(() => {
      if (bossStep + 1 >= total) advanceBossStage();
      else {
        setBossStep((step) => step + 1);
        setBossFeedback("");
      }
    }, 850);
  }

  function markBossAnswer(isCorrect: boolean, stem?: Stem) {
    if (stem) {
      recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, isCorrect, stem.key).catch(() => undefined);
    }
    if (isCorrect) {
      setBossScore((score) => score + 1);
      setBossFeedback("Nice move.");
      playAnswerCorrectSound();
      advanceBossStep();
    } else {
      setBossFeedback("Look again. The clue is doing quiet work here.");
      playAnswerWrongSound();
    }
  }

  function startBossChallenge(loopIndex = 0) {
    const nextLoop = normalizedBossLoop(loopIndex);
    stopRootMatchMusic();
    clearFillRevealTimers();
    clearBuildReviewTimers();
    initAudio();
    refreshBuildRewards();
    setBossLoop(nextLoop);
    setBossStems(bossStemPool(nextLoop));
    setBossStage("recall");
    setBossStep(0);
    setBossFeedback("");
    setBossScore(0);
    setBossPassageAnswers({});
    setBossPassageMistakes([]);
    setBossComplete(false);
    setScreen("boss");
  }

  function chooseBossRecall(option: string) {
    const stem = bossStems[bossStep];
    if (!stem) return;
    markBossAnswer(normalize(option) === normalize(stem.key), stem);
  }

  function chooseBossForge(word: string) {
    const item = bossForgeItems()[bossStep];
    if (!item) return;
    markBossAnswer(normalize(word) === normalize(item.word));
  }

  function chooseBossContext(word: string) {
    const item = bossLoopContent().contextItems[bossStep];
    if (!item) return;
    markBossAnswer(normalize(word) === normalize(item.answer));
  }

  function setBossPassageBlank(blankId: string, word: string) {
    setBossPassageAnswers((answers) => ({ ...answers, [blankId]: word }));
    setBossPassageMistakes((mistakes) => mistakes.filter((id) => id !== blankId));
  }

  function checkBossPassage() {
    const passageBlanks = bossLoopContent().passageBlanks;
    const complete = passageBlanks.every((blank) => bossPassageAnswers[blank.id]);
    if (!complete) {
      setBossPassageMistakes(passageBlanks.filter((blank) => !bossPassageAnswers[blank.id]).map((blank) => blank.id));
      setBossFeedback("Fill every blank, then read the paragraph once more.");
      return;
    }
    const mistakes = passageBlanks
      .filter((blank) => normalize(bossPassageAnswers[blank.id]) !== normalize(blank.answer))
      .map((blank) => blank.id);
    if (mistakes.length) {
      setBossPassageMistakes(mistakes);
      setBossFeedback("Check the marked blank. The definition will guide your next choice.");
      playAnswerWrongSound();
      return;
    }
    setBossPassageMistakes([]);
    setBossScore((score) => score + passageBlanks.length);
    setBossFeedback("The paragraph flows.");
    playGroupCelebrationSound();
    window.setTimeout(() => finishBossChallenge(), 1200);
  }

  function finishBossChallenge() {
    setBossComplete(true);
    setBossFeedback("");
    playRoundCelebrationSound();
    applyGameReward(
      bossLoopReward(bossLoop),
      "boss-challenge",
      `boss-challenge-pack-${bossLoop + 1}`,
      `Completed Boss Challenge pack ${bossLoop + 1}`
    );
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
    if (isLoggedIn) void saveProgressState(courseId, savedSessionServerKey(), null);
    setSavedSession(null);
    setPendingResumeLevel(null);
    setShowResumePrompt(false);
  }

  function resumeSavedSession(session: SavedBattleSession) {
    clearFillRevealTimers();
    setActiveLevel(session.activeLevel);
    setQuestions(session.questions);
    setRun(session.run);
    setAnswer("");
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

  function savedSessionProgress(session: SavedBattleSession) {
    return `${Math.min(session.run.qi + 1, session.questions.length)}/${session.questions.length}`;
  }

  function restartSavedSession() {
    const level = pendingResumeLevel ?? savedSession?.activeLevel ?? null;
    clearSavedSession();
    if (level) startLevel(level);
    else setScreen("select");
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
    clearBuildReviewTimers();
    refreshBuildRewards();
    setShowBuildFinale(false);
    const previewState = buildWordPreviewState();
    if (previewState) {
      setActiveBuildMapIndex(previewState.mapIndex);
      setCompletedBuildStems(previewState.completed);
    } else {
      setActiveBuildMapIndex(nextBuildMapIndex());
    }
    setBuildWordStage("map");
    const challenge = buildWordChallengeFor(activeBuildStemId) ?? buildWordChallenges.com;
    setBuildWordTiles(challenge.warmup.parts);
    setBuildWordAnswer([]);
    setBuildWordFeedback("");
    setBuildFamilyTiles(shuffle(challenge.familyTiles));
    setBuildFamilyAnswers(emptyBuildWordFamilyAnswers(challenge));
    setBuildFamilyFeedback("");
    setBuildFamilyBuilt(false);
    setBuildFamilyWrongCount(0);
    setBuildWarmupReviewing(false);
    setBuildReviewWordId(null);
    setShowBuildFinale(false);
    setSelectedFamilyRow(challenge.familyWords[0]?.id ?? "");
    setSelectedFamilyWord(null);
    setBuildFamilyMatches({});
    setScreen("build-word");
  }

  function startBuildWordStem(stemId = activeBuildStemId) {
    const challenge = buildWordChallengeFor(stemId);
    if (!challenge) return;
    clearBuildReviewTimers();
    setPendingUnlockMapIndex(null);
    setBuildMapTransitioning(false);
    setActiveBuildStemId(challenge.id);
    setBuildWordStage("warmup");
    setBuildWordTiles(challenge.warmup.parts);
    setBuildWordAnswer([]);
    setBuildWordFeedback("");
    setBuildFamilyTiles(shuffle(challenge.familyTiles));
    setBuildFamilyAnswers(emptyBuildWordFamilyAnswers(challenge));
    setBuildFamilyFeedback("");
    setBuildFamilyBuilt(false);
    setBuildFamilyWrongCount(0);
    setBuildWarmupReviewing(false);
    setBuildReviewWordId(null);
    setSelectedFamilyRow(challenge.familyWords[0]?.id ?? "");
    setSelectedFamilyWord(null);
    setBuildFamilyMatches({});
  }

  function enterUnlockedBuildMap() {
    if (pendingUnlockMapIndex === null) return;
    setBuildMapTransitioning(true);
    window.setTimeout(() => {
      setActiveBuildMapIndex(pendingUnlockMapIndex);
      setPendingUnlockMapIndex(null);
      window.setTimeout(() => setBuildMapTransitioning(false), 180);
    }, 520);
  }

  function chooseBuildWordTile(tile: string) {
    if (buildWordFeedback.includes("Recte") || buildWarmupReviewing) return;
    setBuildWordFeedback("");
    setBuildWordAnswer((parts) => [...parts, tile]);
    setBuildWordTiles((parts) => parts.filter((item) => item !== tile));
  }

  function removeBuildWordPart(index: number) {
    if (buildWordFeedback.includes("Recte") || buildWarmupReviewing) return;
    const removed = buildWordAnswer[index];
    if (!removed) return;
    setBuildWordFeedback("");
    setBuildWordAnswer((parts) => parts.filter((_, itemIndex) => itemIndex !== index));
    setBuildWordTiles((tiles) => [...tiles, removed]);
  }

  function checkBuildWordAnswer() {
    const isCorrect = buildWordAnswer.join("") === activeBuildChallenge.warmup.answer;
    setBuildWordFeedback(isCorrect ? activeBuildChallenge.warmup.success : "Iterum! Read the meaning and reorder the parts.");
    if (isCorrect) {
      const stem = stemByKey(activeBuildChallenge.id);
      if (stem) markStemBattleMistakeMastered(stem).catch(() => undefined);
      const firstCompletion = !completedBuildStems.includes(activeBuildChallenge.id);
      if (firstCompletion) {
        applyBuildReward(2, `build-word-warmup-${activeBuildChallenge.id}`, `Built ${activeBuildChallenge.warmup.answer}`).then((awarded) => {
          if (awarded > 0) setBuildWordFeedback(`${activeBuildChallenge.warmup.success} +${awarded} gems.`);
        });
      }
      playAnswerCorrectSound();
      setBuildWarmupReviewing(true);
      reviewBuildWordOnce(activeBuildChallenge.warmup.answer, activeBuildChallenge.warmup.meaning, 180, () => {
        scheduleBuildReviewTimer(() => {
          window.speechSynthesis?.cancel();
          setBuildWordStage("family");
          setBuildWordFeedback("");
          setBuildWarmupReviewing(false);
          setBuildReviewWordId(null);
        }, 420);
      });
    } else {
      const stem = stemByKey(activeBuildChallenge.id);
      if (stem) recordBuildWordMistake(stem, "Build-a-Word Warmup", buildWordAnswer.join("")).catch(() => undefined);
      playAnswerWrongSound();
    }
  }

  function finishBuildFamilyAfterReview(firstCompletion: boolean, currentMapComplete: boolean) {
    setBuildReviewWordId(null);
    const finalCourseComplete = currentMapComplete && !buildWordMaps[activeBuildMapIndex + 1]?.stems.length;
    setBuildFamilyFeedback(
      finalCourseComplete
        ? "Macte! You have mastered the full stem route."
        : firstCompletion ? "Macte! Saving your gems..." : "Macte! This stem family is complete. Returning to map..."
    );
    playGroupCelebrationSound();
    setCompletedBuildStems((items) => items.includes(activeBuildChallenge.id) ? items : [...items, activeBuildChallenge.id]);
    if (firstCompletion) {
      const rewards = [
        applyBuildReward(8, `build-word-family-${activeBuildChallenge.id}`, `Completed ${activeBuildChallenge.label} family words`)
      ];
      if (currentMapComplete) {
        rewards.push(applyBuildReward(20, `build-word-map-${activeBuildMap.id}`, `Completed ${activeBuildMap.title}`));
      }
      Promise.all(rewards).then((awards) => {
        const totalAwarded = awards.reduce((sum, amount) => sum + Math.max(0, amount), 0);
        setBuildFamilyFeedback(
          finalCourseComplete
            ? totalAwarded > 0
              ? `Latin Stem Legend! +${totalAwarded} gems. Returning to Star Tower...`
              : "Latin Stem Legend! Returning to Star Tower..."
            : totalAwarded > 0
            ? `Macte! +${totalAwarded} gems. Returning to map...`
            : "Macte! This stem family is complete. Returning to map..."
        );
      });
    }
    if (currentMapComplete && buildWordMaps[activeBuildMapIndex + 1]?.stems.length) {
      setPendingUnlockMapIndex(activeBuildMapIndex + 1);
    }
    scheduleBuildWordMapReturn(finalCourseComplete);
  }

  function reviewBuildFamilyWords(firstCompletion: boolean, currentMapComplete: boolean) {
    clearBuildReviewTimers();

    function reviewNext(index: number) {
      const word = activeBuildChallenge.familyWords[index];
      if (!word) {
        finishBuildFamilyAfterReview(firstCompletion, currentMapComplete);
        return;
      }

      setBuildReviewWordId(word.id);
      setSelectedFamilyRow(word.id);
      reviewBuildWordOnce(word.word, word.meaning, 160, () => {
        setBuildReviewWordId(null);
        scheduleBuildReviewTimer(() => reviewNext(index + 1), 360);
      });
    }

    reviewNext(0);
  }

  function familyEndingClue(index: number) {
    const wordIndex = Math.min(index, Math.max(0, activeBuildChallenge.familyWords.length - 1));
    const hintWord = activeBuildChallenge.familyWords[wordIndex] ?? activeBuildChallenge.familyWords[0];
    const ending = hintWord.answer.slice(1).join("");
    return { hintWord, ending, clueNumber: wordIndex + 1 };
  }

  async function useBuildHint() {
    const hintCost = 3;
    if (buildRewardPoints < hintCost) {
      const message = `Hint needs ${hintCost} gems. Complete a stem family to earn more.`;
      if (buildWordStage === "family") setBuildFamilyFeedback(message);
      else setBuildWordFeedback(message);
      playAnswerWrongSound();
      return;
    }

    await applyBuildReward(-hintCost, `build-word-hint-${activeBuildChallenge.id}-${Date.now()}`, `Used hint helper for ${activeBuildChallenge.label}`);

    if (buildWordStage === "family") {
      const { hintWord, ending, clueNumber } = familyEndingClue(buildFamilyWrongCount);
      setSelectedFamilyRow(hintWord.id);
      setBuildFamilyFeedback(`Hint ${clueNumber}/3: "${hintWord.meaning}" ends with "-${ending}".`);
      setBuildFamilyWrongCount((count) => count + 1);
      playKidsHint(true);
      return;
    }

    const nextPart = activeBuildChallenge.warmup.answer.startsWith(buildWordAnswer.join(""))
      ? activeBuildChallenge.warmup.parts.find((part) => !buildWordAnswer.includes(part))
      : activeBuildChallenge.warmup.parts[0];
    setBuildWordFeedback(`Hint: try "${nextPart ?? activeBuildChallenge.warmup.parts[0]}" next.`);
    playKidsHint(true);
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

  function familyAnswerLabels(wordId: string) {
    return (buildFamilyAnswers[wordId] ?? []).map((part) => part.label);
  }

  function familyWordIsCorrect(item: BuildWordFamilyWord) {
    const labels = familyAnswerLabels(item.id);
    const matchesParts = labels.length === item.answer.length && labels.every((label, index) => normalize(label) === normalize(item.answer[index] ?? ""));
    return matchesParts || normalize(labels.join("")) === normalize(item.word);
  }

  function builtFamilyWords() {
    return activeBuildChallenge.familyWords.map((item) => ({
      target: item,
      built: familyAnswerLabels(item.id).join("")
    }));
  }

  function checkFamilyBuilds() {
    const firstIncorrect = activeBuildChallenge.familyWords.find((item) => !familyWordIsCorrect(item));
    const allCorrect = !firstIncorrect;
    if (!allCorrect) {
      const completedWords = new Set(activeBuildChallenge.familyWords.map((item) => normalize(item.word)));
      const everyRowSpellsAFamilyWord = builtFamilyWords().every(({ built }) => built && completedWords.has(normalize(built)));
      if (everyRowSpellsAFamilyWord) {
        const stem = stemByKey(activeBuildChallenge.id);
        if (stem) recordBuildWordMistake(stem, "Build-a-Word Family", builtFamilyWords()).catch(() => undefined);
        setSelectedFamilyRow(firstIncorrect.id);
        setBuildFamilyFeedback("Iterum! The words are spelled, but one is matched to the wrong meaning.");
        setBuildFamilyWrongCount((count) => count + 1);
        playAnswerWrongSound();
        return;
      }
      const { hintWord, ending, clueNumber } = familyEndingClue(buildFamilyWrongCount);
      const stem = stemByKey(activeBuildChallenge.id);
      if (stem) recordBuildWordMistake(stem, "Build-a-Word Family", builtFamilyWords()).catch(() => undefined);
      setSelectedFamilyRow(hintWord.id);
      setBuildFamilyFeedback(`Iterum! Ending clue ${clueNumber}/3: "${hintWord.meaning}" ends with "-${ending}".`);
      setBuildFamilyWrongCount((count) => count + 1);
      playAnswerWrongSound();
      return;
    }
    setBuildFamilyBuilt(true);
    const stem = stemByKey(activeBuildChallenge.id);
    if (stem) markStemBattleMistakeMastered(stem).catch(() => undefined);
    setBuildFamilyWrongCount(0);
    setSelectedFamilyWord(null);
    const firstCompletion = !completedBuildStems.includes(activeBuildChallenge.id);
    const completedAfterThisRun = firstCompletion ? [...completedBuildStems, activeBuildChallenge.id] : completedBuildStems;
    const currentMapComplete = activeBuildMapStems.length > 0 && activeBuildMapStems.every((stem) => completedAfterThisRun.includes(stem.id));
    setBuildFamilyFeedback("Optime! Listen and watch each word.");
    reviewBuildFamilyWords(firstCompletion, currentMapComplete);
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
    const currentStem = cell.stems[jeopardyQuestion.stemIndex] ?? cell.stems[0];

    const isCorrect = option === jeopardyQuestion.answer;
    setJeopardyFeedback(isCorrect ? "Recte!" : "Non recte!");
    if (isCorrect) {
      if (currentStem) markStemBattleMistakeMastered(currentStem).catch(() => undefined);
      playAnswerCorrectSound();
      setJeopardyScore((score) => score + (jeopardyCellRun ? Math.round(cell.value / cell.stems.length) : cell.value));
      if (currentStem) {
        applyGameReward(
          1,
          "jeopardy",
          `jeopardy-answer-${cell.id}-${currentStem.id}`,
          `Answered ${currentStem.key} in Jeopardy`
        );
      }
    } else {
      if (currentStem) recordJeopardyMistake(currentStem, jeopardyQuestion, option).catch(() => undefined);
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
          applyGameReward(
            5 + jeopardyCellBonus(cell.value),
            "jeopardy",
            `jeopardy-cell-${cell.id}`,
            `Completed ${cell.category} ${cell.value} Jeopardy cell`
          ).then((awarded) => {
            if (awarded > 0) setJeopardyFeedback(`Macte! +${awarded} gems.`);
          });
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
    if (level.isBoss || level.type === "boss") {
      startBossChallenge();
      return;
    }

    clearSavedSession();
    initAudio();
    const nextQuestions = generateQuestions(level, asWrongPractice);
    fillWrongAttemptsRef.current = {};
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
    const stem = "stem" in question ? question.stem : undefined;
    const deferFillMistake = question.type === "fill" && !isCorrect && fillWrongAttemptCount(question) < 3;

    if (question.type === "fill" && isCorrect) clearFillWrongAttempts(question);

    if ("stem" in question && !deferFillMistake) {
      setWrongStemIds((prev) => {
        const next = new Set(prev);
        if (isCorrect) next.delete(question.stem.id);
        else next.add(question.stem.id);
        return next;
      });
    }

    if (deferFillMistake) return;
    if (!isLoggedIn) return;
    const knowledgePointId =
      "stem" in question && !question.stem.id.startsWith("latin-stem-") ? question.stem.id : undefined;

    const response = await fetch(appPath("/api/attempts"), {
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
    if (response.ok && isCorrect) await refreshBuildRewards();
    if (stem) {
      if (isCorrect) {
        markStemBattleMistakeMastered(stem).catch(() => undefined);
      } else {
        recordStemBattleMistake(question, stem, value).catch(() => undefined);
      }
    }
  }

  function fillAttemptKey(question: Extract<GameQuestion, { type: "fill" }>) {
    return `${activeLevel?.id ?? "complete-stem"}:${run.qi}:${question.stem.id}`;
  }

  function fillWrongAttemptCount(question: Extract<GameQuestion, { type: "fill" }>) {
    const key = fillAttemptKey(question);
    const count = (fillWrongAttemptsRef.current[key] ?? 0) + 1;
    fillWrongAttemptsRef.current = { ...fillWrongAttemptsRef.current, [key]: count };
    return count;
  }

  function clearFillWrongAttempts(question: Extract<GameQuestion, { type: "fill" }>) {
    const key = fillAttemptKey(question);
    if (!(key in fillWrongAttemptsRef.current)) return;
    const next = { ...fillWrongAttemptsRef.current };
    delete next[key];
    fillWrongAttemptsRef.current = next;
  }

  function stemBattleMistakeType(question: GameQuestion) {
    if (question.type === "fill") return "Complete the Stem";
    if (question.type === "find") return "Example Word";
    if (question.type === "tf") return "True or False";
    if (question.type === "pick") return question.boss ? "Boss Recall" : "Root Matching";
    if (question.type === "boss-type") return "Boss Typing";
    return "Stem Battle";
  }

  function stemBattleSourceModule(question: GameQuestion) {
    if (screen === "boss" || question.type === "boss-type" || (question.type === "pick" && question.boss)) return "Boss Challenge";
    if (screen === "jeopardy") return "Jeopardy";
    if (activeLevel?.type === "fill") return "Complete the Stem";
    if (activeLevel?.type === "root-match" || activeLevel?.type === "root-match-menu") return "Root Matching";
    return activeLevel?.title ?? "Stem Battle";
  }

  function stemByKey(key: string) {
    return stems.find((stem) => normalize(stem.key) === normalize(key));
  }

  async function recordBuildWordMistake(stem: Stem, mistakeType: string, value: unknown) {
    await fetch(appPath("/api/mistakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        knowledgePointId: stem.id.startsWith("latin-stem-") ? null : stem.id,
        category: "Latin Stems",
        itemKey: stem.key,
        itemLabel: `${stem.key} = ${stem.meaning ?? ""}`.trim(),
        mistakeType,
        sourceModule: "Build-a-Word",
        prompt: `${activeBuildChallenge.label}: ${activeBuildChallenge.warmup.meaning}`,
        userAnswer: value,
        correctAnswer: activeBuildChallenge.warmup.answer
      })
    }).catch(() => undefined);
  }

  async function recordJeopardyMistake(stem: Stem, question: JeopardyQuestion, value: unknown) {
    await fetch(appPath("/api/mistakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        knowledgePointId: stem.id.startsWith("latin-stem-") ? null : stem.id,
        category: "Latin Stems",
        itemKey: stem.key,
        itemLabel: `${stem.key} = ${stem.meaning ?? ""}`.trim(),
        mistakeType: "Jeopardy",
        sourceModule: "Jeopardy",
        prompt: question.prompt,
        userAnswer: value,
        correctAnswer: question.answer
      })
    }).catch(() => undefined);
  }

  async function recordStemBattleMistake(question: GameQuestion, stem: Stem, value: unknown) {
    await fetch(appPath("/api/mistakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        knowledgePointId: stem.id.startsWith("latin-stem-") ? null : stem.id,
        category: "Latin Stems",
        itemKey: stem.key,
        itemLabel: `${stem.key} = ${stem.meaning ?? ""}`.trim(),
        mistakeType: stemBattleMistakeType(question),
        sourceModule: stemBattleSourceModule(question),
        prompt: question.type === "fill" ? question.masked : question.type === "find" ? question.exWord : question.type === "tf" ? question.text : stem.meaning,
        userAnswer: value,
        correctAnswer: "answer" in question ? question.answer : stem.key
      })
    }).catch(() => undefined);
  }

  async function markStemBattleMistakeMastered(stem: Stem) {
    await fetch(appPath("/api/mistakes"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        category: "Latin Stems",
        itemKey: stem.key,
        itemLabel: `${stem.key} = ${stem.meaning ?? ""}`.trim()
      })
    }).catch(() => undefined);
  }

  function applyResult(isCorrect: boolean, question: GameQuestion, value: unknown) {
    if (locked) return;
    setLocked(true);
    recordQuestion(question, isCorrect, value).catch(() => undefined);
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
        applyGameReward(
          8,
          "stem-battle",
          `complete-stem-group-${battleLevelKey()}-${Math.floor(nextQi / 20)}`,
          `Completed Complete the Stem group ${Math.floor(nextQi / 20)}`
        );
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
      if (stem) {
        recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, true, id).catch(() => undefined);
      }
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
        applyGameReward(
          rootMatchRoundBonus(rootMode),
          "root-matching",
          `root-match-round-${battleLevelKey()}-${question.round}`,
          `Completed Root Matching round ${question.round}`
        );
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
      if (stem) {
        recordQuestion({ type: "pick", stem, answer: stem.key, meaning: stem.meaning ?? "", options: [] }, false, id).catch(() => undefined);
      }
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
    const completionBonus = activeLevel.type.startsWith("root-match")
      ? rootMatchRoundBonus(rootMatchModeFromType(activeLevel.type)) + stars
      : battleCompletionBonus(accuracy, activeLevel.isBoss);
    applyGameReward(
      completionBonus,
      activeLevel.type.startsWith("root-match") ? "root-matching" : "stem-battle",
      `${activeLevel.type.startsWith("root-match") ? "root-match" : "stem-battle"}-complete-${battleLevelKey()}-${wrongMode ? "review" : "main"}`,
      `Completed ${levelDisplayName(activeLevel)}`
    );
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
  const bossMeta = bossStageMeta[bossStage];
  const bossStageNumber = bossStageIndex() + 1;
  const bossStageTotalCount = bossStageTotal(bossStage);
  const bossRecallStem = bossStems[bossStep];
  const bossForgeItem = bossForgeItems()[bossStep];
  const activeBossLoopContent = bossLoopContent();
  const bossContextItem = activeBossLoopContent.contextItems[bossStep];
  const bossPassageText = activeBossLoopContent.passageText;
  const bossPassageBlanks = activeBossLoopContent.passageBlanks;
  const bossPackNumber = normalizedBossLoop() + 1;
  const bossReward = bossLoopReward(normalizedBossLoop());
  const hasNextBossPack = bossPackNumber < bossTotalLoops;

  return (
    <main className="battle-page">
      <RewardGemBurst gems={flyingGems} />
      <Link className="legacy-back battle-home-link" href={`/courses/${courseSlug}`} onClick={stopRootMatchMusic}>
        ← 返回学习中心首页
      </Link>

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
              <button className="button" onClick={restartSavedSession} type="button">
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
              const lockedLevel = false;
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
                const hasSavedLevelSession = hasSavedSessionForLevel(level);
                return (
                  <article className={`battle-level-card stage-card ${level.type} ${level.isBoss ? "boss" : ""} ${lockedLevel ? "locked" : ""}`} key={level.id}>
                    <button disabled={lockedLevel} onClick={() => chooseLevel(level)} type="button">
                      <div className="stage-card-top">
                        <span className="stage-icon">{levelMeta.icon}</span>
                        <span className="stage-kicker">Level {levelNo} · {levelMeta.label}</span>
                      </div>
                      <strong>{level.subtitle}</strong>
                      <small>{levelMeta.mission}</small>
                      <em>{hasSavedLevelSession && savedSession ? `CONTINUE · ${savedSessionProgress(savedSession)}` : record ? `${record.score} 分 · ${"★".repeat(record.stars)}${"☆".repeat(3 - record.stars)}` : lockedLevel ? "LOCKED" : "START"}</em>
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
            {buildWordStage === "map" ? <span /> : <strong>{activeBuildChallenge.label}</strong>}
          </div>

          <div className="build-word-stage">
            <div className="build-helper-panel">
              <span className="gem-bank" aria-label={`${buildRewardPoints} reward gems`}>
                <b>{buildRewardPoints}</b>
                <span className="gem-icon" aria-hidden="true" />
              </span>
              {buildWordStage !== "map" ? (
                <button disabled={buildRewardPoints < 3 || buildFamilyBuilt} onClick={useBuildHint} type="button">
                  <span>Hint helper</span>
                  <span className="hint-cost" aria-label="costs 3 reward gems">
                    <b>3</b>
                    <span className="gem-icon small" aria-hidden="true" />
                  </span>
                </button>
              ) : null}
            </div>
            {buildWordStage === "map" ? (
              <div className={`build-word-map ${activeBuildMap.className} ${buildMapTransitioning ? "gate-transition" : ""}`}>
                <div className="build-word-map-intro">
                  <span>{activeBuildMap.shortTitle}</span>
                  <h2>{activeBuildMap.title}</h2>
                  <p>{activeBuildMap.subtitle}</p>
                </div>
                {buildWordAllComplete ? (
                  <div className="build-map-replay-tabs" aria-label="Replay completed Build-a-Word maps">
                    {buildWordMaps.map((map, index) =>
                      map.stems.length ? (
                        <button
                          className={index === activeBuildMapIndex ? "active" : ""}
                          key={map.id}
                          onClick={() => {
                            setActiveBuildMapIndex(index);
                            setPendingUnlockMapIndex(null);
                            setBuildMapTransitioning(false);
                            setShowBuildFinale(false);
                          }}
                          type="button"
                        >
                          <span>{map.shortTitle}</span>
                          <strong>{map.title}</strong>
                        </button>
                      ) : null
                    )}
                  </div>
                ) : null}
                <div className="build-word-stem-map" aria-label={`${activeBuildMap.title} stem family map`}>
                  {activeBuildMapStems.map((stem, index) => {
                    const challenge = buildWordChallengeFor(stem.id);
                    const nextStem = activeBuildMapStems.find((item) => !completedBuildStems.includes(item.id) && buildWordChallengeFor(item.id));
                    const isComplete = completedBuildStems.includes(stem.id);
                    const isPlayable = Boolean(challenge) && (isComplete || stem.id === nextStem?.id);
                    const isNext = Boolean(challenge) && stem.id === nextStem?.id && !isPlayable;
                    const nodeState = isComplete ? "completed" : isPlayable ? "available" : isNext ? "next" : stem.status;
                    return (
                      <button
                        className={`build-word-stem-node ${nodeState} node-${stem.id}`}
                        disabled={!isPlayable}
                        key={stem.id}
                        onClick={isPlayable ? () => startBuildWordStem(stem.id) : undefined}
                        type="button"
                      >
                        <small>{activeBuildMapIndex * 12 + index + 1}</small>
                        <strong>{stem.label}</strong>
                        <span>{isComplete ? "family complete" : isNext ? "next stop" : stem.detail}</span>
                        <em>{isComplete ? "REPLAY" : isPlayable ? "START" : isNext ? "NEXT" : "LOCKED"}</em>
                      </button>
                    );
                  })}
                </div>
                {buildWordAllComplete && activeBuildMap.id === "star-tower" ? (
                  <section className="build-final-celebration" aria-label="Build-a-Word complete">
                    <span>Latin Stem Legend</span>
                    <h3>All 50 stem families complete!</h3>
                    <p>You built the route from roots to powerful words.</p>
                  </section>
                ) : null}
                {showBuildFinale ? (
                  <div className="build-finale-overlay" role="dialog" aria-modal="true" aria-label="Final Build-a-Word celebration">
                    <div className="battle-fireworks finale" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <section>
                      <small>Star Tower Complete</small>
                      <h3>Latin Stem Legend!</h3>
                      <p>
                        You completed all 50 stem families. That is serious word power:
                        roots, meanings, and family words are now yours to command.
                      </p>
                      <strong>Keep building. Keep noticing. Every classic word has a story.</strong>
                      <button
                        onClick={() => {
                          setShowBuildFinale(false);
                          setScreen("select");
                        }}
                        type="button"
                      >
                        Return to Stem Battle
                      </button>
                    </section>
                  </div>
                ) : null}
                {pendingUnlockMap ? (
                  <div className="build-unlock-gate" role="dialog" aria-label={`${pendingUnlockMap.title} unlocked`}>
                    <div className="build-gate-door" aria-hidden="true">
                      <span />
                      <span />
                    </div>
                    <section>
                      <small>New Map Unlocked</small>
                      <h3>{pendingUnlockMap.title}</h3>
                      <p>Step through the gate and enter a new word space.</p>
                      <button onClick={enterUnlockedBuildMap} type="button">
                        Enter {pendingUnlockMap.shortTitle}
                      </button>
                    </section>
                  </div>
                ) : null}
              </div>
            ) : buildWordStage === "warmup" ? (
              <>
                <div className="build-word-fact">
                  <em>{activeBuildChallenge.warmup.meaning}</em>
                </div>

                <div className="build-word-play">
                  <div className={`build-word-answer ${buildWordFeedback.includes("Recte") ? "built" : ""} ${buildWarmupReviewing ? "pronouncing" : ""}`}>
                    {buildWordAnswer.length ? buildWordAnswer.map((part, index) => (
                      <button disabled={buildWordFeedback.includes("Recte") || buildWarmupReviewing} key={`${part}-${index}`} onClick={() => removeBuildWordPart(index)} type="button">{part}</button>
                    )) : <small>Choose the parts in order</small>}
                  </div>
                  <div className="build-word-tiles">
                    {buildWordTiles.map((tile) => <button key={tile} onClick={() => chooseBuildWordTile(tile)} type="button">{tile}</button>)}
                  </div>
                  <div className="build-word-actions">
                    <button className="button primary" disabled={buildWordAnswer.length !== activeBuildChallenge.warmup.parts.length || buildWordFeedback.includes("Recte")} onClick={checkBuildWordAnswer} type="button">CHECK</button>
                  </div>
                </div>

                {buildWordFeedback ? <div className={`build-word-feedback ${feedbackTone(buildWordFeedback)}`}>{buildWordFeedback}</div> : null}
              </>
            ) : (
              <div className="build-family-challenge">
                <div className="build-family-head">
                  <strong>{activeBuildChallenge.label}</strong>
                  <span>Read each meaning and build the matching word.</span>
                </div>
                <div className="build-family-grid meaning-first">
                  <div className="build-family-left">
                    {activeBuildChallenge.familyWords.map((item) => {
                      const answerParts = buildFamilyAnswers[item.id] ?? [];
                      return (
                        <div className={`build-family-row ${selectedFamilyRow === item.id ? "selected" : ""} ${buildReviewWordId === item.id ? "pronouncing" : ""} ${buildFamilyBuilt ? "built matched" : ""}`} key={item.id}>
                          <p>{item.meaning}</p>
                          <button
                            className="build-family-word-target"
                            onClick={() => {
                              if (!buildFamilyBuilt) setSelectedFamilyRow(item.id);
                            }}
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
                            )) : <small>build the word here</small>}
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
                </div>
                {buildFamilyFeedback ? <div className={`build-word-feedback ${feedbackTone(buildFamilyFeedback)}`}>{buildFamilyFeedback}</div> : null}
              </div>
            )}
            </div>
        </section>
      ) : null}

      {screen === "boss" ? (
        <section className="boss-challenge">
          <button className="button" onClick={() => setScreen("select")} type="button">← 返回关卡</button>
          <div className="boss-shell">
            <header className="boss-header">
              <span>Boss Challenge</span>
              <h1>{bossComplete ? "Challenge Complete" : bossMeta.title}</h1>
              <p>{bossComplete ? "You used stems, words, and context together." : bossMeta.subtitle}</p>
              <div className="boss-pack-banner" aria-label={`Pack ${bossPackNumber} of ${bossTotalLoops}, reward ${bossReward} gems`}>
                <span>Pack {bossPackNumber}/{bossTotalLoops}</span>
                <strong>+{bossReward}</strong>
                <span className="gem-icon small" aria-hidden="true" />
              </div>
              {!bossComplete ? (
                <div className="boss-progress" aria-label={`Stage ${bossStageNumber} of ${bossStageOrder.length}`}>
                  {bossStageOrder.map((stage, index) => (
                    <span className={index <= bossStageIndex() ? "active" : ""} key={stage}>{index + 1}</span>
                  ))}
                </div>
              ) : null}
            </header>

            {bossComplete ? (
              <div className="boss-complete-card">
                <strong>Great work.</strong>
                <p>You moved from recall into real vocabulary use, then completed a paragraph with context.</p>
                <p className="boss-loop-note">
                  {hasNextBossPack
                    ? `Ready for Pack ${bossPackNumber + 1}? The next clear is worth ${bossLoopReward(bossPackNumber)} gems and brings in a new set of stems, nonfiction words, and family words.`
                    : "You cleared all 10 packs. Replay from Pack 1 anytime to keep the words warm."}
                </p>
                <div className="boss-complete-actions">
                  <button className="button primary" onClick={() => startBossChallenge(hasNextBossPack ? bossLoop + 1 : 0)} type="button">
                    {hasNextBossPack ? "Challenge Next Pack" : "Replay From Pack 1"}
                  </button>
                  <button className="button" onClick={() => setScreen("select")} type="button">Back to Games</button>
                </div>
              </div>
            ) : (
              <>
                <div className="boss-stage-count">Stage {bossStageNumber} · {Math.min(bossStep + 1, bossStageTotalCount)}/{bossStageTotalCount}</div>

                {bossStage === "recall" && bossRecallStem ? (
                  <div className="boss-card">
                    <small>Choose the stem</small>
                    <h2>{bossRecallStem.meaning}</h2>
                    <div className="boss-choice-grid">
                      {optionsFor(bossRecallStem).map((option) => (
                        <button key={option} onClick={() => chooseBossRecall(option)} type="button">{option}</button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {bossStage === "forge" && bossForgeItem ? (
                  <div className="boss-card">
                    <small>Choose the family word</small>
                    <h2>{bossForgeItem.meaning}</h2>
                    <p className="boss-root-clue">root family: {bossForgeItem.stem}</p>
                    <div className="boss-choice-grid">
                      {shuffle([bossForgeItem.word, ...bossForgeItems().filter((item) => item.word !== bossForgeItem.word).slice(0, 3).map((item) => item.word)]).map((option) => (
                        <button key={option} onClick={() => chooseBossForge(option)} type="button">{option}</button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {bossStage === "context" && bossContextItem ? (
                  <div className="boss-card context">
                    <small>Choose in context</small>
                    <h2>{bossContextItem.sentence}</h2>
                    <p className="boss-root-clue">{bossContextItem.clue}</p>
                    <div className="boss-choice-grid">
                      {bossContextItem.options.map((option) => (
                        <button key={option} onClick={() => chooseBossContext(option)} type="button">{option}</button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {bossStage === "passage" ? (
                  <div className="boss-card passage">
                    <small>Complete the passage</small>
                    <div className="boss-passage">
                      {bossPassageBlanks.map((blank, index) => (
                        <span className={bossPassageMistakes.includes(blank.id) ? "needs-work" : ""} key={blank.id}>
                          {bossPassageText[index]}
                          <select
                            aria-label={blank.definition}
                            onChange={(event) => setBossPassageBlank(blank.id, event.target.value)}
                            value={bossPassageAnswers[blank.id] ?? ""}
                          >
                            <option value="">choose</option>
                            {blank.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          {bossPassageMistakes.includes(blank.id) ? (
                            <em className="boss-passage-hint">
                              {blank.definition}
                            </em>
                          ) : null}
                        </span>
                      ))}
                      <span>{bossPassageText[bossPassageText.length - 1]}</span>
                    </div>
                    <button className="button primary" onClick={checkBossPassage} type="button">Check Passage</button>
                  </div>
                ) : null}

                {bossFeedback ? <div className={`boss-feedback ${feedbackTone(bossFeedback)}`}>{bossFeedback}</div> : null}
              </>
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
  const inputKey = question && "answer" in question
    ? `${question.type}-${"stem" in question ? question.stem.id : "word"}-${question.answer}`
    : "";

  useEffect(() => {
    if (!question || locked || !("answer" in question) || question.type === "pick" || question.type === "tf") return;
    onAnswerChange("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [inputKey]);

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
      <input
        ref={inputRef}
        autoComplete="off"
        autoCorrect="off"
        disabled={locked}
        key={inputKey}
        name={`battle-answer-${inputKey}`}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder="输入答案"
        spellCheck={false}
        value={answer}
      />
    </form>
  );
}
