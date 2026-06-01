"use client";

type ProgressStateRecord<T> = {
  key: string;
  state: T;
  updatedAt: string;
};

function appPath(path: string) {
  const base = document.querySelector("meta[name='app-base-path']")?.getAttribute("content") ?? "";
  return `${base}${path}`;
}

export async function fetchProgressState<T>(courseId: string, key: string) {
  try {
    const response = await fetch(appPath(`/api/progress/state?courseId=${encodeURIComponent(courseId)}&key=${encodeURIComponent(key)}`));
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: ProgressStateRecord<T> | null };
    return payload.data?.state ?? null;
  } catch {
    return null;
  }
}

export async function saveProgressState(courseId: string, key: string, state: unknown) {
  try {
    await fetch(appPath("/api/progress/state"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, key, state })
    });
  } catch {
    // Browser storage remains the fallback when the network is unavailable.
  }
}
