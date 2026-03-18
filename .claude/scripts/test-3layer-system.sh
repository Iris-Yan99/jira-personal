#!/bin/bash
# 测试文档 3 层体系 (PRD → Story → Card) 是否正确遵守
# 用法: bash .claude/scripts/test-3layer-system.sh

set -e

echo "=== 📋 文档 3 层体系测试 ==="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# 1. 检查文件结构
echo "### 1️⃣ 结构测试 (文件命名和位置)"

# 检查 PRD 目录
if [ -d "docs/prds" ]; then
    PRD_COUNT=$(ls docs/prds/PRD-*.md 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✅ docs/prds/ 存在，包含 $PRD_COUNT 个 PRD 文件"
    ((PASS++))
else
    echo "  ⚠️ docs/prds/ 目录不存在（如果是纯 skills 仓库可忽略）"
    ((WARN++))
fi

# 检查 Story 目录
if [ -d "docs/stories" ]; then
    STORY_COUNT=$(ls docs/stories/US-*.md docs/stories/AS-*.md 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✅ docs/stories/ 存在，包含 $STORY_COUNT 个 Story 文件"
    ((PASS++))
else
    echo "  ⚠️ docs/stories/ 目录不存在"
    ((WARN++))
fi

# 检查 Card 目录
if [ -d "docs/cards" ]; then
    CARD_COUNT=$(ls docs/cards/CARD-*.md 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✅ docs/cards/ 存在，包含 $CARD_COUNT 个 Card 文件"
    ((PASS++))
else
    echo "  ⚠️ docs/cards/ 目录不存在"
    ((WARN++))
fi

echo ""

# 2. 检查 Frontmatter
echo "### 2️⃣ Frontmatter 测试 (必填字段)"

check_frontmatter() {
    local file=$1
    local type=$2
    local required_fields=$3

    if [ ! -f "$file" ]; then
        return
    fi

    # 检查是否有 YAML frontmatter
    if ! head -1 "$file" | grep -q "^---$"; then
        echo "  ${RED}❌ $file 缺少 YAML frontmatter${NC}"
        ((FAIL++))
        return
    fi

    # 检查必填字段
    for field in $required_fields; do
        if ! grep -q "^$field:" "$file"; then
            echo "  ${RED}❌ $file 缺少字段: $field${NC}"
            ((FAIL++))
        fi
    done

    echo "  ${GREEN}✅ $file frontmatter 正确${NC}"
    ((PASS++))
}

# 检查 PRD
if [ -d "docs/prds" ]; then
    for prd in docs/prds/PRD-*.md; do
        check_frontmatter "$prd" "PRD" "id title description status pattern keyLearning project"
    done
fi

echo ""

# 3. 检查双向链接
echo "### 3️⃣ 链接测试 (双向引用)"

if [ -d "docs/prds" ] && [ -d "docs/stories" ]; then
    # 检查 PRD 是否引用 Story
    for prd in docs/prds/PRD-*.md; do
        if [ -f "$prd" ]; then
            if grep -q "^stories:" "$prd"; then
                echo "  ✅ $(basename $prd) 引用了 Stories"
                ((PASS++))
            else
                echo "  ⚠️ $(basename $prd) 没有引用任何 Story"
                ((WARN++))
            fi
        fi
    done
fi

if [ -d "docs/stories" ] && [ -d "docs/cards" ]; then
    # 检查 Story 是否引用 Card
    for story in docs/stories/*.md; do
        if [ -f "$story" ]; then
            if grep -q "^cards:" "$story"; then
                echo "  ✅ $(basename $story) 引用了 Cards"
                ((PASS++))
            else
                echo "  ⚠️ $(basename $story) 没有引用任何 Card"
                ((WARN++))
            fi
        fi
    done
fi

echo ""

# 4. 检查 Changelog
echo "### 4️⃣ Changelog 测试 (更新记录)"

if [ -d "docs/stories" ]; then
    for story in docs/stories/*.md; do
        if [ -f "$story" ]; then
            if grep -q "## Changelog" "$story"; then
                echo "  ✅ $(basename $story) 有 Changelog"
                ((PASS++))
            else
                echo "  ${RED}❌ $(basename $story) 缺少 Changelog${NC}"
                ((FAIL++))
            fi
        fi
    done
fi

if [ -d "docs/cards" ]; then
    for card in docs/cards/CARD-*.md; do
        if [ -f "$card" ]; then
            if grep -q "## Changelog" "$card"; then
                echo "  ✅ $(basename $card) 有 Changelog"
                ((PASS++))
            else
                echo "  ${RED}❌ $(basename $card) 缺少 Changelog${NC}"
                ((FAIL++))
            fi
        fi
    done
fi

echo ""

# 5. 检查代码中的 @card 引用
echo "### 5️⃣ 代码关联测试 (@card 引用)"

if [ -d "app" ] || [ -d "lib" ] || [ -d "components" ]; then
    CARD_REFS=$(grep -r "@card" app/ lib/ components/ 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CARD_REFS" -gt 0 ]; then
        echo "  ✅ 代码中有 $CARD_REFS 处 @card 引用"
        ((PASS++))
    else
        echo "  ⚠️ 代码中没有 @card 引用（所有实现都应有对应的 Card）"
        ((WARN++))
    fi
else
    echo "  ℹ️ 纯 skills 仓库，跳过代码关联测试"
fi

echo ""

# 总结
echo "=== 📊 测试结果 ==="
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo -e "${YELLOW}警告: $WARN${NC}"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo "❌ 存在失败项，请检查上述错误并修复"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo ""
    echo "⚠️ 存在警告项，建议检查"
    exit 0
else
    echo ""
    echo "✅ 所有测试通过！"
    exit 0
fi
