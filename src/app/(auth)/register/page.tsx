"use client";

import { useState } from "react";
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
import { registerUser } from "@/server/actions/auth-actions";
import { toast } from "sonner";

export default function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !name || !email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码长度至少6位");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await registerUser(name, email, password, role);
      if (result.success) {
        toast.success("注册成功，请登录");
        router.push(ROUTES.LOGIN);
      } else {
        setError(result.error || "注册失败");
      }
    } catch {
      setError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">注册</CardTitle>
        <CardDescription className="text-center">
          选择身份并填写信息创建账号
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
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
                required
                disabled={loading}
              />
            </div>
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
                placeholder="至少6位"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !role ||
                !name ||
                !email ||
                !password ||
                !confirmPassword
              }
            >
              {loading ? "注册中..." : "注册"}
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href={ROUTES.LOGIN} className="text-primary underline">
            登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
