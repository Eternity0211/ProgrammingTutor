"use client";

import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import {
  updateOnboardingStatus,
  updateUserRole,
} from "@/server/actions/user-actions";
import { Role } from "@prisma/client";
import { useClientSession } from "@/hooks/use-auth-session";
import { useRouter } from "next/navigation";

interface OnboardingInitiatorProps {
  onClose: () => void;
}

export default function OnboardingInitiator({
  onClose,
}: OnboardingInitiatorProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshSession } = useClientSession();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!role) {
      toast.error("请先选择您的身份");
      return;
    }
    setIsSubmitting(true);
    const roleUpdate = await updateUserRole(role);
    const onboardingUpdate = await updateOnboardingStatus(true);
    await refreshSession();
    if (
      roleUpdate.status === "success" &&
      onboardingUpdate.status === "success"
    ) {
      toast.success("身份确认完成！");
      setIsOnboardingComplete(true);
      router.refresh();
      onClose();
    } else {
      toast.error("提交失败，请重试。");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h2 className="mt-2 text-2xl font-bold">确认您的身份</h2>
      </div>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            请确认您的身份
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button
              variant={role === "FACULTY" ? "default" : "outline"}
              onClick={() => setRole("FACULTY")}
              disabled={isSubmitting}
            >
              老师
            </Button>
            <Button
              variant={role === "STUDENT" ? "default" : "outline"}
              onClick={() => setRole("STUDENT")}
              disabled={isSubmitting}
            >
              学生
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting || !role}>
          {isSubmitting ? "提交中..." : "继续"}
        </Button>
      </div>
    </div>
  );
}
