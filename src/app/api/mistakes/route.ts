import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const mistakeSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1).optional().nullable(),
  exerciseId: z.string().min(1).optional().nullable(),
  knowledgePointId: z.string().min(1).optional().nullable(),
  category: z.enum(["Latin Stems", "Classic Words", "Analogies & Antonyms", "Sentence Writing"]),
  itemKey: z.string().min(1).max(120),
  itemLabel: z.string().min(1).max(160),
  mistakeType: z.string().min(1).max(80),
  sourceModule: z.string().min(1).max(100),
  prompt: z.string().max(500).optional().nullable(),
  userAnswer: z.unknown().optional().nullable(),
  correctAnswer: z.unknown().optional().nullable()
});

const masterMistakeSchema = z.object({
  courseId: z.string().min(1),
  category: z.enum(["Latin Stems", "Classic Words", "Analogies & Antonyms", "Sentence Writing"]).optional(),
  itemKey: z.string().min(1).max(120).optional(),
  itemLabel: z.string().min(1).max(160).optional(),
  sourceModule: z.string().min(1).max(100).optional()
}).refine((body) => body.itemKey || body.itemLabel, {
  message: "itemKey or itemLabel is required"
});

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId") ?? undefined;

    const mistakes = await prisma.mistakeRecord.findMany({
      where: {
        userId: user.id,
        courseId,
        mastered: false
      },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        lesson: { select: { id: true, slug: true, title: true } },
        exercise: true,
        knowledgePoint: true
      },
      orderBy: { lastSeenAt: "desc" }
    });

    return ok(mistakes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = mistakeSchema.parse(await request.json());
    const existingMistake = await prisma.mistakeRecord.findFirst({
      where: {
        userId: user.id,
        courseId: body.courseId,
        category: body.category,
        itemKey: body.itemKey,
        mistakeType: body.mistakeType,
        sourceModule: body.sourceModule,
        mastered: false
      }
    });

    const data = {
      lessonId: body.lessonId ?? undefined,
      exerciseId: body.exerciseId ?? undefined,
      knowledgePointId: body.knowledgePointId ?? undefined,
      category: body.category,
      itemKey: body.itemKey,
      itemLabel: body.itemLabel,
      mistakeType: body.mistakeType,
      sourceModule: body.sourceModule,
      prompt: body.prompt ?? undefined,
      userAnswer: toJson(body.userAnswer),
      correctAnswer: toJson(body.correctAnswer),
      mastered: false,
      lastSeenAt: new Date()
    };

    const mistake = existingMistake
      ? await prisma.mistakeRecord.update({
          where: { id: existingMistake.id },
          data: {
            ...data,
            wrongCount: { increment: 1 },
            correctAfterWrongCount: 0
          }
        })
      : await prisma.mistakeRecord.create({
          data: {
            userId: user.id,
            courseId: body.courseId,
            ...data,
            wrongCount: 1
          }
        });

    return ok(mistake, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = masterMistakeSchema.parse(await request.json());
    const identity = [
      body.itemKey ? { itemKey: body.itemKey } : undefined,
      body.itemLabel ? { itemLabel: body.itemLabel } : undefined
    ].filter((item): item is { itemKey: string } | { itemLabel: string } => Boolean(item));

    const result = await prisma.mistakeRecord.updateMany({
      where: {
        userId: user.id,
        courseId: body.courseId,
        mastered: false,
        ...(body.category ? { category: body.category } : {}),
        ...(body.sourceModule ? { sourceModule: body.sourceModule } : {}),
        OR: identity
      },
      data: {
        mastered: true,
        correctAfterWrongCount: { increment: 1 },
        lastSeenAt: new Date()
      }
    });

    return ok({ mastered: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
