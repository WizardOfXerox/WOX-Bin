type LogMetadata = Record<string, unknown> | undefined;

function basePayload(level: "info" | "warn" | "error", event: string, metadata?: LogMetadata) {
  return {
    level,
    event,
    time: new Date().toISOString(),
    environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "development",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.trim() || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 12) || null,
    metadata: metadata ?? {}
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error"
  };
}

export function logInfo(event: string, metadata?: LogMetadata) {
  console.info(JSON.stringify(basePayload("info", event, metadata)));
}

export function logWarn(event: string, metadata?: LogMetadata) {
  console.warn(JSON.stringify(basePayload("warn", event, metadata)));
}

export function logError(event: string, error: unknown, metadata?: LogMetadata) {
  console.error(
    JSON.stringify({
      ...basePayload("error", event, metadata),
      error: serializeError(error)
    })
  );
}
