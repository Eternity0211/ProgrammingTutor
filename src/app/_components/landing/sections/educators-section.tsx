"use client";
import AnimatedSection from "../../animations/AnimatedSection";
import FeatureHighlight from "../feature-highlight";
import StaggeredItem from "../../animations/StaggeredItem";
import { educatorFeatures } from "@/config/landingPageData";
import ParallaxImage from "../../animations/ParallaxImage";

export default function EducatorsSection() {
  return (
    <section className="py-24 flex justify-center bg-accent">
      <div className="container px-6">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <AnimatedSection>
            <div>
              <span className="inline-block text-sm font-medium text-muted-foreground mb-3">
                FOR EDUCATORS
              </span>
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl mb-6">
                Streamline your teaching workflow
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Create assignments, monitor student progress, and provide
                feedback—all in one place.
              </p>

              <div className="space-y-6">
                {educatorFeatures.map((feature: any, index: number) => (
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

          <AnimatedSection delay={0.2}>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm bg-card/90 border border-border">
                <ParallaxImage
                  src="/placeholder.svg?height=500&width=600"
                  width={600}
                  height={500}
                  alt="Educator Dashboard"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
