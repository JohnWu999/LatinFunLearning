"use client";

import { useState } from "react";

function appPath(path: string) {
  const asset = document.querySelector<HTMLScriptElement | HTMLLinkElement>('script[src*="/_next/"], link[href*="/_next/"]');
  const source = asset instanceof HTMLScriptElement ? asset.src : asset?.href;
  const prefix = source ? new URL(source, window.location.origin).pathname.split("/_next/")[0] : "";
  return `${prefix}${path}`;
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch(appPath("/api/auth/logout"), { method: "POST" });
    window.location.href = appPath("/login");
  }

  return (
    <button className="nav-button" disabled={pending} onClick={logout} type="button">
      {pending ? "退出中" : "退出"}
    </button>
  );
}
