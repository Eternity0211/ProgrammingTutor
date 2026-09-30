import type { Metadata } from "next";
import { LegalPage } from "@/app/_components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Conditions for using the GradeIt educational platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms describe the expected use of this GradeIt project build. A production operator may publish additional organization-specific terms."
      sections={[
        {
          title: "Educational use",
          content: (
            <p>
              GradeIt is intended to support programming education. Automated
              scores and AI-generated feedback assist instructors and students
              but should not be treated as the sole basis for high-stakes
              academic decisions.
            </p>
          ),
        },
        {
          title: "Account responsibilities",
          content: (
            <p>
              Users must keep credentials private, use only accounts assigned to
              them, and respect classroom access controls. Attempts to access
              another user&apos;s submissions or administrative features are
              prohibited.
            </p>
          ),
        },
        {
          title: "Submitted code and content",
          content: (
            <p>
              Users remain responsible for code and content they submit. Do not
              upload secrets, personal information, malware, or material that
              you do not have permission to use.
            </p>
          ),
        },
        {
          title: "Automated services",
          content: (
            <p>
              Code execution, model inference, and external dependencies may be
              delayed or temporarily unavailable. The platform may retry or
              safely degrade these features instead of returning a final
              academic result.
            </p>
          ),
        },
        {
          title: "Deployment-specific terms",
          content: (
            <p>
              Institutions deploying GradeIt are responsible for adding their
              identity, support contact, retention policy, and legally reviewed
              terms before offering the service in production.
            </p>
          ),
        },
      ]}
    />
  );
}
