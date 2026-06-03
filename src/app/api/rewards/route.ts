import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { GEM_LEDGER_MODE } from "@/lib/rewards";
import { createRewardEntry, findRewardBySourceKey, getPlayerRewardSummary } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
import { rewardSchema } from "@/lib/validators";

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}

function whackHitWord(sourceKey: string) {
  const match = sourceKey.match(/^word-whack-hit-\d+-\d+-(.+)-\d+$/);
  return match ? normalizeWord(match[1] ?? "") : "";
}

function parseRewardAnswer(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { amount: 0, sourceKey: "" };
  const record = value as { amount?: unknown; sourceKey?: unknown };
  return {
    amount: Number(record.amount ?? 0),
    sourceKey: typeof record.sourceKey === "string" ? record.sourceKey : ""
  };
}

async function whackHitAward({
  userId,
  courseId,
  sourceKey,
  requestedAmount
}: {
  userId: string;
  courseId: string;
  sourceKey: string;
  requestedAmount: number;
}) {
  const word = whackHitWord(sourceKey);
  if (!word || requestedAmount <= 0) return requestedAmount;

  const [ledgerEntries, openMistake] = await Promise.all([
    prisma.answerAttempt.findMany({
      where: {
        userId,
        courseId,
        gameMode: GEM_LEDGER_MODE
      },
      select: { answer: true }
    }),
    prisma.mistakeRecord.findFirst({
      where: {
        userId,
        courseId,
        category: "Classic Words",
        itemKey: word,
        sourceModule: "Whack-a-Word",
        mastered: false
      },
      select: { id: true }
    })
  ]);

  const previousPositiveHits = ledgerEntries.filter((entry) => {
    const reward = parseRewardAnswer(entry.answer);
    return reward.amount > 0 && whackHitWord(reward.sourceKey) === word;
  }).length;

  if (previousPositiveHits === 0) return requestedAmount;
  if (openMistake) return Math.min(2, requestedAmount);
  return 0;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ?? undefined;
    const summary = await getPlayerRewardSummary(user.id, courseId);

    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = rewardSchema.parse(await request.json());
    const amount = body.source === "classic-word-quest" && body.sourceKey.startsWith("word-whack-hit-")
      ? await whackHitAward({
          userId: user.id,
          courseId: body.courseId,
          sourceKey: body.sourceKey,
          requestedAmount: body.amount
        })
      : body.amount;
    const existingReward =
      amount > 0 && !body.sourceKey.startsWith("word-whack-hit-") ? await findRewardBySourceKey(user.id, body.courseId, body.sourceKey) : null;

    if (!existingReward) {
      await createRewardEntry({
        userId: user.id,
        courseId: body.courseId,
        amount,
        source: body.source,
        sourceKey: body.sourceKey,
        reason: body.reason
      });
    }

    const summary = await getPlayerRewardSummary(user.id, body.courseId);

    return ok({
      ...summary,
      awarded: existingReward ? 0 : amount,
      duplicate: Boolean(existingReward)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
