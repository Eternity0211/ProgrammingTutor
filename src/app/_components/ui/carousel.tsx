"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  images: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }[];
  autoPlay?: boolean;
  interval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
  parallaxEffect?: boolean;
}

export function Carousel({
  images,
  autoPlay = true,
  interval = 5000,
  showControls = true,
  showIndicators = true,
  className = "",
  parallaxEffect = true,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-2%", "2%"]);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length,
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!autoPlay || isHovering) return;
    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, isHovering, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-main-200 bg-main-100 dark:bg-main-900 transition-colors",
        className,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative w-full aspect-[4/3] sm:aspect-[16/9]" // responsive aspect ratio
        >
          {parallaxEffect ? (
            <motion.div style={{ y }} className="h-full w-full">
              <Image
                src={images[currentIndex].src}
                width={images[currentIndex].width}
                height={images[currentIndex].height}
                alt={images[currentIndex].alt}
                className="h-full w-full object-cover"
                priority={currentIndex === 0}
              />
            </motion.div>
          ) : (
            <Image
              src={images[currentIndex].src}
              width={images[currentIndex].width}
              height={images[currentIndex].height}
              alt={images[currentIndex].alt}
              className="h-full w-full object-cover"
              priority={currentIndex === 0}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      {showControls && images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 sm:left-4 top-1/2 z-10 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full bg-main-200 text-main-800 hover:bg-main-300 transition-all shadow-md"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-4 top-1/2 z-10 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full bg-main-200 text-main-800 hover:bg-main-300 transition-all shadow-md"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                currentIndex === index
                  ? "w-6  bg-primary-button "
                  : "bg-main-500/40 hover:bg-main-500",
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
