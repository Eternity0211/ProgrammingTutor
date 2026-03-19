"use client";
import { UserClassroom } from "@/lib/types/class-types";
import { getCardBgColor } from "@/lib/utils";
import { useTheme } from "next-themes";
interface ClassHeaderProps {
  classData: UserClassroom;
}

export function ClassHeader({ classData }: ClassHeaderProps) {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative">
      <div
        className="relative h-44 w-full rounded-2xl"
        style={{ backgroundColor: getCardBgColor(resolvedTheme, classData.id) }}
      ></div>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="absolute -top-16 flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1 text-white">
            <h1 className="text-2xl font-medium">{classData.name}</h1>
            <p className="text-white/90">
              {classData.section} • {classData.facultyName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
