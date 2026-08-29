"use client";

import { useState } from "react";
import { Copy, Link } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { UserClassroom } from "@/lib/types/class-types";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { deleteClass } from "@/server/actions/class-actions";
import { redirect, useRouter } from "next/navigation";

interface ClassSettingsTabProps {
  classData: UserClassroom;
  role?: Role;
}

export function ClassSettingsTab({ classData, role }: ClassSettingsTabProps) {
  const [name, setName] = useState(classData.name);
  const [section, setSection] = useState(classData.section);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    toast.success("Copied to clipboard");
  };

  const handleSave = async () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Show success message or redirect
    }, 1000);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await deleteClass(classData.code);
      if (response.status === "failed") {
        toast.error("Failed to delete class");
        return;
      }
      toast.success("Class deleted successfully");
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    } finally {
      setIsLoading(false);
      router.push("/classes");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
          <CardDescription>
            Update your class details and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-input"
              disabled={role === ("STUDENT" as Role)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="border-input"
              disabled={role === ("STUDENT" as Role)}
            />
          </div>
        </CardContent>
        {role !== ("STUDENT" as Role) && (
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" className="border-border">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className=" bg-primary-button text-white hover:bg-primary-button-hover disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Class Access</CardTitle>
          <CardDescription>
            Manage how students can join your class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Class Code</h4>
                <p className="text-xs text-muted-foreground">
                  Students can use this code to join your class
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium tracking-wider">
                  {classData.code}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopy(classData.code)}
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy class code</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Invite Link</h4>
                <p className="text-xs text-muted-foreground">
                  Share this link to invite people to your class
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => handleCopy(classData.inviteLink)}
                >
                  <Link className="h-4 w-4" />
                  <span>Copy Link</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {role == "FACULTY" && (
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for this class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <h4 className="text-sm font-semibold text-destructive">
                  Delete Class
                </h4>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this class and all its data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="text-white">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This action cannot be undone. This will permanently delete
                      the class and all associated assignments, questions, and
                      student submissions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border text-foreground">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
