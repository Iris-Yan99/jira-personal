#!/bin/bash
# D11 Collection Name Validator
# Checks that Directus D11 loader files use valid collection names.
#
# Usage: bash .claude/hooks/lint-d11.sh
# Exit 0 = all valid, Exit 1 = errors found
#
# "Linter as Prompt" pattern: errors include fix instructions.

VALID_COLLECTIONS="prd_documents stories cards"
LOADER_FILES="lib/prd-loader.ts lib/story-loader.ts lib/card-loader.ts lib/ai-chat/context-assembler.ts"
ERRORS=0

for file in $LOADER_FILES; do
  [ -f "$file" ] || continue

  # Extract /items/COLLECTION patterns, skip ${} interpolation
  cols=$(grep -o '/items/[a-z_]*' "$file" 2>/dev/null | sed 's|/items/||' | sort -u)

  for col in $cols; do
    match=0
    for v in $VALID_COLLECTIONS; do
      [ "$col" = "$v" ] && match=1
    done
    if [ $match -eq 0 ]; then
      line=$(grep -n "/items/$col" "$file" | head -1 | cut -d: -f1)
      echo "ERROR: $file:$line — unknown D11 collection '$col'"
      echo "  FIX: Replace '/items/$col' with one of: $VALID_COLLECTIONS"
      echo "  WHY: D11 returns 403 for non-existent collections (not 404)"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ D11 collection names: all valid"
else
  echo "❌ Found $ERRORS invalid D11 collection name(s)"
fi
exit $ERRORS
