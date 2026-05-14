import { Prisma, PrismaClient, type ExerciseType, type KnowledgePointType } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type LegacyCourse = {
  slug: string;
  title: string;
  subtitle?: string;
  stems: Array<{ order: number; key: string; meaning: string; examples: string[] }>;
  vocabulary: Array<{
    order: number;
    word: string;
    ipa?: string;
    partOfSpeech?: string;
    definition: string;
    lessonLabel?: string | null;
    category?: string | null;
  }>;
  lessons: Array<{
    legacyKey: string;
    title: string;
    order: number;
    kind: string;
    exercises: Array<{
      type: ExerciseType;
      prompt: string;
      options?: unknown;
      answer: unknown;
      order: number;
      source: string;
      group?: string;
      legacyIndex?: number;
    }>;
  }>;
  gameLevels: Array<{
    id: number;
    title: string;
    subtitle?: string;
    type: string;
    description?: string;
    indices: unknown;
    timeLimitSeconds: number;
    isBoss: boolean;
  }>;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function romanToInt(roman: string) {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  return roman
    .toUpperCase()
    .split("")
    .reduce((total, char, index, chars) => {
      const current = values[char] ?? 0;
      const next = values[chars[index + 1]] ?? 0;
      return total + (current < next ? -current : current);
    }, 0);
}

function lessonOrderFromLabel(label?: string | null) {
  const roman = label?.match(/Lesson\s+([IVXL]+)/i)?.[1];
  return roman ? romanToInt(roman) : null;
}

async function main() {
  const file = path.join(process.cwd(), "data", "legacy", "caesars-english-ii.course.json");
  const courseSeed = JSON.parse(fs.readFileSync(file, "utf8")) as LegacyCourse;

  const existing = await prisma.course.findUnique({ where: { slug: courseSeed.slug } });
  if (existing) {
    await prisma.$transaction([
      prisma.generatedContentJob.deleteMany({ where: { courseId: existing.id } }),
      prisma.uploadedMaterial.deleteMany({ where: { courseId: existing.id } }),
      prisma.answerAttempt.deleteMany({ where: { courseId: existing.id } }),
      prisma.mistakeRecord.deleteMany({ where: { courseId: existing.id } }),
      prisma.learningProgress.deleteMany({ where: { courseId: existing.id } }),
      prisma.gameLevel.deleteMany({ where: { courseId: existing.id } }),
      prisma.exercise.deleteMany({ where: { courseId: existing.id } }),
      prisma.vocabularyItem.deleteMany({ where: { courseId: existing.id } }),
      prisma.knowledgePoint.deleteMany({ where: { courseId: existing.id } }),
      prisma.lesson.deleteMany({ where: { courseId: existing.id } }),
      prisma.courseUnit.deleteMany({ where: { courseId: existing.id } })
    ]);
  }

  const course = await prisma.course.upsert({
    where: { slug: courseSeed.slug },
    create: {
      slug: courseSeed.slug,
      title: courseSeed.title,
      subtitle: courseSeed.subtitle,
      description: "Seeded from the original LatinFun static HTML project.",
      status: "PUBLISHED"
    },
    update: {
      title: courseSeed.title,
      subtitle: courseSeed.subtitle,
      description: "Seeded from the original LatinFun static HTML project.",
      status: "PUBLISHED"
    }
  });

  const unit = await prisma.courseUnit.create({
    data: {
      courseId: course.id,
      title: "Core Course",
      slug: "core-course",
      order: 1
    }
  });

  const kpByKey = new Map<string, string>();
  for (const stem of courseSeed.stems) {
    const kp = await prisma.knowledgePoint.create({
      data: {
        courseId: course.id,
        type: "STEM" satisfies KnowledgePointType,
        key: stem.key,
        title: stem.key,
        meaning: stem.meaning,
        examples: toJson(stem.examples),
        sourceOrder: stem.order
      }
    });
    kpByKey.set(stem.key, kp.id);
  }

  const lessonByOrder = new Map<number, string>();
  for (const lessonSeed of courseSeed.lessons) {
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        unitId: unit.id,
        slug: slugify(lessonSeed.legacyKey),
        title: lessonSeed.title,
        kind: lessonSeed.kind,
        order: lessonSeed.order
      }
    });
    lessonByOrder.set(lessonSeed.order, lesson.id);

    for (const exerciseSeed of lessonSeed.exercises) {
      await prisma.exercise.create({
        data: {
          courseId: course.id,
          lessonId: lesson.id,
          type: exerciseSeed.type,
          prompt: exerciseSeed.prompt,
          options: exerciseSeed.options ? toJson(exerciseSeed.options) : undefined,
          correctAnswer: toJson(exerciseSeed.answer),
          source: exerciseSeed.source,
          group: exerciseSeed.group,
          order: exerciseSeed.order,
          metadata: {
            legacyKey: lessonSeed.legacyKey,
            legacyIndex: exerciseSeed.legacyIndex
          }
        }
      });
    }
  }

  for (const item of courseSeed.vocabulary) {
    const lessonOrder = lessonOrderFromLabel(item.lessonLabel);
    const lessonId = lessonOrder ? lessonByOrder.get(lessonOrder) : undefined;
    await prisma.vocabularyItem.create({
      data: {
        courseId: course.id,
        lessonId,
        word: item.word,
        ipa: item.ipa || undefined,
        partOfSpeech: item.partOfSpeech || undefined,
        definition: item.definition,
        category: item.category || undefined,
        sourceOrder: item.order,
        metadata: {
          lessonLabel: item.lessonLabel
        }
      }
    });

    await prisma.knowledgePoint.create({
      data: {
        courseId: course.id,
        type: "VOCABULARY" satisfies KnowledgePointType,
        key: item.word,
        title: item.word,
        meaning: item.definition,
        sourceOrder: item.order,
        metadata: {
          ipa: item.ipa,
          partOfSpeech: item.partOfSpeech,
          lessonLabel: item.lessonLabel,
          category: item.category
        }
      }
    });
  }

  for (const [index, level] of courseSeed.gameLevels.entries()) {
    await prisma.gameLevel.create({
      data: {
        courseId: course.id,
        legacyId: level.id,
        title: level.title,
        subtitle: level.subtitle,
        type: level.type,
        description: level.description,
        indices: toJson(level.indices),
        timeLimitSeconds: level.timeLimitSeconds,
        isBoss: level.isBoss,
        order: index + 1
      }
    });
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash("LatinFun123!", 12);

  const adminEmail = "admin@latinfun.local";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "LatinFun Admin",
      passwordHash,
      role: "ADMIN",
      profile: {
        create: {
          displayName: "LatinFun Admin"
        }
      }
    },
    update: {
      name: "LatinFun Admin",
      role: "ADMIN"
    }
  });

  const studentEmail = "student@latinfun.local";
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    create: {
      email: studentEmail,
      name: "Demo Student",
      passwordHash,
      role: "STUDENT",
      profile: {
        create: {
          displayName: "Demo Student",
          grade: "Demo",
          classroom: "LatinFun"
        }
      }
    },
    update: {
      name: "Demo Student",
      role: "STUDENT"
    }
  });

  for (const user of [admin, student]) {
  const existingProgress = await prisma.learningProgress.findFirst({
    where: {
      userId: user.id,
      courseId: course.id,
      lessonId: null,
      knowledgePointId: null
    }
  });
  if (existingProgress) {
    await prisma.learningProgress.update({
      where: { id: existingProgress.id },
      data: { status: "IN_PROGRESS" }
    });
  } else {
    await prisma.learningProgress.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: "IN_PROGRESS",
        masteryScore: 0
      }
    });
  }
  }

  console.log(
    `Seeded ${course.title} with ${courseSeed.stems.length} stems, ${courseSeed.vocabulary.length} vocabulary items, ${courseSeed.lessons.length} lessons.`
  );
  console.log("Default admin: admin@latinfun.local / LatinFun123!");
  console.log("Demo student: student@latinfun.local / LatinFun123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
