"use client";

import { useState } from "react";

type AuthMode = "login" | "register";
type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
type ApiErrorBody = {
  error?: {
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
    };
  };
};
type AuthResponseBody = {
  data?: {
    role?: UserRole;
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
  if (message === "Verification code is missing or expired") return "验证码已过期，请重新获取";
  if (message === "Verification code is incorrect") return "验证码不正确，请检查邮箱中的 6 位数字";
  if (message === "Please wait before requesting another code") return "验证码刚刚已发送，请稍等 1 分钟后再试";
  return message ?? "请求失败，请稍后再试";
}

function safeNextPath(role?: UserRole) {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return role === "ADMIN" ? "/admin" : "/dashboard";
  if (role === "ADMIN" && next === "/dashboard") return "/admin";
  return next;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");

  async function requestVerificationCode() {
    setError("");
    setNotice("");
    const email = registerEmail.trim();
    if (!email) {
      setError("请先填写邮箱，再获取验证码");
      return;
    }

    setCodePending(true);
    const response = await fetch(appPath("/api/auth/register-code"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      setError(friendlyError(body, mode));
      setCodePending(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as { data?: { delivered?: boolean; message?: string } } | null;
    setNotice(body?.data?.delivered ? "验证码已发送，请查收邮箱。" : "验证码已生成。本地测试环境请查看终端日志。");
    setCodePending(false);
  }

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
            password: String(formData.get("password") ?? ""),
            verificationCode: String(formData.get("verificationCode") ?? "")
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

    const body = (await response.json().catch(() => null)) as AuthResponseBody | null;
    window.location.href = appPath(safeNextPath(body?.data?.role));
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
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setRegisterEmail(event.target.value)}
          placeholder="student@example.com"
          required
          type="email"
        />
      </label>
      {mode === "register" ? (
        <label>
          邮箱验证码
          <span className="verification-row">
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              name="verificationCode"
              pattern="[0-9]{6}"
              placeholder="6 位验证码"
              required
            />
            <button className="button" disabled={codePending || pending} onClick={requestVerificationCode} type="button">
              {codePending ? "发送中..." : "获取验证码"}
            </button>
          </span>
        </label>
      ) : null}
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
      {notice ? <p className="form-notice">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
      </button>
    </form>
  );
}
