import { motion } from "framer-motion";

// horizontal animated line (like a separator or underline) that grows from 0 width to 6rem when it comes into the viewport (on scroll).

interface AnimatedLineProps {
  width?: string; // target width like "6rem", "100%", etc.
  duration?: number;
  delay?: number;
  className?: string;
}

export default function AnimatedLine({
  width = "6rem",
  duration = 0.8,
  delay = 0,
  className = "",
}: AnimatedLineProps) {
  return (
    <motion.div
      initial={{ width: 0 }}
      whileInView={{ width }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      viewport={{ once: true, amount: 0.8 }}
      className={`h-px bg-border ${className}`}
    />
  );
}
