---
name: web-testing
description: |
  全栈 E2E 测试系统：Playwright (UI) + Newman (API)。
  遵循测试金字塔：API 测试先行，UI 测试关键路径。
  触发："run e2e", "playwright test", "api test", "newman", "e2e测试", "跑测试"
user-invocable: true
allowed-tools: Bash(npx playwright *), Bash(newman *), Bash(npm *), Read, Write, Edit
---

# Web Testing - 全栈 E2E 测试

全栈 E2E 测试系统，整合 **Playwright**（UI 测试）和 **Newman**（API 测试）。

## 测试策略（金字塔原则）

| 层级 | 工具 | 占比 | 速度 | 用途 |
|------|------|------|------|------|
| 单元测试 | Jest/Vitest | ~70% | 毫秒 | 业务逻辑 |
| API 测试 | Newman | ~20% | 秒 | 后端验证 |
| UI 测试 | Playwright | ~10% | 分钟 | 关键用户路径 |

**核心原则**：API 测试比 UI 快 10-100 倍。尽可能推到金字塔底层。

## 执行顺序（重要！）

```
┌─────────────────┐
│  1. API 测试    │  ← 永远先跑
│    (Newman)     │     后端挂了 → 立即发现
└────────┬────────┘
         ↓ 通过后
┌─────────────────┐
│  2. UI 测试     │  ← 再跑
│   (Playwright)  │     只验证关键路径
└─────────────────┘
```

如果后端 API 挂了，UI 测试会超时并报出令人困惑的错误。API 先行能在秒级发现后端问题。

## 快速开始

### 运行 API 测试（Newman）

```bash
# 安装 Newman（如果未安装）
npm install -g newman newman-reporter-htmlextra

# 运行测试
newman run tests/api/collections/api-tests.postman_collection.json \
  -e tests/api/environments/staging.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/newman-report.html
```

### 运行 UI 测试（Playwright）

```bash
# 安装 Playwright（如果未安装）
npm install -D @playwright/test
npx playwright install

# 运行测试
npx playwright test tests/ui/tests/ --project=chromium
```

### 运行完整 E2E 流水线

```bash
# 1. 先跑 API 测试
newman run tests/api/collections/api-tests.json -e staging.json --bail

# 2. API 通过后，跑 UI 测试
npx playwright test
```

---

## Part A: Playwright UI 测试

详细参考：`references/playwright-best-practices.md`

### 项目结构

```
tests/ui/
├── tests/                  # 按功能域组织
│   ├── auth/
│   │   └── auth.setup.ts   # 认证 setup project
│   ├── checkout/
│   │   └── checkout.spec.ts
│   └── dashboard/
│       └── dashboard.spec.ts
├── pages/                  # Page Object Model
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── CheckoutPage.ts
├── fixtures/
│   └── fixtures.ts         # 自定义 fixtures
├── data/
│   └── testData.json
└── playwright.config.ts
```

**关键规范**：
- 测试文件按**功能域**分目录（`checkout/`、`auth/`）
- 文件命名：`create-order-happy-path.spec.ts`（描述性）
- Page Object：`PascalCase`（`LoginPage.ts`）
- 工具函数：`camelCase`（`dateUtils.ts`）

### Page Object Model + Fixtures

```typescript
// pages/LoginPage.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // ✅ 语义化定位器优先级：getByRole > getByLabel > getByText > getByTestId
    this.emailInput = page.getByLabel('邮箱');
    this.passwordInput = page.getByLabel('密码');
    this.submitButton = page.getByRole('button', { name: '登录' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### 认证状态复用（Setup Project）

Playwright 的 **Setup Project 模式** 只登录一次，将 `storageState` 保存为 JSON：

```typescript
// tests/auth/auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('认证', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill('test@example.com');
  await page.getByLabel('密码').fill('password123');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

⚠️ 始终将 `playwright/.auth` 加入 `.gitignore`。

### 定位器优先级

```
getByRole → getByLabel → getByPlaceholder → getByText → getByTestId
```

| 定位器 | 用途 | 示例 |
|--------|------|------|
| `getByRole` | 语义化元素 | `page.getByRole('button', { name: '提交' })` |
| `getByLabel` | 表单字段 | `page.getByLabel('邮箱')` |
| `getByPlaceholder` | 输入框 | `page.getByPlaceholder('请输入')` |
| `getByText` | 文本内容 | `page.getByText('欢迎')` |
| `getByTestId` | 最后手段 | `page.getByTestId('submit-btn')` |

⚠️ **避免使用 CSS 类选择器** — 样式变更会导致测试失败。

### 消除 Flaky 测试

| 原因 | 对策 |
|------|------|
| 竞态条件 | 使用 web-first 断言 `await expect(locator).toBeVisible()` 自动重试 |
| 硬编码等待 | ❌ 永远不用 `waitForTimeout()`，用有意义的等待条件 |
| 第三方 API 不稳定 | 用 `page.route()` Mock 外部 API 请求 |
| 状态污染 | 保证每个测试独立运行 |
| 选择器脆弱 | 使用语义化定位器 |

---

## Part B: Newman API 测试

详细参考：`references/newman-best-practices.md`

### Collection 组织

```
Collection: MyApp API Tests
├── 🔐 Authentication
│   ├── POST Login
│   ├── POST Register
│   └── POST Refresh Token
├── 👤 Users
│   ├── GET List Users
│   ├── GET User By ID
│   ├── POST Create User
│   ├── PUT Update User
│   └── DELETE User
├── 🛒 Orders
│   ├── GET List Orders
│   ├── POST Create Order
│   └── PATCH Update Order Status
└── 🔧 Health Check
    └── GET Health
```

**命名规范**：`HTTP方法 资源 - 动作描述`，如 `POST User - Create New`。

### 变量管理

| 变量类型 | 用途 | 示例 |
|----------|------|------|
| Environment | 环境间变化的值 | `base_url`, `auth_token` |
| Collection | 集合内的常量 | `api_version`, `timeout` |
| Global | 跨集合共享 | `common_headers` |
| Data | 数据驱动测试 | CSV/JSON 文件中的行 |

⚠️ **关键注意**：Newman 只读取环境文件的 **initial/shared value**，不读 Postman 的 current value。

### 集合级自动刷新 JWT Token

```javascript
// Collection-level pre-request script
const tokenExpiry = pm.collectionVariables.get("token_expiry");
if (!tokenExpiry || Date.now() > parseInt(tokenExpiry)) {
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/auth/login",
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        email: pm.environment.get("auth_email"),
        password: pm.environment.get("auth_password")
      })
    }
  }, (err, response) => {
    if (!err) {
      const json = response.json();
      pm.collectionVariables.set("auth_token", json.token);
      pm.collectionVariables.set("token_expiry", (Date.now() + 3500000).toString());
    }
  });
}
```

### JSON Schema 验证

```javascript
const schema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" }
  },
  required: ["id", "name", "email"],
  additionalProperties: false  // 严格模式
};

pm.test("响应匹配 JSON Schema", () => {
  pm.response.to.have.jsonSchema(schema);
});
```

### Newman CLI 完整命令

```bash
newman run collection.json \
  -e production.json \           # 环境文件
  -g globals.json \              # 全局变量
  -d testdata.csv \              # 数据驱动文件
  -n 3 \                         # 迭代次数
  --delay-request 500 \          # 请求间延迟（ms）
  --timeout-request 30000 \      # 单请求超时（ms）
  --bail \                       # 首次失败即停止
  --reporters cli,htmlextra,junit \
  --reporter-htmlextra-export reports/newman-report.html \
  --reporter-junit-export reports/newman-junit.xml
```

---

## 诊断命令

```bash
# Playwright
npx playwright test --repeat-each=5      # 检测 flaky
npx playwright test --shard=1/4          # CI 分片
npx playwright show-report               # 查看报告
npx playwright test --ui                 # UI 模式调试

# Newman
newman run collection.json --bail        # 首次失败停止
newman run collection.json -n 3          # 跑 3 遍
newman run collection.json --delay-request 500  # 请求间延迟
```

---

## 模板文件

使用以下模板快速开始：

| 模板 | 用途 |
|------|------|
| `templates/playwright.config.ts` | Playwright 配置 |
| `templates/base-page.ts` | Page Object 基类 |
| `templates/auth.setup.ts` | 认证 setup |
| `templates/fixtures.ts` | Fixtures 模板 |
| `templates/newman-collection.json` | Newman collection |

---

## 相关 Skills

- **api-testing** — 简化版 Newman 测试
- **tdd** — 测试驱动开发
- **debugging** — 调试失败的测试
