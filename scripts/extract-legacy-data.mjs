import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const outDir = path.join(root, "data", "legacy");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function evaluateConst(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*([\\s\\S]*?);\\n`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Unable to find ${constName}`);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`globalThis.value = ${match[1]};`, context);
  return context.value;
}

function evaluateVocabularyData(source) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.value = VOCAB_DATA;`, context);
  return context.value;
}

function stripTags(input) {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVocabularyEntries(source) {
  const entries = [];
  const seen = new Set();
  const entryPattern = /<div class="vocab-entry">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  while ((match = entryPattern.exec(source))) {
    const block = match[1];
    const word = block.match(/<span class="vocab-word">([\s\S]*?)<\/span>/)?.[1];
    const ipa = block.match(/<span class="vocab-ipa">([\s\S]*?)<\/span>/)?.[1];
    const pos = block.match(/<span class="vocab-pos">([\s\S]*?)<\/span>/)?.[1];
    const lesson = block.match(/<span class="vocab-lesson">([\s\S]*?)<\/span>/)?.[1];
    const definition = block.match(/<div class="vocab-def">([\s\S]*?)<\/div>/)?.[1];
    if (!word || !definition) continue;
    const normalizedWord = stripTags(word).toLowerCase();
    if (seen.has(normalizedWord)) continue;
    seen.add(normalizedWord);

    const label = stripTags(lesson ?? "");
    const [lessonLabel, category] = label.split("·").map((part) => part.trim());
    entries.push({
      order: entries.length + 1,
      word: stripTags(word),
      ipa: stripTags(ipa ?? ""),
      partOfSpeech: stripTags(pos ?? ""),
      definition: stripTags(definition),
      lessonLabel: lessonLabel || null,
      category: category || null
    });
  }
  return entries;
}

function toExercise(type, prompt, options, answer, order, extra = {}) {
  return {
    type,
    prompt,
    options,
    answer,
    order,
    source: "legacy-static-site",
    ...extra
  };
}

function parseAnswerLetter(answerString, index) {
  const part = (answerString || "").split(",")[index];
  return part?.trim().split(".")[1]?.trim() ?? "";
}

function buildLessons(vocabData) {
  return Object.entries(vocabData).map(([legacyKey, lesson], lessonIndex) => {
    const exercises = [];
    lesson.matching.forEach((pair, index) => {
      exercises.push(
        toExercise("MATCHING", pair[0], [pair[1]], pair[1], exercises.length + 1, {
          group: "matching",
          legacyIndex: index
        })
      );
    });

    lesson.context.forEach((question, index) => {
      const answerLetter = parseAnswerLetter(lesson.answers["上下文"], index);
      const option = question.options.find((item) =>
        item.toLowerCase().startsWith(`${answerLetter}.`)
      );
      exercises.push(
        toExercise("MULTIPLE_CHOICE", question.question, question.options, option ?? answerLetter, exercises.length + 1, {
          group: "context",
          legacyIndex: index
        })
      );
    });

    lesson.synonym.forEach((question, index) => {
      const answerLetter = parseAnswerLetter(lesson.answers["同义"], index);
      const option = question.options.find((item) =>
        item.toLowerCase().startsWith(`${answerLetter}.`)
      );
      exercises.push(
        toExercise("MULTIPLE_CHOICE", question.question, question.options, option ?? answerLetter, exercises.length + 1, {
          group: "synonym",
          legacyIndex: index
        })
      );
    });

    lesson.antonym.forEach((question, index) => {
      const answerLetter = parseAnswerLetter(lesson.answers["反义"], index);
      const option = question.options.find((item) =>
        item.toLowerCase().startsWith(`${answerLetter}.`)
      );
      exercises.push(
        toExercise("MULTIPLE_CHOICE", question.question, question.options, option ?? answerLetter, exercises.length + 1, {
          group: "antonym",
          legacyIndex: index
        })
      );
    });

    return {
      legacyKey,
      title: lesson.name.replace(" 练习题", ""),
      order: lessonIndex + 1,
      kind: lesson.name.includes("LATIN") ? "LATIN_STEMS" : "CLASSIC_WORDS",
      answers: lesson.answers,
      exercises
    };
  });
}

ensureDir(outDir);

const battleHtml = fs.readFileSync(path.join(root, "ce2-battle.html"), "utf8");
const vocabJs = fs.readFileSync(path.join(root, "vocab_practice_data.js"), "utf8");
const learningHtml = fs.readFileSync(path.join(root, "Learning.html"), "utf8");

const course = {
  slug: "caesars-english-ii",
  title: "Caesar's English II",
  subtitle: "LatinFun classical vocabulary learning platform seed",
  source: {
    repository: "https://github.com/JohnWu999/LatinFunLearning",
    extractedFrom: [
      "ce2-battle.html",
      "vocab-practice.html",
      "vocab_practice_data.js",
      "Learning.html"
    ]
  },
  stems: evaluateConst(battleHtml, "ALL_STEMS").map((stem, index) => ({
    order: index + 1,
    key: stem.s,
    meaning: stem.m,
    examples: stem.ex
  })),
  vocabulary: extractVocabularyEntries(learningHtml),
  buildQuestions: evaluateConst(battleHtml, "BUILD_QUESTIONS").map((item, index) => ({
    order: index + 1,
    parts: item.parts,
    answer: item.ans,
    meaning: item.mean
  })),
  gameLevels: evaluateConst(battleHtml, "LEVELS").map((level) => ({
    id: level.id,
    title: level.title,
    subtitle: level.subtitle,
    type: level.type,
    description: level.desc,
    indices: level.indices,
    timeLimitSeconds: level.time,
    isBoss: Boolean(level.boss)
  })),
  lessons: buildLessons(evaluateVocabularyData(vocabJs))
};

fs.writeFileSync(
  path.join(outDir, "caesars-english-ii.course.json"),
  `${JSON.stringify(course, null, 2)}\n`
);

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: ["caesars-english-ii.course.json"],
      summary: {
        courses: 1,
        stems: course.stems.length,
        vocabulary: course.vocabulary.length,
        lessons: course.lessons.length,
        exercises: course.lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0),
        gameLevels: course.gameLevels.length
      }
    },
    null,
    2
  )}\n`
);

console.log(`Extracted ${course.title}: ${course.stems.length} stems, ${course.lessons.length} lessons.`);
