"use client";

import { useState } from "react";

type AuthMode = "login" | "register";
type ApiErrorBody = {
  error?: {
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
    };
  };
};

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

function friendlyError(body: ApiErrorBody | null, mode: AuthMode) {
  const fieldErrors = body?.error?.details?.fieldErrors;
  const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat().find(Boolean) : undefined;
  if (firstFieldError) return firstFieldError;

  const message = body?.error?.message;
  if (message === "Invalid request payload") return mode === "register" ? "请检查昵称、邮箱和密码是否填写正确" : "请检查邮箱和密码";
  if (message === "Email is already registered") return "这个邮箱已经注册过了，可以直接登录";
  if (message === "Invalid email or password") return "邮箱或密码不正确";
  return message ?? "请求失败，请稍后再试";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          }
        : {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          };

    const response = await fetch(appPath(`/api/auth/${mode}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      setError(friendlyError(body, mode));
      setPending(false);
      return;
    }

    window.location.href = appPath("/dashboard");
  }

  return (
    <form className="form-card" onSubmit={submit}>
      {mode === "register" ? (
        <label>
          昵称
          <input name="name" placeholder="Michelle" required />
        </label>
      ) : null}
      <label>
        邮箱
        <input autoComplete="email" name="email" placeholder="student@example.com" required type="email" />
      </label>
      <label>
        密码
        <input
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 6 : undefined}
          name="password"
          required
          type="password"
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
      </button>
    </form>
  );
}
