#!/bin/bash
# Targeted TypeScript check for D11 loader files
# Runs full tsc but filters output to only critical files.
#
# Usage: bash .claude/hooks/lint-loaders.sh
# Exit 0 = no new errors in critical files, Exit 1 = errors found
#
# "Linter as Prompt" pattern: errors include fix instructions.

CRITICAL_FILES="lib/ai-chat/context-assembler|lib/card-loader|lib/prd-loader|lib/story-loader|lib/sync/directus-client"

# Known pre-existing errors to ignore (baseline)
KNOWN_ERRORS=3  # prd-loader:227, prd-loader:240, story-loader:147

echo "Running tsc --noEmit (filtering to critical files)..."

# Ensure Node is available (works with nvm, fnm, or system node)
if command -v nvm &>/dev/null; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null 2>&1
fi

OUTPUT=$(npx tsc --noEmit 2>/dev/null | grep -E "^($CRITICAL_FILES)")
COUNT=$(echo "$OUTPUT" | grep -c "error TS" 2>/dev/null || echo 0)

if [ "$COUNT" -le "$KNOWN_ERRORS" ]; then
  echo "✅ TypeScript: no new errors in critical files ($COUNT known)"
  exit 0
else
  NEW=$((COUNT - KNOWN_ERRORS))
  echo "❌ TypeScript: $NEW new error(s) in critical files"
  echo ""
  echo "$OUTPUT"
  echo ""
  echo "FIX: Check variable names and type compatibility."
  echo "     Common causes: renamed variable not updated everywhere,"
  echo "     missing property in type definition, wrong import."
  exit 1
fi
