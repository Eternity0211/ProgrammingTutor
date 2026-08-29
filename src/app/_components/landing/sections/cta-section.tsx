import { ArrowRight } from "lucide-react";
import AnimatedSection from "../../animations/AnimatedSection";
import { Button } from "../../ui/button";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 bg-background text-foreground flex justify-center">
      <div className="container px-6">
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your{" "}
              <span className="text-main-600">coding</span>{" "}
              <span className="text-foreground">classroom?</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of universities already using gradeIT to streamline
              their computer lab assignments.
            </p>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 bg-main-100 text-main-900 hover:bg-main-600 hover:text-white transition-all"
              >
                <Link href="/classes" className="flex items-center">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
