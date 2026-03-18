# Skills Catalog

技能索引表，供 Router 和 Onboard 读取。

---

## 核心层 (Core)

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `router` | /router, 用什么skill, 帮我 | 智能路由，分析意图推荐 skill |
| `onboard` | /onboard, 新手, 怎么开始 | 新人引导，检测项目推荐工作流 |
| `general` | 通用, general | 通用 catch-all，无专用 skill 时使用 |
| `progress` | /progress, 进度 | Agent 团队进度编排与洞察 |

---

## 工作流层 (Workflow)

### 需求与设计

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `brainstorming` | /brainstorming, 创建功能, 新特性 | 需求探索，设计方案 |
| `writing-plans` | /writing-plans, 规划, 计划 | 编写实现计划 |

### 开发流程

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `tdd` | /tdd, 测试驱动 | 测试驱动开发（RED-GREEN-REFACTOR） |
| `debugging` | /debugging, bug, 报错, 失败 | 系统化调试（4 阶段） |
| `executing-plans` | /executing-plans, 执行计划 | 执行实现计划 |

### 代码审查

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `code-review` | /code-review, PR, 代码审查 | 代码审查 |
| `requesting-code-review` | 请求审查 | 请求代码审查 |
| `receiving-code-review` | 处理反馈 | 处理审查反馈 |

### Git 与分支

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `git-worktrees` | /git-worktrees, 并行开发 | 使用 git worktrees |
| `finishing-branch` | 完成分支, merge, PR | 完成开发分支 |

### Agent 相关

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `subagent-driven-development` | 并行 agent | 并行 agent 开发 |
| `dispatching-parallel-agents` | 分发 agent | 分发并行 agents |

### 其他

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `verification` | 验证, 确认 | 完成前验证 |
| `writing-skills` | 创建 skill | 编写新 skills |

---

## 测试层 (Testing)

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `web-testing` | /web-testing, playwright, newman, 测试 | **全栈 E2E 测试**（Playwright UI + Newman API） |
| `api-testing` | /api-testing, newman | Newman/Postman API 测试 |
| `e2e-test` | /e2e-test, E2E | E2E 测试 |
| `code-review` | /code-review, review | 代码审查 |

---

## 设计层 (Design)

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `frontend-design` | /frontend-design, UI, 页面设计 | 前端页面设计 |
| `ui-ux-system` | 调色板, 字体, UX | 设计系统（161 调色板、57 字体） |

---

## 文档层 (Docs)

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `pdf` | /pdf, PDF | PDF 文档处理 |
| `pptx` | /pptx, PPT, 演示文稿 | PPT 演示文稿 |
| `docx` | /docx, Word, 文档 | Word 文档 |
| `xlsx` | /xlsx, Excel, 表格 | Excel 表格 |
| `canvas-design` | /canvas-design, 设计, 海报 | 视觉设计 |
| `doc-coauthoring` | 协作文档 | 文档协作 |
| `theme-factory` | 主题, 样式 | 主题样式 |

---

## 工具层 (Tools)

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `mcp-builder` | /mcp-builder, MCP 服务器 | 构建 MCP 服务器 |
| `skill-creator` | /skill-creator | 创建新 skill |
| `claude-api` | /claude-api, Claude API, SDK | Claude API 开发 |
| `planning` | /planning, Manus | Manus 风格文件规划 |
| `algorithmic-art` | 算法艺术, p5.js | 算法艺术 |
| `web-artifacts-builder` | artifacts | Web artifacts 构建 |

---

## 领域层 (Domain)

> 这些 skills 是项目特定的，分发给其他团队时可以移除。

### Directus 相关

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `directus-schema` | /directus-schema, seed, 数据库 | Directus schema 参考 |
| `d11-frontend` | /d11-frontend, D11 前端 | D11 前端集成 |
| `rbac` | /rbac, 权限, 角色 | RBAC 权限管理 |
| `backend-extension` | /backend-extension, 后端扩展 | 后端扩展开发 |
| `migration` | /migration, 迁移 | 数据迁移 |

### 项目管理

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `ai-workflow` | /ai-workflow | AI 开发工作流 |
| `pm-comments` | /pm-comments, synque, sync | PM 评论同步 |
| `visualizer` | /visualizer | 数据可视化 |

### 其他

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `landing-page` | /landing-page | Landing page 管理 |
| `landing-audit` | /landing-audit | Landing page 审计 |
| `agent-teams` | /agent-teams | Agent 团队编排 |
| `team-health` | /team-health | 团队健康检查 |
| `business-prd-planner` | /business-prd-planner | PRD 规划 |
| `business-report` | /business-report | 商业报告 |
| `meta-evaluation` | /meta-evaluation | 元评估 |
| `context-review` | /context-review | 上下文审查 |
| `fresh-dev-onboarding` | /fresh-dev-onboarding | 新开发者入职 |

---

## 快速查找

### 按任务类型

| 我想... | 使用 Skill |
|---------|-----------|
| 创建新功能 | brainstorming → writing-plans → tdd |
| 修复 bug | debugging |
| 写测试 | web-testing 或 tdd |
| 设计页面 | frontend-design |
| 写文档 | pdf / pptx / docx |
| 代码审查 | code-review |
| 了解项目 | onboard |
| 找正确的 skill | router |

### 按项目类型

| 项目类型 | 推荐 Skills |
|----------|-------------|
| 全栈 Web | brainstorming, tdd, debugging, web-testing, frontend-design |
| 后端 API | brainstorming, tdd, debugging, api-testing |
| Directus | + directus-schema, migration, rbac, d11-frontend |
| 前端 SPA | brainstorming, tdd, debugging, frontend-design, ui-ux-system |
