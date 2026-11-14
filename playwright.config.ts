import { defineConfig, devices } from "@playwright/test";

// Chromium with iPhone viewports. Real WebKit is better, but needs OS libraries many dev machines lack.
export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npx tsx scripts/make-sample.ts && npx vite --port 5199",
    url: "http://localhost:5199",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:5199" },
  projects: [
    { name: "iPhone SE", use: { ...devices["iPhone SE"], defaultBrowserType: "chromium" } },
    { name: "iPhone 13", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "iPhone 14 Pro Max", use: { ...devices["iPhone 14 Pro Max"], defaultBrowserType: "chromium" } },
  ],
});
