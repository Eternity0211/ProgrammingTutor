"use client";
import { useAnimation, useInView, motion } from "framer-motion";
import { useEffect, useRef } from "react";

//Fade-in and slide-up animation when the section enters the viewport.
//When the component enters the viewport, it animates from opacity: 0, y: 30 to opacity: 1, y: 0

interface AnimatedSectionInterface {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimatedSection({
  children,
  delay = 0,
  className = "",
}: AnimatedSectionInterface) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
            delay: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
