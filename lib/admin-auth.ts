import type { Session } from "next-auth";

export type AdminSession = Session & {
  user: Session["user"] & { id: string; role: "admin" };
};

export type StaffSession = Session & {
  user: Session["user"] & { id: string; role: "moderator" | "admin" };
};

export function isAdminSession(session: Session | null): session is AdminSession {
  return Boolean(session?.user?.id && session.user.role === "admin");
}

export function isStaffSession(session: Session | null): session is StaffSession {
  return Boolean(session?.user?.id && (session.user.role === "moderator" || session.user.role === "admin"));
}
