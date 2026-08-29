import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ProcessStepProps {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ProcessStep({
  number,
  icon: Icon,
  title,
  description,
}: ProcessStepProps) {
  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative rounded-2xl border border-main-300 bg-main-300/10 p-8 shadow-card-default transition-all hover:shadow-card-hover"
    >
      <div className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full  bg-primary-button  text-xs font-medium text-white">
        {number}
      </div>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-main-100 text-main-900">
          <Icon className="h-7 w-7 text-main-700" />
        </div>
      </div>
      <h3 className="mb-3 text-xl font-medium text-center text-main-900">
        {title}
      </h3>
      <p className="text-main-700 text-center">{description}</p>
    </motion.div>
  );
}
