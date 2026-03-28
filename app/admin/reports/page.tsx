import { AdminReportsPanel } from "@/components/admin/admin-reports-panel";
import { listReportsForAdmin } from "@/lib/report-service";

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialQ = sp.q ?? "";
  const initialStatus = sp.status ?? "all";
  const initialSnapshot = await listReportsForAdmin({
    q: initialQ,
    status: initialStatus,
    limit: 30,
    offset: 0
  });

  return (
    <div className="space-y-4">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">Reports queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review abuse reports, inspect paste/comment targets, and move items from open review to resolution with a full audit trail.
        </p>
      </div>
      <AdminReportsPanel initialQ={initialQ} initialSnapshot={initialSnapshot} initialStatus={initialStatus} />
    </div>
  );
}
