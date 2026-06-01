import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const stateSchema = z.object({
  courseId: z.string().min(1),
  key: z.string().min(1).max(120),
  state: z.unknown()
});

function isJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length <= 300 && value.every((item) => isJsonValue(item, depth + 1));
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length <= 120 && entries.every(([key, item]) => key.length <= 120 && isJsonValue(item, depth + 1));
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const key = searchParams.get("key");

    if (!courseId || !key) return fail("Missing progress state key", 400);

    const record = await prisma.gameProgressState.findUnique({
      where: {
        userId_courseId_key: {
          userId: user.id,
          courseId,
          key
        }
      },
      select: {
        key: true,
        state: true,
        updatedAt: true
      }
    });

    return ok(record);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = stateSchema.parse(await request.json());

    if (!isJsonValue(body.state)) return fail("Progress state is too large or invalid", 422);
    const state = body.state === null ? Prisma.JsonNull : (body.state as Prisma.InputJsonValue);

    const record = await prisma.gameProgressState.upsert({
      where: {
        userId_courseId_key: {
          userId: user.id,
          courseId: body.courseId,
          key: body.key
        }
      },
      create: {
        userId: user.id,
        courseId: body.courseId,
        key: body.key,
        state
      },
      update: {
        state
      },
      select: {
        key: true,
        state: true,
        updatedAt: true
      }
    });

    return ok(record);
  } catch (error) {
    return handleApiError(error);
  }
}
