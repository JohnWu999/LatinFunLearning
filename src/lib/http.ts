import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json({ error: { message: error.statusText || "Request failed" } }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return fail("Invalid request payload", 422, error.flatten());
  }

  console.error(error);
  return fail("Internal server error", 500);
}
