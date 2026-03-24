export const UNVERIFIED_ACCOUNT_RECYCLE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function canRecycleUnverifiedAccount(input: {
  emailVerified: Date | null;
  createdAt: Date | null;
  linkedProviderCount: number;
  now?: Date;
}) {
  if (input.emailVerified) {
    return false;
  }
  if (!input.createdAt) {
    return false;
  }
  if (input.linkedProviderCount > 0) {
    return false;
  }
  const now = input.now ?? new Date();
  return now.getTime() - input.createdAt.getTime() >= UNVERIFIED_ACCOUNT_RECYCLE_AFTER_MS;
}
