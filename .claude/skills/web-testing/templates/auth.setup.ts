// templates/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('认证', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/邮箱|email/i).fill(process.env.TEST_EMAIL || 'test@example.com');
  await page.getByLabel(/密码|password/i).fill(process.env.TEST_PASSWORD || 'password123');
  await page.getByRole('button', { name: /登录|login/i }).click();
  await page.waitForURL(/dashboard|home/i);
  await page.context().storageState({ path: authFile });
});
