import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="main narrow">
      <h1 className="page-title">登录</h1>
      <p className="lede">登录后，练习记录、错题和课程进度会保存到后端，并支持跨设备同步。</p>
      <AuthForm mode="login" />
      <p className="form-note">
        还没有账号？ <Link href="/register">创建一个学生账号</Link>
      </p>
    </main>
  );
}
