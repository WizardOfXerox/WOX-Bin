const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

export const TOOLS_ENABLED = !DISABLED_VALUES.has((process.env.WOX_ENABLE_TOOLS ?? "").trim().toLowerCase());

export const TOOLS_DISABLED_COPY = {
  eyebrow: "Tools disabled",
  title: "Tools are temporarily unavailable",
  description:
    "This deployment has the tools surface switched off. Paste workspace, sharing, accounts, and admin features remain available.",
  docsDescription:
    "This deployment has the tools surface intentionally switched off. The routes and docs remain in the repo, but the public /tools pages and convert APIs are disabled until the flag is turned back on.",
  apiError: "Tools are temporarily unavailable on this deployment"
} as const;
