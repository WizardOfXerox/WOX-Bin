import { AdminPastesPanel } from "@/components/admin/admin-pastes-panel";

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function AdminPastesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialStatus = sp.status ?? "all";
  const initialQ = sp.q ?? "";

  return (
    <div className="space-y-4">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">Paste moderation</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review public content and set moderation status (active, hidden, deleted).</p>
      </div>
      <AdminPastesPanel initialQ={initialQ} initialStatus={initialStatus} />
    </div>
  );
}
