"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-main-300 dark:border-main-500 bg-main-300/10 dark:bg-main-800/30 p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)]"
    >
      <div className="mb-6 flex justify-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-main-100 dark:bg-main-700 text-main-900 dark:text-white">
          <Icon className="h-7 w-7 text-main-700 dark:text-white" />
        </div>
      </div>
      <h3 className="mb-3 text-xl font-semibold text-center text-main-900 dark:text-white">
        {title}
      </h3>
      <p className="text-center text-main-700">{description}</p>
    </motion.div>
  );
}
