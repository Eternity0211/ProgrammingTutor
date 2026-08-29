import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressSegment = {
  value: number;
  color?: string;
};

type Props = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  segments: ProgressSegment[];
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  Props
>(({ className, segments, ...props }, ref) => {
  const sortedSegments = segments.sort((a, b) => a.value - b.value);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded bg-slate-200",
        className,
      )}
      {...props}
    >
      {sortedSegments.map((segment, index) => (
        <ProgressPrimitive.Indicator
          key={`segment-${segment.value}-${index}`}
          className={cn(
            "h-full transition-all absolute top-0 rounded-r",
            segment.color ? segment.color : "bg-primary",
          )}
          style={{
            width: `${segment.value}%`,
            left: "0%",
            zIndex: sortedSegments.length - index,
          }}
        />
      ))}
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = "Progress";

export { Progress };
