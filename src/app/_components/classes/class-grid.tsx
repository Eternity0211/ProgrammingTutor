"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { ClassCard } from "./class-card";
import { CreateClassDialog } from "./create-class-dialog";
import { JoinClassDialog } from "./join-class-dialog";
import { Button } from "@/app/_components/ui/button";
import { useTheme } from "next-themes";
import { getCardBgColor } from "@/lib/utils";
import { UserClassroom } from "@/lib/types/class-types";
import { Role } from "@prisma/client";
import { ClassGridSkeleton } from "./skeleton/class-grid-skeleton";

export function ClassGrid({
  classes,
  role,
}: {
  classes: UserClassroom[];
  role: Role;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait until the client has mounted to avoid hydration mismatches.
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddClick = () => {
    if (role === "FACULTY") {
      setCreateOpen(true);
    } else {
      setJoinOpen(true);
    }
  };

  if (!mounted) return <ClassGridSkeleton />;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="outline"
            onClick={handleAddClick}
            className="group relative flex h-[280px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-foreground shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors group-hover:bg-primary">
              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
            </div>
            <p className="text-base font-semibold">
              {role === "FACULTY" ? "Create Class" : "Join Class"}
            </p>
          </Button>
        </motion.div>

        {classes.map((classItem, index) => (
          <motion.div
            key={classItem.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
          >
            <ClassCard
              {...classItem}
              backgroundColor={getCardBgColor(resolvedTheme, classItem.id)}
              canEdit={role === "FACULTY"} // Pass canEdit based on role
            />
          </motion.div>
        ))}
      </div>

      <CreateClassDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinClassDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
