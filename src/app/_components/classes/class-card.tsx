"use client";

import Link from "next/link";
import { MoreVertical, Users, FolderClosed, Copy } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/app/_components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { UserClassroom } from "@/lib/types/class-types";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface ClassCardProps extends UserClassroom {
  backgroundColor: string;
  canEdit?: boolean;
}

export function ClassCard({
  code,
  name,
  section,
  facultyName,
  backgroundColor,
  canEdit = false,
}: ClassCardProps) {
  const handleCopy = (text: string) => {
    copyToClipboard(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border bg-background transition-all hover:shadow-lg">
      <Link href={`/classes/${code}`} className="absolute inset-0 z-10">
        <span className="sr-only">View class</span>
      </Link>

      <CardHeader className="relative h-32 p-0">
        <div className="absolute inset-0 z-0" style={{ backgroundColor }}></div>
        <div className="relative z-10 flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium">{name}</h3>
              <p className="text-sm opacity-90">{section}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="z-20 h-8 w-8 shrink-0 rounded-full text-white/90 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCopy(code)}>
                  {"Copy class code"}
                  <Copy className="ml-2 h-4 w-4 opacity-70" />
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem>
                    <Link href={`/classes/${code}?tab=settings`}>
                      Edit class details
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm opacity-90">{facultyName}</p>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          Access assignments, view grades, and collaborate with your classmates.
        </p>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 p-2">
        <Link href={`/classes/${code}?tab=people`} className="z-10">
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="text-sm">People</span>
          </Button>
        </Link>
        <Link href={`/classes/${code}?tab=assignments`} className="z-10">
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            <FolderClosed className="h-4 w-4" />
            <span className="text-sm">Files</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
