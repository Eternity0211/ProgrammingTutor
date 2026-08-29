"use client";
import FeatureHighlight from "../feature-highlight";
import { studentFeatures } from "@/config/landingPageData";
import StaggeredItem from "../../animations/StaggeredItem";
import AnimatedSection from "../../animations/AnimatedSection";
import ParallaxImage from "../../animations/ParallaxImage";

export default function StudentsSection() {
  return (
    <section className="py-24 flex justify-center bg-background">
      <div className="container px-6">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <AnimatedSection delay={0.2} className="order-2 lg:order-1">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm bg-card/90 border border-border">
                <ParallaxImage
                  src="/placeholder.svg?height=500&width=600"
                  width={600}
                  height={500}
                  alt="Student Coding Interface"
                />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="order-1 lg:order-2">
            <div>
              <span className="inline-block text-sm font-medium text-muted-foreground mb-3">
                FOR STUDENTS
              </span>
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl mb-6">
                Focus on learning, not logistics
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                A distraction-free environment that helps students concentrate
                on writing quality code.
              </p>

              <div className="space-y-6">
                {studentFeatures.map((feature: any, index: number) => (
                  <StaggeredItem key={index} index={index}>
                    <FeatureHighlight
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                    />
                  </StaggeredItem>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
