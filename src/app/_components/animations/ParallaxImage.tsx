"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

//Create a subtle up/down scroll effect (parallax). The image moves slightly up/down as you scroll, creating a depth illusion.

interface ParallaxImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function ParallaxImage({
  src,
  alt,
  width,
  height,
  className = "",
}: ParallaxImageProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }}>
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          className="w-full object-cover"
        />
      </motion.div>
    </div>
  );
}
