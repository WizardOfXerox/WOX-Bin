export const RECENT_PUBLIC_PASTES_LIMIT = 100;

export type PublicFeedEligibilityInput = {
  visibility: string | null;
  secretMode: boolean | null;
  status: string | null;
  deletedAt: Date | null;
  passwordHash: string | null;
};

export function isPublicFeedEligible(paste: PublicFeedEligibilityInput) {
  return (
    paste.visibility === "public" &&
    paste.secretMode === false &&
    paste.status === "active" &&
    paste.deletedAt === null &&
    paste.passwordHash === null
  );
}
