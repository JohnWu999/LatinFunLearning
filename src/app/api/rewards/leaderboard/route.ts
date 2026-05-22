import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { getRewardLeaderboard } from "@/lib/rewards";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ?? undefined;
    const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit") ?? 10)));
    const leaderboard = await getRewardLeaderboard({ courseId, limit });

    return ok({ leaderboard });
  } catch (error) {
    return handleApiError(error);
  }
}
