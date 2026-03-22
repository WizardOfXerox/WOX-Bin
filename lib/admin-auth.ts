import type { Session } from "next-auth";

export type AdminSession = Session & {
  user: Session["user"] & { id: string; role: "admin" };
};

export function isAdminSession(session: Session | null): session is AdminSession {
  return Boolean(session?.user?.id && session.user.role === "admin");
}
