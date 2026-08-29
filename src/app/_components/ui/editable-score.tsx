"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

interface EditableScoreProps {
  value: number;
  onChange: (newScore: number) => void;
  maxScore?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function EditableScore({
  value,
  onChange,
  maxScore = 100,
  className = "",
  disabled = false,
  placeholder = "0",
}: EditableScoreProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    if (tempValue >= 0 && tempValue <= maxScore) {
      onChange(tempValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-score-excellent font-semibold";
    if (score >= 80) return "text-score-good font-semibold";
    if (score >= 70) return "text-score-fair font-semibold";
    if (score >= 60) return "text-score-poor font-semibold";
    return "text-score-fail font-semibold";
  };

  if (disabled) {
    return (
      <div className={`${getScoreColor(value)} ${className}`}>{value}</div>
    );
  }

  return (
    <div className="relative">
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(Number(e.target.value))}
            min={0}
            max={maxScore}
            className="w-16 h-8 text-sm"
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={handleSave}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-status-completed"
            onClick={handleSave}
          >
            <Check className="h-3 w-3 text-score-excellent" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-status-failed"
            onClick={handleCancel}
          >
            <X className="h-3 w-3 text-score-fail" />
          </Button>
        </div>
      ) : (
        <div
          className={`cursor-pointer hover:bg-muted p-1 rounded transition-colors ${getScoreColor(value)} ${className}`}
          onClick={() => setIsEditing(true)}
          title="Click to edit score"
        >
          {value}
        </div>
      )}
    </div>
  );
}
