import { z } from "zod";

export const pastebinMigrateBodySchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  limit: z.number().int().min(1).max(500).optional().default(100),
  folderName: z
    .string()
    .max(64)
    .nullish()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t.length > 0 ? t : null;
    })
});
