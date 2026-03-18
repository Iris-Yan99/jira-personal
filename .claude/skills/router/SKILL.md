---
name: router
description: |
  智能技能路由器。分析用户意图，推荐或自动调用正确的 skill。
  当用户不确定用什么 skill，或问题模糊时自动触发。
  触发词：/router, "用什么skill", "帮我", "怎么", "如何"
user-invocable: true
---

# 技能路由器

智能分析你的需求，推荐或自动调用正确的 skill。

## 何时触发

- 用户说"帮我..."但没指定具体 skill
- 用户描述问题但不知道有相关 skill
- 用户问"怎么..."、"如何..."
- 用户输入 `/core/router`

## 路由逻辑

```
用户输入
    ↓
分析意图（关键词 + 上下文）
    ↓
匹配技能索引表（读取 SKILL-CATALOG.md）
    ↓
┌─ 置信度 > 80% → 自动调用 skill
├─ 置信度 50-80% → 推荐并询问
└─ 置信度 < 50% → 返回候选列表
```

## 技能索引表

路由器读取 `../SKILL-CATALOG.md` 获取所有可用 skills。

### 意图匹配规则

| 意图关键词 | 推荐 Skill | 置信度 |
|-----------|-----------|--------|
| 创建功能、新特性、构建、开发 | brainstorming | 高 |
| 修复 bug、报错、失败、错误 | debugging | 高 |
| 测试、E2E、playwright、newman | web-testing | 高 |
| 写文档、PDF、PPT、Word | pdf / pptx / docx | 中 |
| 设计页面、UI、样式、组件 | frontend-design | 中 |
| 代码审查、PR、review | code-review | 中 |
| Directus、schema、迁移 | directus-schema / migration | 高 |
| 角色权限、RBAC | rbac | 高 |
| 规划、计划、任务分解 | writing-plans | 中 |
| TDD、测试驱动 | tdd | 高 |

## 输出示例

### 高置信度（自动调用）

```
🔍 检测到测试需求，正在调用 web-testing skill...
```

### 中置信度（推荐）

```
💡 你似乎想要创建新功能。推荐使用：

   1. /brainstorming — 先探索需求
   2. /writing-plans — 直接写实现计划

输入数字选择，或描述更多细节。
```

### 低置信度（列表）

```
📚 可用的 Skills：

【核心】
  /router    — 智能路由（当前）
  /onboard   — 新人引导

【工作流】
  /brainstorming    — 探索需求，设计功能
  /tdd              — 测试驱动开发
  /debugging        — 系统化调试
  /writing-plans    — 编写实现计划

【测试】
  /web-testing      — E2E + API 测试

【设计】
  /frontend-design  — 前端页面设计

输入 skill 名称或描述你的需求...
```

## 与 Onboard 的区别

| Router | Onboard |
|--------|---------|
| 分析具体任务意图 | 检测项目环境 |
| 推荐"做什么" | 推荐"用什么工具" |
| 随时触发 | 首次使用时触发 |

## 相关 Skills

- **onboard** — 新人引导，检测项目类型
- **SKILL-CATALOG.md** — 完整技能索引
```