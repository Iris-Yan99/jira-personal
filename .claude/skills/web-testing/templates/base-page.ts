// templates/base-page.ts
import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object 基类
 * 所有 Page Object 应继承此类
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async assertPath(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async waitForVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  async clickAndWait(locator: Locator, waitForPath?: string) {
    await locator.click();
    if (waitForPath) {
      await this.page.waitForURL(new RegExp(waitForPath));
    }
  }
}
