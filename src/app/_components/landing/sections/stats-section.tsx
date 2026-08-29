"use client";
import { stats } from "@/config/landingPageData";
import AnimatedSection from "../../animations/AnimatedSection";
import StaggeredItem from "../../animations/StaggeredItem";
import { motion } from "framer-motion";

export default function StatsSection() {
  return (
    <section className="py-24 flex justify-center bg-background transition-colors">
      <div className="container px-6">
        <AnimatedSection>
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-main-300 bg-main-300/30 p-12 shadow-lg backdrop-blur-md transition-all">
              <div className="grid gap-10 md:grid-cols-4">
                {stats.map((stat: any, index: number) => (
                  <StaggeredItem key={index} index={index}>
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      className="text-4xl font-bold text-main-800"
                    >
                      {stat.value}
                    </motion.span>
                    <span className="mt-2 text-sm text-main-700">
                      {stat.label}
                    </span>
                  </StaggeredItem>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
