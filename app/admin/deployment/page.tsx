import { AdminDeploymentPanel } from "@/components/admin/admin-deployment-panel";
import { getDeploymentReadinessSnapshot } from "@/lib/deployment-readiness";

export default async function AdminDeploymentPage() {
  const snapshot = await getDeploymentReadinessSnapshot();
  return <AdminDeploymentPanel snapshot={snapshot} />;
}
