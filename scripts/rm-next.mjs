/**
 * Remove `.next` — fixes stale webpack graphs after dependency / import changes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
fs.rmSync(nextDir, { recursive: true, force: true });
console.log("[rm-next] removed .next (if it existed)");
