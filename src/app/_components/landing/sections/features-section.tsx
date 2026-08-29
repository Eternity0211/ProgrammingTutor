"use client";
import FeatureCard from "../feature-card";
import AnimatedSection from "../../animations/AnimatedSection";
import { capabilityFeatures, educatorFeatures } from "@/config/landingPageData";
import StaggeredItem from "../../animations/StaggeredItem";

export default function FeaturesSection() {
  return (
    <section className="py-24 flex justify-center bg-card" id="features">
      <div className="container px-6">
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-block text-sm font-medium text-muted-foreground mb-3">
              CAPABILITIES
            </span>
            <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
              Designed for modern coding education
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Thoughtfully crafted features that enhance the teaching and
              learning experience
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3 mx-auto max-w-7xl">
          {capabilityFeatures.map((feature: any, index: number) => (
            <StaggeredItem key={index} index={index}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </StaggeredItem>
          ))}
        </div>
      </div>
    </section>
  );
}
