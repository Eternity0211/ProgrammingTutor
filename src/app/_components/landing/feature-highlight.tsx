import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureHighlightProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureHighlight({
  icon: Icon,
  title,
  description,
}: FeatureHighlightProps) {
  return (
    <motion.div
      whileHover={{ x: 5, transition: { duration: 0.2 } }}
      className="flex items-start gap-4"
    >
      <div className="flex-shrink-0 mt-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
