import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

function nextLink(basePath: string, next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return basePath;
  return `${basePath}?next=${encodeURIComponent(next)}`;
}

export default async function LoginPage({ searchParams }: Props) {
  const next = (await searchParams)?.next;

  return (
    <main className="main narrow auth-page">
      <h1 className="page-title">登录</h1>
      <p className="lede">登录后，练习记录、错题和课程进度会保存到后端，并支持跨设备同步。</p>
      <AuthForm mode="login" />
      <p className="form-note">
        还没有账号？ <Link href={nextLink("/register", next)}>创建一个学生账号</Link>
      </p>
    </main>
  );
}
