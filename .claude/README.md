# 🚀 Claude Skills Pack

一套完整的 AI 辅助开发技能包，可直接复制到任何项目使用。

## 特点

- ✅ **完全自包含** — 无需安装任何插件
- ✅ **智能路由** — 自动推荐正确的 skill
- ✅ **新人友好** — `/core/onboard` 一键引导
- ✅ **E2E 测试** — Playwright + Newman 最佳实践
- ✅ **可分发** — 复制即可分享给团队

## 快速开始

### 安装

```bash
# 复制到你的项目
cp -r .claude/ /path/to/your/project/.claude/
```

### 首次使用

在 Claude Code 中输入：

```
/core/onboard
```

系统会检测你的项目类型并推荐相关工作流。

## 技能概览

### 🧭 核心系统

| Skill | 说明 |
|-------|------|
| `/core/router` | 智能路由 — 告诉你该用什么 skill |
| `/core/onboard` | 新人引导 — 检测项目，推荐工作流 |

### 🔄 开发工作流

| Skill | 说明 |
|-------|------|
| `/workflow/brainstorming` | 需求探索 → 设计方案 |
| `/workflow/tdd` | 测试驱动开发（RED-GREEN-REFACTOR） |
| `/workflow/debugging` | 系统化调试（4 阶段） |
| `/workflow/writing-plans` | 编写实现计划 |
| `/workflow/executing-plans` | 执行实现计划 |
| `/workflow/git-worktrees` | 并行开发分支 |
| `/workflow/finishing-branch` | 完成分支（merge/PR） |
| `/workflow/verification` | 完成前验证 |

### 🧪 测试

| Skill | 说明 |
|-------|------|
| `/testing/web-testing` | **E2E + API 测试**（Playwright + Newman） |
| `/testing/api-testing` | Newman/Postman API 测试 |
| `/testing/code-review` | 代码审查 |
| `/testing/e2e-test` | E2E 测试 |

### 🎨 设计

| Skill | 说明 |
|-------|------|
| `/design/frontend-design` | 前端页面设计 |
| `/design/ui-ux-system` | 设计系统（161 调色板、57 字体） |

### 📄 文档

| Skill | 说明 |
|-------|------|
| `/docs/pdf` | PDF 处理 |
| `/docs/pptx` | PPT 演示文稿 |
| `/docs/docx` | Word 文档 |
| `/docs/xlsx` | Excel 表格 |
| `/docs/canvas-design` | 视觉设计 |
| `/docs/theme-factory` | 主题样式 |

### 🔧 工具

| Skill | 说明 |
|-------|------|
| `/tools/mcp-builder` | 构建 MCP 服务器 |
| `/tools/skill-creator` | 创建新 skill |
| `/tools/planning` | 文件规划（Manus 风格） |
| `/tools/claude-api` | Claude API 开发 |

## 文件结构

```
.claude/
├── skills/           # 所有技能
│   ├── core/         # 路由器 + 引导（2 个）
│   ├── workflow/     # 开发工作流（13 个）
│   ├── testing/      # 测试相关（4 个）
│   ├── design/       # 设计系统（2 个）
│   ├── docs/         # 文档处理（7 个）
│   ├── tools/        # 通用工具（6 个）
│   └── domain/       # 领域特定（17 个，可删除）
├── rules/            # 项目规则
├── hooks/            # 钩子脚本
├── settings.json     # 配置
├── SKILL-CATALOG.md  # 技能索引
└── README.md         # 本文件
```

## 自定义

### 移除不需要的 Skills

```bash
# 不需要领域特定的 skills？
rm -rf .claude/skills/domain/

# 不需要文档处理？
rm -rf .claude/skills/docs/

# 只保留核心？
rm -rf .claude/skills/domain/
rm -rf .claude/skills/docs/
rm -rf .claude/skills/tools/
```

### 添加项目特定规则

编辑 `.claude/rules/` 中的文件，或创建新规则。

## 常见工作流

### 创建新功能

```
1. /workflow/brainstorming     — 探索需求
2. /workflow/writing-plans     — 写实现计划
3. /workflow/tdd               — 测试驱动开发
4. /workflow/verification      — 完成前验证
5. /workflow/finishing-branch  — 提交/PR
```

### 修复 Bug

```
1. /workflow/debugging         — 系统化调试
2. /workflow/verification      — 确认修复
```

### 运行测试

```
1. /testing/web-testing        — E2E + API 测试
```

## 来源

本技能包整合自：

- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
- [Example-skills](https://github.com/anthropics/anthropic-cookbook) by Anthropic
- [UI-UX-Pro-Max](https://github.com/...)
- [Planning-with-files](https://github.com/...)

## License

MIT
