// templates/fixtures.ts
import { test as base, expect } from '@playwright/test';

/**
 * 自定义 Fixtures 类型定义
 */
type MyFixtures = {
  // 示例：添加 LoginPage
  // loginPage: LoginPage;
};

/**
 * 扩展的 test 对象
 */
export const test = base.extend<MyFixtures>({
  // loginPage: async ({ page }, use) => {
  //   await use(new LoginPage(page));
  // },
});

export { expect };
