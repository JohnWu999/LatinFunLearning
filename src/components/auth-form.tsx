"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

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

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "登录请求失败");
      setPending(false);
      return;
    }

    window.location.href = "/dashboard";
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
        <input autoComplete={mode === "login" ? "current-password" : "new-password"} name="password" required type="password" />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
      </button>
    </form>
  );
}
