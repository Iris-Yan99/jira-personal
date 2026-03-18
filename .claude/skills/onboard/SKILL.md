---
name: onboard
description: |
  新人引导系统。检测项目类型，推荐相关 skills 和工作流程。
  触发：/onboard, "我是新手", "怎么开始", "帮助我了解"
user-invocable: true
---

# 新人引导

检测你的项目环境，推荐相关 skills 和工作流程。

## 触发方式

- 用户输入 `/core/onboard`
- 用户说"我是新手"、"怎么开始"、"帮助我了解"

## 工作流程

```
/onboard
    ↓
Step 1: 检测项目环境
    ↓
Step 2: 识别项目类型
    ↓
Step 3: 推荐相关 Skills
    ↓
Step 4: 生成快速开始指南
```

## Step 1: 检测项目环境

自动检测以下特征：

| 文件/目录 | 检测结果 |
|-----------|----------|
| `package.json` | Node.js 项目 |
| `next.config.js` / `next.config.mjs` | Next.js 项目 |
| `directus/` / `directus.config.js` | Directus 项目 |
| `playwright.config.ts` | 已有 E2E 测试 |
| `*.postman_collection.json` | 已有 API 测试 |
| `tailwind.config.js` | Tailwind CSS |
| `app/` 目录结构 | Next.js App Router |
| `pages/` 目录结构 | Next.js Pages Router |
| `lib/d11/` | Directus 11 集成 |

## Step 2: 识别项目类型

输出示例：

```
🔍 项目检测完成

┌─────────────────────────────────────┐
│  项目类型: Next.js + Directus 全栈  │
│  测试状态: Playwright ✓  Newman ✗   │
│  样式方案: Tailwind CSS              │
│  架构: App Router                    │
└─────────────────────────────────────┘
```

## Step 3: 推荐相关 Skills

基于项目类型推荐：

```
📦 为你的项目推荐的 Skills：

【必装 - 开发流程】
  ✅ /brainstorming   — 开始任何新功能前
  ✅ /tdd             — 测试驱动开发
  ✅ /debugging       — 遇到 bug 时

【必装 - 测试】
  ✅ /web-testing     — E2E + API 测试（Playwright + Newman）

【推荐 - Directus 项目】
  ⭐ /directus-schema — Schema 参考
  ⭐ /migration       — 数据库迁移
  ⭐ /rbac            — 权限管理
  ⭐ /d11-frontend    — D11 前端集成

【可选 - 设计】
  🔹 /frontend-design — 前端页面
  🔹 /ui-ux-system    — 设计系统

输入 skill 名称了解详情，或输入 'all' 查看全部可用 skills。
```

## Step 4: 生成快速开始指南

```markdown
## 快速开始

### 1. 创建新功能
/onboard → 选择"创建功能" → /brainstorming

### 2. 修复 Bug
/debugging

### 3. 运行测试
/web-testing

### 4. 查看所有可用 Skills
/router

### 5. 继续开发
直接描述你想做什么，系统会自动推荐正确的 skill。
```

## 交互式问答模式

如果检测不确定，进入问答：

```
🤔 我检测到这可能是 Next.js 项目，但不确定。

请确认或选择：
1. ✅ 是的，是 Next.js 项目
2. 🔧 是 React 但不是 Next.js
3. 📦 是其他类型（请描述）

你的选择：_
```

## 项目类型与 Skills 映射

| 项目类型 | 推荐 Skills |
|----------|-------------|
| Next.js 全栈 | brainstorming, tdd, debugging, web-testing |
| Next.js + Directus | + directus-schema, migration, rbac, d11-frontend |
| React SPA | brainstorming, tdd, debugging, frontend-design |
| 纯后端 API | brainstorming, tdd, debugging, api-testing |
| 静态网站 | frontend-design, canvas-design |

## 与 Router 的区别

| Onboard | Router |
|---------|--------|
| 检测项目环境 | 分析具体任务意图 |
| 推荐"用什么工具" | 推荐"做什么" |
| 首次使用时触发 | 随时触发 |

## 相关 Skills

- **router** — 智能路由，分析任务意图
- **SKILL-CATALOG.md** — 完整技能索引
```