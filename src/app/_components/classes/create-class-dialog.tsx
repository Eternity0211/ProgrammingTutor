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
import { createClass } from "@/server/actions/class-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({
  open,
  onOpenChange,
}: CreateClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createClass({ name, section });

      if (result.status === "success") {
        toast.success("Class created successfully!");
        onOpenChange(false);
        setName("");
        setSection("");
        router.refresh();
      } else {
        toast.warning("Failed to create class");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Class</DialogTitle>
          <DialogDescription>
            Create a new class for your students. They can join using the class
            code that will be generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name"
              placeholder="e.g., Data Structures and Algorithms"
              className="border-border"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              placeholder="e.g., CS201"
              className="border-border"
              value={section}
              onChange={(e) => setSection(e.target.value)}
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
              {loading ? "Creating..." : "Create Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
