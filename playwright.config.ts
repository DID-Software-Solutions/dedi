import { defineConfig, devices } from '@playwright/test';

// Smoke-level E2E for the WebGL game. The app is served under the /dedi/ base
// path (same as GitHub Pages), so baseURL points there. WebGL runs headless via
// SwiftShader — the launch flags below enable it in modern Chromium.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173/dedi/',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/dedi/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
