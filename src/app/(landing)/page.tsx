import Footer from "../_components/landing/footer";
import CTASection from "../_components/landing/sections/cta-section";
import EducatorsSection from "../_components/landing/sections/educators-section";
import FeaturesSection from "../_components/landing/sections/features-section";
import HeroSection from "../_components/landing/sections/hero-section";
import StatsSection from "../_components/landing/sections/stats-section";
import StudentsSection from "../_components/landing/sections/students-section";
import WorkflowSection from "../_components/landing/sections/workflow-section";
import SiteHeader from "../_components/landing/site-header";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-col justify-center">
        <HeroSection />

        <FeaturesSection />

        <EducatorsSection />

        <StudentsSection />

        <WorkflowSection />

        <StatsSection />

        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
