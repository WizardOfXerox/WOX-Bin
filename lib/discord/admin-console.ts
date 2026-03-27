import { z } from "zod";

import { buildDiscordSiteLinks } from "@/lib/discord/shared";

export const discordQuickPasteVisibilitySchema = z.enum(["private", "unlisted", "public"]);

export const discordAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setup"),
    guildId: z.string().trim().min(1, "Guild id is required.")
  }),
  z.object({
    action: z.literal("siteops"),
    guildId: z.string().trim().min(1, "Guild id is required."),
    enabled: z.boolean()
  }),
  z.object({
    action: z.literal("webhook-test"),
    guildId: z.string().trim().min(1, "Guild id is required.")
  }),
  z.object({
    action: z.literal("quickpaste"),
    title: z.string().trim().min(1, "Title is required.").max(500, "Keep the title under 500 characters."),
    content: z.string().trim().min(1, "Paste content is required."),
    visibility: discordQuickPasteVisibilitySchema.default("unlisted")
  })
]);

export type DiscordAdminActionInput = z.infer<typeof discordAdminActionSchema>;

export function buildDiscordWebhookTestBody(guildName: string, baseUrl: string) {
  const links = buildDiscordSiteLinks(baseUrl);

  return {
    username: "WOX-Bin",
    embeds: [
      {
        title: "WOX-Bin webhook check",
        description: `This is a dashboard-triggered webhook test for **${guildName}**.`,
        color: 0x38bdf8,
        fields: [
          {
            name: "Open",
            value: `[Workspace](${links.workspace}) · [Feed](${links.feed}) · [Privacy tools](${links.privacy})`,
            inline: false
          },
          {
            name: "What to verify",
            value: "Confirm that this message landed in the announcement channel and the webhook is still valid.",
            inline: false
          }
        ],
        footer: {
          text: "WOX-Bin admin dashboard"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}
