import { publicDropObjectStorageFlag } from "@/flags";
import { sql as dbSql } from "@/lib/db";
import { getPlanLimits } from "@/lib/plans";

const MB = 1024 * 1024;

export const NOMINAL_DATABASE_CAP_BYTES = 512 * MB;
export const DATABASE_WATCH_BYTES = 100 * MB;
export const DATABASE_RISK_BYTES = 250 * MB;

export type StorageStatus = "healthy" | "watch" | "risk" | "critical";

export type StorageWarning = {
  level: "info" | "warn" | "critical";
  title: string;
  detail: string;
};

export type StorageTableMetric = {
  schema: string;
  tableName: string;
  approxRows: number;
  totalBytes: number;
  tableBytes: number;
  indexToastBytes: number;
};

export type StorageReport = {
  generatedAt: string;
  database: {
    name: string;
    usedBytes: number;
    nominalCapBytes: number;
    remainingBytes: number;
    usedPercent: number;
    status: StorageStatus;
  };
  quotas: {
    freePlanStorageBytes: number;
    trackedHostedBytes: number;
    untrackedBytesEstimate: number;
  };
  hotspots: {
    uploadedAvatarCount: number;
    uploadedAvatarBytes: number;
    externalAvatarCount: number;
    pasteVersionBytes: number;
    publicDropInlineBytes: number;
    supportAttachmentBytes: number;
    browserSessionRows: number;
    activeBrowserSessions: number;
    revokedBrowserSessions: number;
    publicDropObjectStorageEnabled: boolean;
  };
  tables: StorageTableMetric[];
  warnings: StorageWarning[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function classifyStorageStatus(usedBytes: number, capBytes = NOMINAL_DATABASE_CAP_BYTES): StorageStatus {
  if (usedBytes >= capBytes) {
    return "critical";
  }
  if (usedBytes >= DATABASE_RISK_BYTES) {
    return "risk";
  }
  if (usedBytes >= DATABASE_WATCH_BYTES) {
    return "watch";
  }
  return "healthy";
}

export function buildStorageWarnings(report: Omit<StorageReport, "warnings">): StorageWarning[] {
  const warnings: StorageWarning[] = [];
  const freePlan = getPlanLimits("free");

  warnings.push({
    level: "info",
    title: "Provider storage can bite earlier than app rows alone",
    detail:
      "This report uses pg_database_size() for the current database only. Provider-side storage accounting can be stricter because of history, branching, or internal overhead."
  });

  if (freePlan.storageBytes >= report.database.nominalCapBytes / 2) {
    warnings.push({
      level: "warn",
      title: "Free-plan quota is large relative to the whole database",
      detail: `A single free account can use ${Math.round(freePlan.storageBytes / MB)} MB, which is half of the nominal 512 MB database ceiling.`
    });
  }

  if (report.quotas.untrackedBytesEstimate > 10 * MB) {
    warnings.push({
      level: "warn",
      title: "Quota accounting undercounts physical storage",
      detail:
        "Tracked hosted usage is materially below total database usage. Paste versions, avatars, support attachments, public drops, and database overhead are not fully represented in per-user quotas."
    });
  }

  if (report.hotspots.uploadedAvatarCount > 0) {
    warnings.push({
      level: "warn",
      title: "Uploaded avatars are stored inline in users.image",
      detail: `There are ${report.hotspots.uploadedAvatarCount} uploaded avatars consuming ${Math.round(report.hotspots.uploadedAvatarBytes / 1024)} KB inside the users table.`
    });
  }

  if (report.hotspots.pasteVersionBytes > 0) {
    warnings.push({
      level: "warn",
      title: "Version history duplicates payloads",
      detail: `paste_versions is already storing ${Math.round(report.hotspots.pasteVersionBytes / 1024)} KB of snapshot content that is not counted in hosted storage quotas.`
    });
  }

  if (!report.hotspots.publicDropObjectStorageEnabled) {
    warnings.push({
      level: "warn",
      title: "Public file drops can still land in Postgres",
      detail:
        "The public-drop object-storage flag is off, so anonymous file uploads can consume database storage unless they are explicitly routed to object storage."
    });
  }

  if (report.hotspots.supportAttachmentBytes > 0) {
    warnings.push({
      level: "warn",
      title: "Support attachments are stored inline in JSON",
      detail: `Support message attachments are currently using ${Math.round(report.hotspots.supportAttachmentBytes / 1024)} KB inside support_messages JSON payloads.`
    });
  }

  if (report.database.status === "watch") {
    warnings.push({
      level: "warn",
      title: "Database is in the watch band",
      detail: "Start moving blob-like payloads out of Postgres before growth becomes bursty."
    });
  }

  if (report.database.status === "risk" || report.database.status === "critical") {
    warnings.push({
      level: "critical",
      title: "Database runway is in the red band",
      detail: "Finish object-storage moves and tighten retention now. Waiting for the provider ceiling will force emergency cleanup."
    });
  }

  return warnings;
}

export async function getStorageReport(): Promise<StorageReport> {
  const [
    dbRows,
    tableRows,
    userRows,
    pasteRows,
    pasteFileRows,
    pasteVersionRows,
    publicDropRows,
    supportRows,
    sessionRows,
    publicDropStorageEnabled
  ] = await Promise.all([
    dbSql`
      select current_database() as name, pg_database_size(current_database()) as bytes
    `,
    dbSql`
      select
        schemaname,
        relname as table_name,
        n_live_tup::bigint as approx_rows,
        pg_total_relation_size(relid) as total_bytes,
        pg_relation_size(relid) as table_bytes,
        pg_total_relation_size(relid) - pg_relation_size(relid) as index_toast_bytes
      from pg_stat_user_tables
      where schemaname not in ('pg_catalog', 'information_schema')
      order by pg_total_relation_size(relid) desc
      limit 12
    `,
    dbSql`
      select
        count(*) filter (where image like 'data:image/%;base64,%')::int as uploaded_avatar_count,
        coalesce(sum(octet_length(image)) filter (where image like 'data:image/%;base64,%'), 0)::bigint as uploaded_avatar_bytes,
        count(*) filter (where image like 'http%')::int as external_avatar_count
      from users
    `,
    dbSql`
      select coalesce(sum(octet_length(content)), 0)::bigint as tracked_paste_bytes
      from pastes
      where status <> 'deleted' and deleted_at is null
    `,
    dbSql`
      select coalesce(sum(octet_length(pf.content)), 0)::bigint as tracked_file_bytes
      from paste_files pf
      inner join pastes p on p.id = pf.paste_id
      where p.status <> 'deleted' and p.deleted_at is null
    `,
    dbSql`
      select
        coalesce(sum(octet_length(content)), 0)::bigint
        + coalesce(sum(pg_column_size(files)), 0)::bigint as paste_version_bytes
      from paste_versions
    `,
    dbSql`
      select
        coalesce(sum(octet_length(coalesce(content_text, ''))), 0)::bigint
        + coalesce(sum(octet_length(coalesce(content_base64, ''))), 0)::bigint
        + coalesce(sum(octet_length(coalesce(payload_ciphertext, ''))), 0)::bigint as public_drop_inline_bytes
      from public_drops
      where status <> 'deleted' and deleted_at is null
    `,
    dbSql`
      select coalesce(sum(pg_column_size(attachments)), 0)::bigint as support_attachment_bytes
      from support_messages
    `,
    dbSql`
      select
        count(*)::int as browser_session_rows,
        count(*) filter (where revoked_at is null)::int as active_browser_sessions,
        count(*) filter (where revoked_at is not null)::int as revoked_browser_sessions
      from browser_sessions
    `,
    publicDropObjectStorageFlag()
  ]);

  const db = dbRows[0] as { name: string; bytes: unknown };
  const users = userRows[0] as {
    uploaded_avatar_count: unknown;
    uploaded_avatar_bytes: unknown;
    external_avatar_count: unknown;
  };
  const pasteUsage = pasteRows[0] as { tracked_paste_bytes: unknown };
  const pasteFiles = pasteFileRows[0] as { tracked_file_bytes: unknown };
  const pasteVersions = pasteVersionRows[0] as { paste_version_bytes: unknown };
  const publicDrops = publicDropRows[0] as { public_drop_inline_bytes: unknown };
  const support = supportRows[0] as { support_attachment_bytes: unknown };
  const sessions = sessionRows[0] as {
    browser_session_rows: unknown;
    active_browser_sessions: unknown;
    revoked_browser_sessions: unknown;
  };

  const usedBytes = toNumber(db?.bytes);
  const nominalCapBytes = NOMINAL_DATABASE_CAP_BYTES;
  const trackedHostedBytes = toNumber(pasteUsage?.tracked_paste_bytes) + toNumber(pasteFiles?.tracked_file_bytes);

  const reportWithoutWarnings: Omit<StorageReport, "warnings"> = {
    generatedAt: new Date().toISOString(),
    database: {
      name: db?.name ?? "unknown",
      usedBytes,
      nominalCapBytes,
      remainingBytes: Math.max(0, nominalCapBytes - usedBytes),
      usedPercent: nominalCapBytes > 0 ? Number(((usedBytes / nominalCapBytes) * 100).toFixed(2)) : 0,
      status: classifyStorageStatus(usedBytes, nominalCapBytes)
    },
    quotas: {
      freePlanStorageBytes: getPlanLimits("free").storageBytes,
      trackedHostedBytes,
      untrackedBytesEstimate: Math.max(0, usedBytes - trackedHostedBytes)
    },
    hotspots: {
      uploadedAvatarCount: toNumber(users?.uploaded_avatar_count),
      uploadedAvatarBytes: toNumber(users?.uploaded_avatar_bytes),
      externalAvatarCount: toNumber(users?.external_avatar_count),
      pasteVersionBytes: toNumber(pasteVersions?.paste_version_bytes),
      publicDropInlineBytes: toNumber(publicDrops?.public_drop_inline_bytes),
      supportAttachmentBytes: toNumber(support?.support_attachment_bytes),
      browserSessionRows: toNumber(sessions?.browser_session_rows),
      activeBrowserSessions: toNumber(sessions?.active_browser_sessions),
      revokedBrowserSessions: toNumber(sessions?.revoked_browser_sessions),
      publicDropObjectStorageEnabled: publicDropStorageEnabled
    },
    tables: tableRows.map((row) => ({
      schema: String((row as { schemaname: unknown }).schemaname ?? "public"),
      tableName: String((row as { table_name: unknown }).table_name ?? ""),
      approxRows: toNumber((row as { approx_rows: unknown }).approx_rows),
      totalBytes: toNumber((row as { total_bytes: unknown }).total_bytes),
      tableBytes: toNumber((row as { table_bytes: unknown }).table_bytes),
      indexToastBytes: toNumber((row as { index_toast_bytes: unknown }).index_toast_bytes)
    }))
  };

  return {
    ...reportWithoutWarnings,
    warnings: buildStorageWarnings(reportWithoutWarnings)
  };
}
