import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    env: {
      ...process.env,
      PORT: "3100"
    },
    port: 3100,
    reuseExistingServer: false,
    timeout: 300_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
