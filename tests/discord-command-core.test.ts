import { afterEach, describe, expect, it, vi } from "vitest";

import { createDiscordCommandPlan, type DiscordCommandInput } from "@/lib/discord/command-core";
import type { DiscordBotConfig } from "@/lib/discord/bot-env";

const baseConfig: DiscordBotConfig = {
  token: "bot_token",
  applicationId: "app_id",
  devGuildId: null,
  operatorUserIds: new Set(["operator_1"]),
  publicKey: null
};

const runtime = {
  runGuildSetup: vi.fn(async () => ({
    result: {
      createdChannels: [],
      reusedChannels: [],
      createdRoles: [],
      reusedRoles: [],
      webhookCreated: false,
      siteOpsEnabled: false,
      warnings: []
    }
  }))
};

function buildInput(
  subcommand: string,
  options: Partial<DiscordCommandInput["options"]> = {},
  userId = "user_1"
): DiscordCommandInput {
  return {
    commandName: "wox",
    subcommand,
    userId,
    guildId: "guild_1",
    guildName: "Guild One",
    canManageGuild: true,
    guild: null,
    options
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("discord command core", () => {
  it("builds tool links for the public tools command", async () => {
    const plan = createDiscordCommandPlan(buildInput("tools"), baseConfig, runtime);
    expect(plan).not.toBeNull();

    const message = await plan!.execute();
    expect(message.embeds?.[0]?.title).toBe("WOX-Bin tools");
    expect(message.components?.flatMap((row) => row.components).some((button) => button.label === "Shorten")).toBe(true);
  });

  it("picks a choice from the supplied list", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const plan = createDiscordCommandPlan(
      buildInput("choose", {
        optionsText: "alpha, beta, gamma"
      }),
      baseConfig,
      runtime
    );

    const message = await plan!.execute();
    expect(message.embeds?.[0]?.description).toContain("alpha");
  });

  it("rolls dice and reports the total", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const plan = createDiscordCommandPlan(
      buildInput("roll", {
        sides: 6,
        count: 2
      }),
      baseConfig,
      runtime
    );

    const message = await plan!.execute();
    expect(message.embeds?.[0]?.title).toBe("Dice roll");
    expect(message.embeds?.[0]?.fields?.find((field) => field.name === "Total")?.value).toBe("8");
  });

  it("builds music helper links from the selected mood", async () => {
    const plan = createDiscordCommandPlan(
      buildInput("music", {
        mood: "lofi"
      }),
      baseConfig,
      runtime
    );

    const message = await plan!.execute();
    const buttons = message.components?.flatMap((row) => row.components) ?? [];
    expect(message.embeds?.[0]?.title).toBe("Music helper");
    expect(buttons.some((button) => button.label === "YouTube" && button.url.includes("lofi"))).toBe(true);
  });
});
