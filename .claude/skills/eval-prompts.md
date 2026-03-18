# Skill Routing Evaluation Prompts

每个 prompt 标注了期望激活的 skill。用 `claude -p "prompt"` 测试，检查是否激活了正确的 skill。

## HIGH confidence（应直接路由，不经 router）

| # | Prompt | Expected Skill |
|---|---|---|
| 1 | "这个函数报了 TypeError，帮我看看" | debugging |
| 2 | "帮我写个 Playwright 测试，测试登录流程" | web-testing |
| 3 | "创建一个 PDF 报告，包含这个月的数据" | pdf |
| 4 | "把需求文档写成 PRD" | writing-plans |
| 5 | "用 TDD 方式写一个用户注册模块" | tdd |
| 6 | "帮我做个 React 登录组件" | frontend-design |
| 7 | "测试一下 /api/users 这个接口" | api-testing |
| 8 | "这个项目的设计系统需要一套 color tokens" | ui-ux-system |
| 9 | "做一个 D3 的柱状图来展示销售数据" | canvas-design |
| 10 | "把这三个 PDF 合并成一个" | pdf |
| 11 | "做个 10 页的产品介绍 PPT" | pptx |
| 12 | "帮我写个 Word 版的会议纪要" | docx |
| 13 | "导出成 Excel 表格" | xlsx |
| 14 | "创建一个 MCP server 来对接 Notion" | mcp-builder |
| 15 | "这个项目的进度怎么样了" | progress |
| 16 | "帮我搭建一下项目开发环境" | onboard |
| 17 | "做一个 Q1 的项目路线图" | planning |
| 18 | "review 一下这段代码有没有问题" | verification |
| 19 | "帮我写一个调用 Claude API 的脚本" | claude-api |
| 20 | "写一个新的 skill 来处理数据库迁移" | skill-creator |

## MEDIUM confidence（应触发 router 或需歧义消解）

| # | Prompt | Expected Behavior |
|---|---|---|
| 21 | "帮我做一个报告" | 询问格式（PDF/DOCX/PPTX）→ 路由到对应 skill |
| 22 | "先想想方案然后写成文档" | router → brainstorming → writing-plans |
| 23 | "测试一下这个功能" | 询问测试层级 → web-testing 或 api-testing 或 e2e-test |
| 24 | "帮我改进这个项目" | router → 根据上下文判断 |
| 25 | "帮我做数据可视化的 Excel 文件" | xlsx（主） + canvas-design（辅） |

## 反向测试（不应激活错误 skill）

| # | Prompt | Should NOT Activate |
|---|---|---|
| 26 | "写一个函数计算阶乘" | 不应激活任何 skill（普通编码任务） |
| 27 | "解释一下什么是 MCP 协议" | 不应激活 mcp-builder（只是问问题） |
| 28 | "git commit 一下" | 不应激活任何 skill |

## 验证命令

```bash
# 测试单个 prompt
claude -p "这个函数报了 TypeError，帮我看看"
# 检查输出中是否出现 "Skill(debugging)" 或读取 debugging/SKILL.md

# 批量测试（简单脚本）
for prompt in \
  "这个函数报了 TypeError" \
  "帮我写个 Playwright 测试" \
  "创建一个 PDF 报告" \
  "把需求文档写成 PRD"; do
  echo "=== Testing: $prompt ==="
  claude -p "$prompt" --print 2>&1 | head -20
  echo ""
done
```

## 评估标准

| 等级 | 标准 |
|---|---|
| ✅ **PASS** | 正确激活 skill，无多余路由 |
| ⚠️ **PARTIAL** | 激活正确 skill 但经过不必要的 router |
| ❌ **FAIL** | 激活错误的 skill 或未激活任何 skill |
