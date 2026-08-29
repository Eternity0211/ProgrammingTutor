import { Progress } from "@/app/_components/ui/progress";
import type React from "react";
import type { ReactNode } from "react";

interface UsageMetricProps {
  title: string;
  icon: ReactNode;
  current: number;
  max: number;
  percentage: number;
}

const UsageMetric: React.FC<UsageMetricProps> = ({
  title,
  icon,
  current,
  max,
  percentage,
}) => {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mt-3">
          <span className="text-[15px] font-medium text-foreground">
            {formatNumber(current)}
          </span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">
            {formatNumber(max)}
          </span>
        </div>
      </div>

      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export default UsageMetric;
