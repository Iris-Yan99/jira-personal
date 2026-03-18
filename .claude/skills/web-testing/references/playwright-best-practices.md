# Playwright 最佳实践参考文档

## 1. 项目结构 - tests/ui/ organization

### 推荐的项目结构

```
tests/
├── ui/
│   ├── fixtures/          # 测试夹具
│   │   ├── auth.ts
│   │   ├── database.ts
│   │   └── pageObjects.ts
│   ├── pages/            # Page Objects
│   │   ├── loginPage.ts
│   │   ├── dashboardPage.ts
│   │   └── profilePage.ts
│   ├── utils/            # 工具函数
│   │   ├── helpers.ts
│   │   ├── apiHelper.ts
│   │   └── constants.ts
│   ├── tests/            # 测试用例
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   └── logout.spec.ts
│   │   ├── dashboard/
│   │   │   ├── view.spec.ts
│   │   │   └── actions.spec.ts
│   │   └── api/          # API 测试
│   │       ├── users.spec.ts
│   │       └── products.spec.ts
│   ├── config/           # 配置文件
│   │   ├── hooks.ts
│   │   └── reporters.ts
│   └── reports/          # 测试报告
├── playwright.config.ts
└── package.json
```

### 组织原则

1. **按功能模块分组**：相关测试放在同一目录下
2. **分离关注点**：UI测试、API测试、工具函数分开
3. **命名规范**：
   - 文件名：kebab-case
   - 测试名：功能描述（如 `loginSuccessful.spec.ts`）
   - 类名：PascalCase（如 `LoginPage`）

## 2. Page Object Model + Fixtures

### Page Object Model 实现

```typescript
// pages/loginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('.error-message');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return this.errorMessage.textContent();
  }

  async isLoggedIn(): Promise<boolean> {
    return this.page.locator('.user-profile').isVisible();
  }
}
```

### Fixtures 实现

```typescript
// fixtures/auth.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';

export { test };

// 扩展 test 对象
export const test = base.extend<{
  authenticatedPage: Page;
  loginPage: LoginPage;
}>({
  authenticatedPage: async ({ page }, use) => {
    // 登录逻辑
    await page.goto('/login');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    await page.waitForLoadState('networkidle');

    await use(page);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await use(loginPage);
  }
});

// 类型声明
declare module '@playwright/test' {
  interface Fixtures {
    authenticatedPage: Page;
    loginPage: LoginPage;
  }
}
```

### 使用 Fixtures 的测试

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../fixtures/auth';

test.describe('Authentication', () => {
  test('successful login', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('.user-profile')).toBeVisible();
  });

  test('invalid credentials', async ({ loginPage }) => {
    await loginPage.login('invalid', 'credentials');
    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Invalid username or password');
  });
});
```

## 3. 认证状态复用（Setup Project）

### 使用 Setup Project 复用认证状态

```typescript
// tests/auth.setup.ts
import { chromium, Browser, BrowserContext } from '@playwright/test';

export class AuthSetup {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async setup(): Promise<BrowserContext> {
    if (!this.browser) {
      this.browser = await chromium.launch();
      this.context = await this.browser.newContext();
    }

    // 执行登录并保存认证状态
    await this.context?.goto('/login');
    await this.context?.fill('#username', 'testuser');
    await this.context?.fill('#password', 'password123');
    await this.context?.click('#login-button');
    await this.context?.waitForLoadState('networkidle');

    // 存储认证状态
    await this.context?.storageState({ path: 'auth.json' });

    return this.context;
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      throw new Error('Please call setup() first');
    }
    return this.context;
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.context = null;
  }
}

// 使用 Setup Project 的配置
// playwright.config.ts
export default defineConfig({
  use: {
    contextOptions: {
      storageState: 'auth.json',
    },
  },
});
```

### 优化后的 Fixtures

```typescript
// fixtures/auth.ts
import { test as base, BrowserContext } from '@playwright/test';

export const test = base.extend<{
  authContext: BrowserContext;
}>({
  authContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'auth.json',
    });
    await use(context);
    await context.close();
  },
});
```

## 4. 定位器优先级

### 定位器优先级表

| 优先级 | 定位方式 | 示例 | 适用场景 |
|--------|----------|------|----------|
| 1. ID | `page.locator('#username')` | 稳定性最高 | 唯一标识元素 |
| 2. 文本内容 | `page.getByText('Submit')` | 语义化 | 按钮链接等 |
| 3. ARIA 属性 | `page.getByRole('button', { name: 'Submit' })` | 可访问性 | 语义化交互 |
| 4. 数据属性 | `page.locator('[data-testid="submit-button"]')` | 自定义测试 | 开发友好 |
| 5. CSS 选择器 | `page.locator('.submit-button')` | 灵活性 | 通用场景 |
| 6. XPath | `page.locator('//button[contains(text(), "Submit")]')` | 强大但脆弱 | 复杂匹配 |
| 7. Text | `page.getByText(/Submit/) | 正则匹配 | 动态文本 |

### 定位器最佳实践

```typescript
// 1. 优先使用 ID
await page.locator('#submit-button').click();

// 2. 文本内容（用于按钮、链接）
await page.getByRole('button', { name: 'Submit' }).click();

// 3. 数据属性（推荐测试属性）
await page.locator('[data-testid="user-menu"]').click();

// 4. 使用 contains 避免部分文本匹配
await page.getByText('Full Name').click(); // 避免 'Name'
await page.getByText(/Full Name$/).click();

// 5. 使用 has 和 not 组合
await page.locator('input').filter({ hasText: 'Email' }).fill('test@example.com');

// 6. 避免脆弱的文本定位
// 不推荐：page.getByText('1 item found')
// 推荐：page.getByText(/\\d+ item/).first()
```

### 定位器创建策略

```typescript
// 在类中创建定位器
export class ProductPage {
  // 使用 getRole 确保可访问性
  readonly addToCartButton = this.page.getByRole('button', { name: 'Add to Cart' });

  // 使用数据属性稳定性
  readonly productName = this.page.locator('[data-testid="product-name"]');

  // 使用过滤器组合
  readonly productInCategory = (category: string) =>
    this.page.locator('[data-testid="product"]').filter({ hasText: category });

  constructor(private page: Page) {}
}
```

## 5. 消除 Flaky 测试

### 常见 Flaky 测试原因及解决方案

#### 1. 竞争条件

```typescript
// 问题代码
test('update profile', async ({ page }) => {
  await page.click('#edit-profile');
  await page.fill('#name', 'New Name');
  await page.click('#save');
  await expect(page.locator('#profile-name')).toHaveText('New Name'); // 可能失败
});

// 解决方案
test('update profile', async ({ page }) => {
  await page.click('#edit-profile');
  await page.fill('#name', 'New Name');
  await page.click('#save');
  await expect(page.locator('#profile-name')).toBeVisible(); // 先确保可见
  await expect(page.locator('#profile-name')).toHaveText('New Name', { timeout: 10000 });
});
```

#### 2. 网络延迟

```typescript
// 使用 waitForLoadState
await page.click('#submit');
await page.waitForLoadState('networkidle');

// 使用 waitForResponse
await page.click('#submit');
await page.waitForResponse(response =>
  response.url().includes('/api/submit') && response.status() === 200
);

// 使用 expect to have URL
await expect(page).toHaveURL('/dashboard');
```

#### 3. 确保元素状态

```typescript
// 等待元素可交互
await expect(page.locator('#submit-button')).toBeEnabled();
await page.click('#submit-button');

// 等待元素可见并稳定
const element = page.locator('#dynamic-content');
await expect(element).toBeVisible();
await expect(element).toBeStable();

// 使用 forceClick 作为最后的手段
await page.click('#submit-button', { force: true });
```

### 可靠的测试模式

```typescript
// 创建可重用的测试辅助函数
export async function clickAndWaitForNavigation(page: Page, selector: string, url?: string) {
  const promise = page.waitForNavigation();
  await page.click(selector);
  await promise;
  if (url) {
    await expect(page).toHaveURL(url);
  }
}

// 使用示例
await clickAndWaitForNavigation(page, '#submit-button', '/dashboard');
```

## 6. 视觉回归测试

### 基础视觉测试

```typescript
// tests/visual/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard layout', async ({ page }) => {
  await page.goto('/dashboard');

  // 全局截图比较
  await expect(page).toHaveScreenshot('dashboard-full.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.1,
  });

  // 特定区域比较
  await expect(page.locator('.sidebar')).toHaveScreenshot('sidebar.png');
  await expect(page.locator('.main-content')).toHaveScreenshot('content.png');
});
```

### 带覆盖层的高精度比较

```typescript
// tests/visual/components.spec.ts
import { test, expect } from '@playwright/test';

test('button variations', async ({ page }) => {
  await page.goto('/components');

  // 排除变化区域
  await expect(page.locator('.button-variant')).toHaveScreenshot('buttons.png', {
    animations: 'disabled',
    mask: [
      page.locator('.timestamp'),
      page.locator('#user-avatar'),
    ],
  });
});
```

### 多设备视觉测试

```typescript
// 配置多设备视口
const devices = [
  { name: 'desktop', viewport: { width: 1280, height: 720 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 375, height: 667 } },
];

devices.forEach(device => {
  test(`visual on ${device.name}`, async ({ page }) => {
    await page.setViewportSize(device.viewport);
    await page.goto('/responsive-page');
    await expect(page).toHaveScreenshot(`${device.name}-responsive.png`);
  });
});
```

## 7. 跨浏览器测试

### 基础多浏览器配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### 浏览器特定测试

```typescript
// tests/browser-compat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compat-test');
  });

  test('works in all browsers', async ({ page }) => {
    // 通用测试
    await expect(page.locator('#common-feature')).toBeVisible();
  });

  test('Chrome specific features', async ({ page }) => {
    test.skip(page.context().browser()?.name() !== 'chromium', 'Chrome only');
    await expect(page.locator('#chrome-feature')).toBeVisible();
  });
});
```

### 设备和视口配置

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Tablet Firefox',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
      },
    },
  ],
});
```

## 8. 测试隔离与并行

### 测试隔离策略

```typescript
// 使用 beforeEach 和 afterEach
test.describe('User Profile', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    // 创建干净的测试数据
    testData = await createTestUser();
    await loginAs(page, testData.email);
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await deleteTestUser(testData.id);
    await page.context().clearCookies();
  });

  test('view profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('.profile-name')).toHaveText(testData.name);
  });
});
```

### 并行执行配置

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : 4, // CI 环境使用较少 workers

  fullyParallel: true,
  reporter: 'html',

  // 分组并行测试
  retries: 2,
  timeout: 30000,
});
```

### 避免状态污染

```typescript
// 使用独立的浏览器上下文
test.describe('Isolated Tests', () => {
  test('test 1', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // ... 测试逻辑
    await context.close();
  });

  test('test 2', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // ... 测试逻辑
    await context.close();
  });
});
```

## 9. 报告策略

### 配置报告生成

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
});
```

### 自定义报告处理器

```typescript
// config/reporters.ts
import { ReportWriter } from '@playwright/reporter';

class CustomReportWriter implements ReportWriter {
  async write(report: any) {
    // 自定义报告逻辑
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    // 统计结果
    if (report.results) {
      summary.total = report.results.length;
      summary.passed = report.results.filter(r => r.status === 'passed').length;
      summary.failed = report.results.filter(r => r.status === 'failed').length;
      summary.skipped = report.results.filter(r => r.status === 'skipped').length;
    }

    // 输出自定义报告
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
  }
}
```

### CI/CD 集成报告

```typescript
// GitHub Actions 示例
// .github/workflows/playwright.yml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-report
          path: test-results/
```

## 10. 完整配置示例

### 完整的 playwright.config.ts

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录
  testDir: './tests/ui',

  // 运行选项
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,

  // 超时设置
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // 报告配置
  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'test-results/html',
      open: 'on-failure',
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', {
      outputFile: 'test-results/junit.xml',
      suiteName: 'Playwright Tests'
    }],
  ],

  // 项目配置
  projects: [
    // 基础项目
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false,
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },

    // Firefox 项目
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: process.env.CI ? true : false,
      },
    },

    // WebKit 项目
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: process.env.CI ? true : false,
      },
    },

    // 移动设备测试
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 },
      },
    },

    // API 测试项目
    {
      name: 'api',
      use: {
        baseURL: 'http://localhost:3000/api',
      },
    },

    // 依赖项目（认证）
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'auth.json',
      },
    },
  ],

  // 全局配置
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // 错误处理
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### package.json 脚本配置

```json
{
  "scripts": {
    "test": "npx playwright test",
    "test:ui": "npx playwright test --ui",
    "test:headed": "npx playwright test --headed",
    "test:debug": "npx playwright test --debug",
    "test:ci": "npx playwright test --reporter=list",
    "test:visual": "npx playwright test --grep 'visual'",
    "test:mobile": "npx playwright test --project=Mobile",
    "test:api": "npx playwright test --project=api",
    "install:playwright": "npx playwright install",
    "install:deps": "npx playwright install --with-deps",
    "report": "npx playwright show-report"
  }
}
```

### CI 环境变量配置

```bash
# .env.ci
CI=true
PLAYWRIGHT_HTML_REPORTER_OPEN=false
PLAYWRIGHT_VIDEO=false
```

这个全面的 Playwright 最佳实践文档涵盖了从项目结构到高级特性的各个方面，可以作为团队的标准参考指南。