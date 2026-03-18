// templates/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置模板
 * 复制到项目根目录并根据需要修改
 */
export default defineConfig({
  testDir: './tests/ui/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - 认证状态
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
