#!/bin/bash
# PostToolUse hook for Edit/Write tools
# Auto-runs the appropriate lint script after editing relevant files.
# @story US-RIGID-004
#
# Exit 0 = always (informational, never blocks)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# PRD files
if echo "$FILE_PATH" | grep -q 'docs/prds/.*\.md$'; then
  echo "AUTO-LINT: Running PRD lint on $(basename "$FILE_PATH")..."
  bash .claude/hooks/lint-prd.sh "$FILE_PATH" 2>&1
  exit 0
fi

# Card files
if echo "$FILE_PATH" | grep -q 'docs/cards/.*\.md$'; then
  echo "AUTO-LINT: Running card lint on $(basename "$FILE_PATH")..."
  bash .claude/hooks/lint-card.sh "$FILE_PATH" 2>&1
  exit 0
fi

# Story files
if echo "$FILE_PATH" | grep -q 'docs/stories/.*\.md$'; then
  echo "AUTO-LINT: Running story lint on $(basename "$FILE_PATH")..."
  bash .claude/hooks/lint-story.sh "$FILE_PATH" 2>&1
  exit 0
fi

# D11 loader files
if echo "$FILE_PATH" | grep -q 'lib/d11/.*\.ts$'; then
  echo "AUTO-LINT: Running D11 lint..."
  bash .claude/hooks/lint-d11.sh 2>&1
  exit 0
fi

exit 0
