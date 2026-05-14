"use client";

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button className="nav-button" disabled={pending} onClick={logout} type="button">
      {pending ? "退出中" : "退出"}
    </button>
  );
}
