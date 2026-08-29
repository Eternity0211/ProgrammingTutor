"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinClassUsingCode } from "@/server/actions/class-actions";

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinClassDialog({ open, onOpenChange }: JoinClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await joinClassUsingCode(code);

      if (result.status === "success") {
        toast.success("Joined Class Successfully!");
        onOpenChange(false);
        setCode("");
        router.push(`/classes/${code}`);
      } else {
        toast.warning("Failed to join class");
      }
    } catch (error) {
      console.error("Error while joining class:", error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Class</DialogTitle>
          <DialogDescription>
            Enter the class code provided by your teacher to join the class.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Class Code</Label>
            <Input
              id="code"
              placeholder="Enter 6-digit class code"
              className="border-border text-lg tracking-wider"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
