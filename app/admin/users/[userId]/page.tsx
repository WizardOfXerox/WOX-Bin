import { AdminUserDetailPanel } from "@/components/admin/admin-user-detail-panel";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;

  return (
    <div className="space-y-4">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">User detail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inspect the account, verify email state, suspend or ban access, and moderate that user&apos;s pastes.
        </p>
      </div>
      <AdminUserDetailPanel userId={userId} />
    </div>
  );
}
