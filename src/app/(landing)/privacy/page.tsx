import type { Metadata } from "next";
import { LegalPage } from "@/app/_components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How GradeIt handles account, classroom, code, and AI data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="GradeIt processes the information required to provide classroom, code evaluation, and AI-assisted learning features."
      sections={[
        {
          title: "Information we process",
          content: (
            <p>
              We process account details, classroom membership, assignments,
              code submissions, evaluation results, dialogue history, and
              learning-profile data that you choose to provide through the
              service.
            </p>
          ),
        },
        {
          title: "How information is used",
          content: (
            <p>
              Information is used to authenticate users, enforce classroom
              permissions, execute and assess code, generate grounded learning
              feedback, preserve conversation context, and operate security and
              reliability monitoring.
            </p>
          ),
        },
        {
          title: "External processors",
          content: (
            <p>
              Depending on deployment configuration, code or learning context
              may be sent to configured model and execution providers. Secrets
              and authentication credentials are not intentionally included in
              model prompts. Operators should review provider terms before a
              production deployment.
            </p>
          ),
        },
        {
          title: "Retention and control",
          content: (
            <p>
              Retention is controlled by the organization operating the
              deployment. Users should contact their instructor or deployment
              administrator to request access, correction, export, or deletion
              of account and learning data.
            </p>
          ),
        },
        {
          title: "Questions",
          content: (
            <p>
              For this project build, privacy questions and security reports can
              be submitted through the project&apos;s GitHub issue tracker.
            </p>
          ),
        },
      ]}
    />
  );
}
