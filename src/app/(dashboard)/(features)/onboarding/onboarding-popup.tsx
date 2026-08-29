"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog-modified";
import { Rocket01Icon } from "hugeicons-react";
import OnboardingInitiator from "./initiator";
import { useState } from "react";

export default function OnboardingPopup() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  const handleCloseDialog = () => {
    setIsOnboardingComplete(true);
  };

  if (isOnboardingComplete) {
    return null;
  }

  return (
    <Dialog open={!isOnboardingComplete} onOpenChange={handleCloseDialog}>
      <DialogContent
        className="w-[calc(100%-1rem)] sm:w-auto sm:min-w-[420px] max-w-[95vw] sm:max-w-fit rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-lg"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>
            <Rocket01Icon className="mx-auto h-12 w-12 text-primary" />
          </DialogTitle>
        </DialogHeader>
        <OnboardingInitiator onClose={handleCloseDialog} />
      </DialogContent>
    </Dialog>
  );
}
