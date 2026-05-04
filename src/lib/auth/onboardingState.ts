export type OnboardingStateRow = {
  onboarded_at: string | null;
};

export function isOnboardingComplete(row: OnboardingStateRow | null | undefined): boolean {
  return Boolean(row?.onboarded_at);
}
