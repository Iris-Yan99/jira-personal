# Claude Code Skills 技能系统

Claude Code 根据任务描述自动调用的专业技能系统。

## 快速开始

| 我想... | 使用 Skill |
|---------|-----------|
| 创建新功能 | `brainstorming` → `writing-plans` → `tdd` |
| 修复 bug | `debugging` |
| 运行测试 | `web-testing` 或 `api-testing` |
| 设计页面 | `frontend-design` |
| 写文档 | `pdf` / `pptx` / `docx` |
| 代码审查 | `code-review` |
| 了解项目 | `onboard` |
| 找正确的 skill | `router` |

## 核心技能

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `router` | /router, "用什么skill", "帮我" | 智能路由，分析意图推荐正确的 skill |
| `onboard` | /onboard, "我是新手", "怎么开始" | 项目检测，推荐相关工作流程 |
| `progress` | /progress | 项目进度追踪 |

## 工作流技能

### 设计与规划

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `brainstorming` | /brainstorming, "创建功能", "新特性" | 需求探索，设计方案 |
| `writing-plans` | /writing-plans, "规划", "计划" | 编写实现计划 |
| `planning` | /planning | Manus 风格文件规划 |

### 开发流程

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `tdd` | /tdd, "测试驱动" | 测试驱动开发（RED-GREEN-REFACTOR） |
| `debugging` | /debugging, "bug", "报错", "失败" | 系统化调试（4 阶段） |
| `executing-plans` | /executing-plans, "执行计划" | 执行实现计划 |
| `verification` | "验证", "确认" | 完成前验证 |

### 代码审查

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `code-review` | /code-review, "PR", "代码审查" | 代码审查 |
| `requesting-code-review` | "请求审查" | 请求代码审查 |
| `receiving-code-review` | "处理反馈" | 处理审查反馈 |

### Git 与分支

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `git-worktrees` | /git-worktrees, "并行开发" | 使用 git worktrees |
| `finishing-branch` | "完成分支", "merge", "PR" | 完成开发分支 |

### Agent 与并行工作

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `dispatching-parallel-agents` | "并行 agent" | 分发并行 agents |
| `subagent-driven-development` | "子 agent" | 子 agent 驱动开发 |

## 测试技能

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `web-testing` | /web-testing, "e2e", "playwright" | **全栈 E2E 测试**（Playwright + Newman） |
| `api-testing` | /api-testing, "newman" | Newman/Postman API 测试 |
| `e2e-test` | /e2e-test, "E2E" | E2E + 集成测试 |

## 设计技能

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `frontend-design` | /frontend-design, "UI", "页面设计" | 前端页面设计 |
| `ui-ux-system` | "调色板", "字体", "UX" | 设计系统（161 调色板、57 字体） |

## 文档技能

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `pdf` | /pdf, "PDF" | PDF 文档处理 |
| `pptx` | /pptx, "PPT", "演示文稿" | PPT 演示文稿 |
| `docx` | /docx, "Word", "文档" | Word 文档 |
| `xlsx` | /xlsx, "Excel", "表格" | Excel 表格 |
| `canvas-design` | /canvas-design, "设计", "海报" | 视觉设计 |
| `doc-coauthoring` | "协作文档" | 文档协作 |
| `theme-factory` | "主题", "样式" | 主题样式 |

## 工具技能

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `mcp-builder` | /mcp-builder, "MCP 服务器" | 构建 MCP 服务器 |
| `skill-creator` | /skill-creator | 创建新 skill |
| `claude-api` | /claude-api, "Claude API", "SDK" | Claude API 开发 |
| `planning` | /planning, "Manus" | Manus 风格文件规划 |
| `algorithmic-art` | "算法艺术", "p5.js" | 算法艺术 |
| `web-artifacts-builder` | "artifacts" | Web artifacts 构建 |

## 领域技能（项目特定）

> 这些 skills 是项目特定的，分发给其他团队时可以移除。

### Directus 相关

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `directus-schema` | /directus-schema, "seed", "数据库" | Directus schema 参考 |
| `d11-frontend` | /d11-frontend, "D11 前端" | D11 前端集成 |
| `rbac` | /rbac, "权限", "角色" | RBAC 权限管理 |
| `backend-extension` | /backend-extension, "后端扩展" | 后端扩展开发 |
| `migration` | /migration, "迁移" | 数据迁移 |

### 项目管理

| Skill | 触发词 | 用途 |
|-------|--------|------|
| `ai-workflow` | /ai-workflow | AI 开发工作流 |
| `pm-comments` | /pm-comments, "synque", "sync" | PM 评论同步 |
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

## 目录结构

```
.claude/skills/
├── SKILL-CATALOG.md          # 完整技能索引
├── README.md                 # 英文版说明
├── README-CN.md              # 中文版说明（本文件）
├── [skill-name]/             # 每个 skill 在深度 1
│   ├── SKILL.md              # Skill 清单
│   ├── references/           # 参考文件（可选）
│   └── templates/            # 模板文件（可选）
└── ...
```

## Skill 工作原理

### 自动调用

Claude Code 根据描述自动匹配并调用 skill：

```
用户: "运行迁移"
→ Claude Code 调用 `migration` skill

用户: "为用户创建一个新集合"
→ Claude Code 调用 `migration` skill

用户: "运行 Newman 测试 OAuth API"
→ Claude Code 调用 `api-testing` skill

用户: "审查 PR #106"
→ Claude Code 调用 `code-review` skill
```

### 手动调用

用户可以显式调用 skill：

```bash
/brainstorming
/tdd
/web-testing
/migration
```

## 创建新 Skill

1. 创建目录：`mkdir -p .claude/skills/[skill-name]`
2. 创建 SKILL.md 文件：

```yaml
---
name: skill-name
description: 这个 skill 做什么。当用户说 X, Y, Z 时触发。
user-invocable: true
---

# Skill 名称

何时使用、触发词、工作流程...
```

## 重要发现

**Skill 发现机制只扫描深度 1 的目录。** 嵌套目录（深度 2+）中的 `SKILL.md` 文件不会被识别。

```
✅ skills/my-skill/SKILL.md      # 有效（深度 1）
❌ skills/category/my-skill/SKILL.md  # 无效（深度 2）
```

## 相关文档

- [SKILL-CATALOG.md](SKILL-CATALOG.md) - 完整技能索引
- [CLAUDE.md](../CLAUDE.md) - 项目概述
