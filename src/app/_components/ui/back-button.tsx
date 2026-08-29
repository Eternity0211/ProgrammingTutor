"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

export function BackButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.history.back()}
      className="gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Overview
    </Button>
  );
}
