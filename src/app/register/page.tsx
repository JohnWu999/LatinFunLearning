import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="main narrow">
      <h1 className="page-title">创建账号</h1>
      <p className="lede">第一版账号系统使用邮箱和密码，后续可以接入 Google、Classroom 或学校统一登录。</p>
      <AuthForm mode="register" />
      <p className="form-note">
        已有账号？ <Link href="/login">返回登录</Link>
      </p>
    </main>
  );
}
