const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export const TOOLS_ENABLED = ENABLED_VALUES.has((process.env.WOX_ENABLE_TOOLS ?? "").trim().toLowerCase());

export const TOOLS_DISABLED_COPY = {
  eyebrow: "Tools disabled",
  title: "Tools are temporarily unavailable",
  description:
    "The tools surface is being finished. Paste workspace, sharing, accounts, and admin features remain available.",
  docsDescription:
    "This deployment has the tools surface switched off while the product is still being finished. The routes and docs remain in the repo, but the public /tools pages and convert APIs are disabled for now.",
  apiError: "Tools are temporarily unavailable on this deployment"
} as const;
