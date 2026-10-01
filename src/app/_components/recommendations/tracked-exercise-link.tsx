"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

type ExerciseDestination = {
  kind: "classroom" | "leetcode";
  url: string;
};

type TrackedExerciseLinkProps = {
  children: ReactNode;
  className?: string;
  destination: ExerciseDestination;
  surface: "assignment_feedback" | "profile";
};

function sendEvent(
  action: "impression" | "click",
  destination: ExerciseDestination,
  surface: TrackedExerciseLinkProps["surface"],
) {
  void fetch("/api/recommendations/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, source: destination.kind, surface }),
    keepalive: true,
  }).catch(() => undefined);
}

export function TrackedExerciseLink({
  children,
  className,
  destination,
  surface,
}: TrackedExerciseLinkProps) {
  const impressionSent = useRef(false);

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    sendEvent("impression", destination, surface);
  }, [destination, surface]);

  const handleClick = () => sendEvent("click", destination, surface);

  if (destination.kind === "classroom") {
    return (
      <Link href={destination.url} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={destination.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
