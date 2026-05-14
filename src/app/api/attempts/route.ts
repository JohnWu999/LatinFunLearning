import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { attemptSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = attemptSchema.parse(await request.json());

    const attempt = await prisma.answerAttempt.create({
      data: {
        userId: user.id,
        courseId: body.courseId,
        lessonId: body.lessonId ?? undefined,
        exerciseId: body.exerciseId ?? undefined,
        knowledgePointId: body.knowledgePointId ?? undefined,
        answer: toJson(body.answer),
        isCorrect: body.isCorrect,
        timeSpentMs: body.timeSpentMs ?? undefined,
        gameMode: body.gameMode ?? undefined
      }
    });

    const existingProgress = await prisma.learningProgress.findFirst({
      where: {
        userId: user.id,
        courseId: body.courseId,
        lessonId: body.lessonId ?? null,
        knowledgePointId: body.knowledgePointId ?? null
      }
    });
    if (existingProgress) {
      await prisma.learningProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: body.isCorrect ? "IN_PROGRESS" : "NEEDS_REVIEW",
          masteryScore: Math.max(0, Math.min(1, existingProgress.masteryScore + (body.isCorrect ? 0.05 : -0.1)))
        }
      });
    } else {
      await prisma.learningProgress.create({
        data: {
          userId: user.id,
          courseId: body.courseId,
          lessonId: body.lessonId ?? undefined,
          knowledgePointId: body.knowledgePointId ?? undefined,
          status: body.isCorrect ? "IN_PROGRESS" : "NEEDS_REVIEW",
          masteryScore: body.isCorrect ? 0.1 : 0
        }
      });
    }

    const existingMistake = await prisma.mistakeRecord.findFirst({
      where: {
        userId: user.id,
        courseId: body.courseId,
        exerciseId: body.exerciseId ?? null,
        knowledgePointId: body.knowledgePointId ?? null
      }
    });

    if (!body.isCorrect) {
      if (existingMistake) {
        await prisma.mistakeRecord.update({
          where: { id: existingMistake.id },
          data: {
            wrongCount: { increment: 1 },
            mastered: false,
            lastSeenAt: new Date()
          }
        });
      } else {
        await prisma.mistakeRecord.create({
          data: {
            userId: user.id,
            courseId: body.courseId,
            lessonId: body.lessonId ?? undefined,
            exerciseId: body.exerciseId ?? undefined,
            knowledgePointId: body.knowledgePointId ?? undefined,
            wrongCount: 1,
            mastered: false,
            lastSeenAt: new Date()
          }
        });
      }
    } else if (existingMistake && !existingMistake.mastered) {
      await prisma.mistakeRecord.update({
        where: { id: existingMistake.id },
        data: {
          correctAfterWrongCount: { increment: 1 },
          mastered: existingMistake.correctAfterWrongCount + 1 >= 2,
          lastSeenAt: new Date()
        }
      });
    }

    return ok(attempt, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
