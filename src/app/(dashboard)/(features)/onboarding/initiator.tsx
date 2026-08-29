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
      toast.error("Please select a role before proceeding.");
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
      toast.success("Onboarding complete!");
      setIsOnboardingComplete(true);
      router.refresh();
      onClose();
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h2 className="mt-2 text-2xl font-bold">Select Your Role</h2>
      </div>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Are you a Faculty or a Student?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button
              variant={role === "FACULTY" ? "default" : "outline"}
              onClick={() => setRole("FACULTY")}
              disabled={isSubmitting}
            >
              Faculty
            </Button>
            <Button
              variant={role === "STUDENT" ? "default" : "outline"}
              onClick={() => setRole("STUDENT")}
              disabled={isSubmitting}
            >
              Student
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting || !role}>
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
