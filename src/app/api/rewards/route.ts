import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { createRewardEntry, findRewardBySourceKey, getPlayerRewardSummary } from "@/lib/rewards";
import { rewardSchema } from "@/lib/validators";

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
    const existingReward =
      body.amount > 0 ? await findRewardBySourceKey(user.id, body.courseId, body.sourceKey) : null;

    if (!existingReward) {
      await createRewardEntry({
        userId: user.id,
        courseId: body.courseId,
        amount: body.amount,
        source: body.source,
        sourceKey: body.sourceKey,
        reason: body.reason
      });
    }

    const summary = await getPlayerRewardSummary(user.id, body.courseId);

    return ok({
      ...summary,
      awarded: existingReward ? 0 : body.amount,
      duplicate: Boolean(existingReward)
    });
  } catch (error) {
    return handleApiError(error);
  }
}
