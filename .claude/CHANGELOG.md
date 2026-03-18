# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-16

### Added

#### 核心系统
- `core/router` — 智能技能路由器
- `core/onboard` — 新人引导系统
- `SKILL-CATALOG.md` — 完整技能索引

#### 工作流层（13 个 skills）
- `workflow/brainstorming` — 需求探索和设计
- `workflow/tdd` — 测试驱动开发
- `workflow/debugging` — 系统化调试
- `workflow/writing-plans` — 编写实现计划
- `workflow/executing-plans` — 执行实现计划
- `workflow/subagent-driven-development` — 并行 agent 开发
- `workflow/dispatching-parallel-agents` — 分发并行 agent
- `workflow/git-worktrees` — 使用 git worktrees
- `workflow/finishing-branch` — 完成开发分支
- `workflow/requesting-code-review` — 请求代码审查
- `workflow/receiving-code-review` — 处理审查反馈
- `workflow/verification` — 完成前验证
- `workflow/writing-skills` — 编写新 skills

#### 测试层（2 个 skills）
- `testing/web-testing` — 全栈 E2E 测试（Playwright + Newman）
  - 完整的 SKILL.md 主文档
  - playwright-best-practices.md 参考
  - newman-best-practices.md 参考
  - 5 个模板文件
- `testing/api-testing` — Newman API 测试（简化版）

#### 设计层（2 个 skills）
- `design/frontend-design` — 前端页面设计
- `design/ui-ux-system` — 设计系统（161 调色板、57 字体）

#### 文档层（7 个 skills）
- `docs/pdf` — PDF 处理
- `docs/pptx` — PPT 演示文稿
- `docs/docx` — Word 文档
- `docs/xlsx` — Excel 表格
- `docs/canvas-design` — 视觉设计
- `docs/theme-factory` — 主题样式
- `docs/doc-coauthoring` — 文档协作

#### 工具层（6 个 skills）
- `tools/mcp-builder` — 构建 MCP 服务器
- `tools/skill-creator` — 创建新 skill
- `tools/claude-api` — Claude API 开发
- `tools/algorithmic-art` — 算法艺术
- `tools/web-artifacts-builder` — Web artifacts 构建
- `tools/planning` — Manus 风格文件规划

#### 文档
- `README.md` — 分发包入口
- `INSTALL.md` — 安装指南
- `CHANGELOG.md` — 变更日志

### Sources

整合自以下项目：
- [Superpowers](https://github.com/obra/superpowers) v5.0.2
- [Example-skills](https://github.com/anthropics/anthropic-cookbook)
- [UI-UX-Pro-Max](https://github.com/...) v2.0.1
- [Planning-with-files](https://github.com/...) v2.23.0