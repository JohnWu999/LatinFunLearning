import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

function nextLink(basePath: string, next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return basePath;
  return `${basePath}?next=${encodeURIComponent(next)}`;
}

export default async function RegisterPage({ searchParams }: Props) {
  const next = (await searchParams)?.next;

  return (
    <main className="main narrow auth-page">
      <h1 className="page-title">创建账号</h1>
      <p className="lede">第一版账号系统使用邮箱和密码，后续可以接入 Google、Classroom 或学校统一登录。</p>
      <AuthForm mode="register" />
      <p className="form-note">
        已有账号？ <Link href={nextLink("/login", next)}>返回登录</Link>
      </p>
    </main>
  );
}
