import OnboardingPopup from "./onboarding-popup";

export default async function OnboardingCheck({
  onboarded,
}: {
  onboarded?: boolean;
}) {
  if (onboarded) return null;

  return <OnboardingPopup />;
}
