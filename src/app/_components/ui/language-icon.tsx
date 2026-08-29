"use client";

import React from "react";
import { Code } from "lucide-react";
import { LANGUAGE_ICONS, LANGUAGE_COLORS } from "@/config/constants";
import { cn } from "@/lib/utils";
import { Language } from "@/lib/types/config-types";

interface LanguageIconProps {
  language: Language;
  size?: number;
  className?: string;
  showColor?: boolean;
  showText?: boolean;
}

export const LanguageIcon: React.FC<LanguageIconProps> = ({
  language,
  size = 24,
  className,
  showColor = true,
  showText = true,
}) => {
  const iconPath = LANGUAGE_ICONS[language];
  const color = LANGUAGE_COLORS[language];

  if (!iconPath) {
    return <Code size={size} className={className} />;
  }

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={showColor ? { color } : undefined}
    >
      <img
        src={iconPath}
        alt={`${language} logo`}
        width={size}
        height={size}
        className="object-contain"
      />
      {showText && <span className="ml-2">{language}</span>}
    </div>
  );
};

export default LanguageIcon;
