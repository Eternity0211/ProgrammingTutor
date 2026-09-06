"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/app/_components/ui/card";
import { Role } from "@prisma/client";
import { ROUTES } from "@/config/route";
import { checkEmailExists } from "@/server/actions/auth-actions";

export default function LoginPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !email || !password) return;

    setError(null);
    setNotRegistered(false);
    setLoading(true);

    try {
      const exists = await checkEmailExists(email);
      if (!exists) {
        setNotRegistered(true);
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码错误");
      } else {
        router.push(ROUTES.CLASSES);
        router.refresh();
      }
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
        <CardDescription className="text-center">
          选择身份并输入账号密码登录
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>身份</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === "STUDENT" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("STUDENT")}
                disabled={loading}
              >
                学生
              </Button>
              <Button
                type="button"
                variant={role === "FACULTY" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("FACULTY")}
                disabled={loading}
              >
                老师
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notRegistered && (
              <div className="text-sm space-y-2">
                <p className="text-destructive">该账号未注册</p>
                <Link href={ROUTES.REGISTER}>
                  <Button type="button" variant="outline" size="sm">
                    前往注册
                  </Button>
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !role || !email || !password}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link href={ROUTES.REGISTER} className="text-primary underline">
            注册
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
