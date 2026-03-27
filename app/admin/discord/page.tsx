import { AdminDiscordControlPanel } from "@/components/admin/admin-discord-control-panel";
import { getDiscordControlSnapshot } from "@/lib/discord/control-center";

export const dynamic = "force-dynamic";

export default async function AdminDiscordPage() {
  const snapshot = await getDiscordControlSnapshot();

  return <AdminDiscordControlPanel initialSnapshot={snapshot} />;
}
