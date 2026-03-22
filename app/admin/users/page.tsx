import { AdminUsersPanel } from "@/components/admin/admin-users-panel";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search accounts by username, email, display name, or user ID. Drill into a user to review verification state,
          plans, account status, and that user&apos;s pastes.
        </p>
      </div>
      <AdminUsersPanel />
    </div>
  );
}
