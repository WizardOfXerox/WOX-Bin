import type { Session } from "next-auth";

export function viewerFromSession(session: Session | null) {
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role
  };
}
