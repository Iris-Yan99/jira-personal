#!/bin/bash
# 测试 Brainstorming 输出是否符合 3 层文档体系
# 用法: bash .claude/scripts/test-brainstorm-output.sh <spec-file.md>
# 或者: bash .claude/scripts/test-brainstorm-output.sh --latest

set -e

echo "=== 🧠 Brainstorming 输出 → 3 层体系测试 ==="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# 获取 spec 文件
if [ "$1" == "--latest" ]; then
    SPEC_FILE=$(ls -t docs/superpowers/specs/*-design.md 2>/dev/null | head -1)
    if [ -z "$SPEC_FILE" ]; then
        echo -e "${RED}❌ 没有找到任何 spec 文件${NC}"
        exit 1
    fi
    echo -e "📄 测试最新的 spec: ${BLUE}$SPEC_FILE${NC}"
elif [ -n "$1" ]; then
    SPEC_FILE="$1"
    if [ ! -f "$SPEC_FILE" ]; then
        echo -e "${RED}❌ 文件不存在: $SPEC_FILE${NC}"
        exit 1
    fi
else
    echo "用法: $0 <spec-file.md>"
    echo "      $0 --latest"
    exit 1
fi

echo ""

# 1. 检查 Spec 结构
echo "### 1️⃣ Spec 结构测试"

# 检查是否有 YAML frontmatter
if head -3 "$SPEC_FILE" | grep -q "^---$"; then
    echo -e "  ${GREEN}✅ 有 YAML frontmatter${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 没有 YAML frontmatter（可选）${NC}"
    ((WARN++))
fi

# 检查关键 section
REQUIRED_SECTIONS=("## Problem" "## Solution" "## Implementation" "## Success Criteria")
for section in "${REQUIRED_SECTIONS[@]}"; do
    if grep -q "$section" "$SPEC_FILE"; then
        echo -e "  ${GREEN}✅ 包含: $section${NC}"
        ((PASS++))
    else
        echo -e "  ${RED}❌ 缺少: $section${NC}"
        ((FAIL++))
    fi
done

echo ""

# 2. 检查是否可以映射到 3 层体系
echo "### 2️⃣ 3 层体系映射测试"

# 提取关键信息
SPEC_NAME=$(basename "$SPEC_FILE" .md)
SPEC_DATE=$(echo "$SPEC_NAME" | grep -oE "^[0-9]{4}-[0-9]{2}-[0-9]{2}" || echo "")

if [ -n "$SPEC_DATE" ]; then
    echo -e "  ${GREEN}✅ 日期格式正确: $SPEC_DATE${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 文件名没有日期前缀${NC}"
    ((WARN++))
fi

# 检查是否已经有对应的 PRD
SPEC_TOPIC=$(echo "$SPEC_NAME" | sed 's/^[0-9-]*//' | sed 's/^-//')
PRD_CANDIDATE="docs/prds/PRD-$(echo $SPEC_TOPIC | tr '[:lower:]' '[:upper:]' | tr '-' '-').md"

if [ -f "$PRD_CANDIDATE" ]; then
    echo -e "  ${GREEN}✅ 已有对应 PRD: $PRD_CANDIDATE${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 还没有对应 PRD（需要创建）${NC}"
    echo -e "     建议路径: docs/prds/PRD-$(echo $SPEC_TOPIC | tr '[:lower:]' '[:upper:]').md"
    ((WARN++))
fi

echo ""

# 3. 检查 PRD 必填字段准备
echo "### 3️⃣ PRD 字段准备测试"

# 检查是否包含 PRD 所需信息
PRD_FIELDS=("id:" "title:" "description:" "status:" "pattern:" "keyLearning:" "project:")
FOUND_FIELDS=0

for field in "${PRD_FIELDS[@]}"; do
    if grep -qi "$field" "$SPEC_FILE"; then
        ((FOUND_FIELDS++))
    fi
done

if [ $FOUND_FIELDS -ge 4 ]; then
    echo -e "  ${GREEN}✅ 包含足够 PRD 信息 ($FOUND_FIELDS/7 字段)${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ PRD 信息不足 ($FOUND_FIELDS/7 字段)${NC}"
    echo "     需要在转换为 PRD 时补充: id, title, description, status, pattern, keyLearning, project"
    ((WARN++))
fi

# 检查是否有 Stories 迹象
if grep -qi "user story\|story\|用户故事\|用户能" "$SPEC_FILE"; then
    echo -e "  ${GREEN}✅ 包含 Story 级别信息${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 缺少 Story 级别信息${NC}"
    ((WARN++))
fi

# 检查是否有 Cards 迹象
if grep -qi "API\|endpoint\|component\|interface\|card\|端点\|组件" "$SPEC_FILE"; then
    echo -e "  ${GREEN}✅ 包含 Card 级别技术信息${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 缺少 Card 级别技术信息${NC}"
    ((WARN++))
fi

echo ""

# 4. 检查设计决策
echo "### 4️⃣ 设计决策测试"

# 检查是否考虑了替代方案
if grep -qi "alternative\|option\|approach\|trade-off\|替代\|方案\|权衡" "$SPEC_FILE"; then
    echo -e "  ${GREEN}✅ 包含方案比较${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 没有方案比较${NC}"
    ((WARN++))
fi

# 检查是否有错误处理考虑
if grep -qi "error\|failure\|edge case\|fallback\|错误\|失败\|边界" "$SPEC_FILE"; then
    echo -e "  ${GREEN}✅ 包含错误处理考虑${NC}"
    ((PASS++))
else
    echo -e "  ${YELLOW}⚠️ 没有错误处理考虑${NC}"
    ((WARN++))
fi

echo ""

# 总结
echo "=== 📊 测试结果 ==="
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo -e "${YELLOW}警告: $WARN${NC}"

echo ""
echo "### 📋 转换建议"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo "✅ Spec 结构良好，可以转换为 3 层文档："
    echo ""
    echo "1. 创建 PRD:"
    echo "   docs/prds/PRD-$(echo $SPEC_TOPIC | tr '[:lower:]' '[:upper]' | tr -d '-').md"
    echo ""
    echo "2. 从 Spec 中提取 Stories"
    echo ""
    echo "3. 为每个 Story 创建 Cards"
    echo ""
    echo "4. 在代码中使用 @card 引用"
fi

if [ $FAIL -gt 0 ]; then
    echo ""
    echo "❌ 存在失败项，请修复 Spec 后再转换"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo ""
    echo "⚠️ 存在警告项，建议补充"
    exit 0
else
    echo ""
    echo "✅ 所有测试通过！"
    exit 0
fi
