import type { ReactNode } from "react";
import Footer from "./footer";
import SiteHeader from "./site-header";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <p className="text-sm font-medium text-main-600">
          Last updated 2026-09-30
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {description}
        </p>
        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
