"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog-modified";
import { cn } from "@/lib/utils";
import { useState } from "react";
import DotPattern from "../ui/dot-pattern";
import AuthWrapper from "./auth-wrapper";

export default function AuthPopup() {
  const [isOpen, setIsOpen] = useState(true);

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent
        className="w-[calc(100%-1rem)] sm:w-auto sm:min-w-[420px] max-w-[95vw] sm:max-w-fit rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-lg sm:py-6 sm:px-0"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <>
          <DialogHeader>
            <DotPattern
              width={10}
              height={10}
              cx={1}
              cy={0}
              cr={1}
              className={cn(
                "[mask-image:linear-gradient(to_bottom,rgba(255,255,255,1)_0%,rgba(255,255,255,0.5)_60%,transparent_100%)] absolute inset-0 h-[50%] opacity-90",
              )}
            />
            <DialogTitle className="text-center text-2xl">
              Continue with an account
            </DialogTitle>
            <DialogDescription className="text-md text-center">
              You must log in or register to continue.
            </DialogDescription>
          </DialogHeader>
          <AuthWrapper />
        </>
      </DialogContent>
    </Dialog>
  );
}
