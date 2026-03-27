import { generateKeyPairSync, sign } from "node:crypto";

import { PermissionFlagsBits } from "discord.js";
import { describe, expect, it } from "vitest";

import {
  parseDiscordInteractionCommandInput,
  verifyDiscordRequestSignature
} from "@/lib/discord/interactions";

describe("discord interactions", () => {
  it("verifies Discord request signatures against the configured public key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ format: "der", type: "spki" });
    const publicKeyHex = Buffer.from(spki).subarray(-32).toString("hex");
    const timestamp = "1711492800";
    const body = JSON.stringify({ type: 1 });
    const signature = sign(null, Buffer.from(`${timestamp}${body}`), privateKey).toString("hex");

    expect(
      verifyDiscordRequestSignature({
        body,
        publicKey: publicKeyHex,
        signature,
        timestamp
      })
    ).toBe(true);
  });

  it("parses slash-command interaction payloads into the shared command input shape", () => {
    const parsed = parseDiscordInteractionCommandInput({
      id: "it_1",
      application_id: "app_1",
      type: 2,
      token: "tok_1",
      guild_id: "guild_1",
      member: {
        permissions: PermissionFlagsBits.ManageGuild.toString(),
        user: {
          id: "user_1"
        }
      },
      data: {
        name: "wox",
        options: [
          {
            name: "quickpaste",
            type: 1,
            options: [
              {
                name: "title",
                type: 3,
                value: "Discord note"
              },
              {
                name: "content",
                type: 3,
                value: "Hello from Discord"
              },
              {
                name: "visibility",
                type: 3,
                value: "unlisted"
              }
            ]
          }
        ]
      }
    });

    expect(parsed).toMatchObject({
      commandName: "wox",
      subcommand: "quickpaste",
      userId: "user_1",
      guildId: "guild_1",
      canManageGuild: true,
      options: {
        title: "Discord note",
        content: "Hello from Discord",
        visibility: "unlisted"
      }
    });
  });
});
