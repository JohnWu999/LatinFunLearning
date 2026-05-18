import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GEM_LEDGER_MODE = "gem-ledger";

type RewardAnswer = {
  amount?: number;
  source?: string;
  sourceKey?: string;
  reason?: string;
};

function parseRewardAnswer(value: unknown): RewardAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RewardAnswer;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getPlayerRewardSummary(userId: string, courseId?: string) {
  const [students, attempts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true }
    }),
    prisma.answerAttempt.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        OR: [{ gameMode: GEM_LEDGER_MODE }, { isCorrect: true, NOT: { gameMode: GEM_LEDGER_MODE } }]
      },
      select: {
        userId: true,
        isCorrect: true,
        gameMode: true,
        answer: true
      }
    })
  ]);

  const gemsByUser = new Map(students.map((student) => [student.id, 0]));

  attempts.forEach((attempt) => {
    const current = gemsByUser.get(attempt.userId) ?? 0;
    if (attempt.gameMode === GEM_LEDGER_MODE) {
      const amount = Number(parseRewardAnswer(attempt.answer).amount ?? 0);
      gemsByUser.set(attempt.userId, Math.max(0, current + amount));
      return;
    }
    if (attempt.isCorrect) gemsByUser.set(attempt.userId, current + 1);
  });

  const rankedStudents = [...gemsByUser.entries()]
    .map(([id, gems]) => ({ id, gems }))
    .sort((a, b) => b.gems - a.gems || a.id.localeCompare(b.id));
  const rankIndex = rankedStudents.findIndex((student) => student.id === userId);

  return {
    gems: gemsByUser.get(userId) ?? 0,
    rank: rankIndex >= 0 ? rankIndex + 1 : null
  };
}

export async function findRewardBySourceKey(userId: string, courseId: string, sourceKey: string) {
  const ledgerEntries = await prisma.answerAttempt.findMany({
    where: {
      userId,
      courseId,
      gameMode: GEM_LEDGER_MODE
    },
    select: {
      id: true,
      answer: true
    }
  });

  return ledgerEntries.find((entry) => parseRewardAnswer(entry.answer).sourceKey === sourceKey) ?? null;
}

export async function createRewardEntry({
  userId,
  courseId,
  amount,
  source,
  sourceKey,
  reason
}: {
  userId: string;
  courseId: string;
  amount: number;
  source: string;
  sourceKey: string;
  reason: string;
}) {
  return prisma.answerAttempt.create({
    data: {
      userId,
      courseId,
      answer: toJson({ amount, source, sourceKey, reason }),
      isCorrect: amount > 0,
      gameMode: GEM_LEDGER_MODE
    }
  });
}
