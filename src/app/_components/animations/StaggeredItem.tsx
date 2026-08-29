"use client";
import { useInView, motion } from "framer-motion";
import { useRef } from "react";

// Animate each item one-by-one with a small delay (stagger effect). can be used for displaying list of features etc
//Each item animates in sequence as they enter view.

interface StaggeredItemInterface {
  children: React.ReactNode;
  index?: number;
}

export default function StaggeredItem({
  children,
  index = 0,
}: StaggeredItemInterface) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
        delay: 0.1 + index * 0.1,
      }}
    >
      {children}
    </motion.div>
  );
}
