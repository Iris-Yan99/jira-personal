#!/bin/bash
# Story Frontmatter Validator
# Checks story markdown files for common validation issues before they hit runtime.
#
# Usage: bash .claude/hooks/lint-story.sh [file...]
#   No args = check all docs/stories/*.md
#   With args = check only specified files
#
# "Linter as Prompt" pattern: errors include fix instructions for agent self-repair.

ERRORS=0
WARNINGS=0
FILES="$@"

if [ -z "$FILES" ]; then
  FILES=$(ls docs/stories/*.md 2>/dev/null)
fi

# Valid values (must match lib/status.ts DocStatus)
VALID_STATUSES="draft pending in-progress done blocked ready"

# Helper: extract YAML value, strip quotes and whitespace
yaml_val() {
  echo "$1" | grep "^$2:" | head -1 | sed "s/^$2://" | tr -d '"' | tr -d "'" | sed 's/^ *//' | sed 's/ *$//'
}

for file in $FILES; do
  [ -f "$file" ] || continue

  # Extract frontmatter (between --- markers)
  FM=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')
  [ -z "$FM" ] && continue

  BASENAME=$(basename "$file")

  # Check id: exists and starts with US- or AS-
  ID=$(yaml_val "$FM" "id")
  if [ -z "$ID" ]; then
    echo "ERROR: $BASENAME — missing required 'id' field"
    echo "  FIX: Add id: \"US-XXX-NNN\" to frontmatter"
    ERRORS=$((ERRORS + 1))
  elif ! echo "$ID" | grep -qE '^(US-|AS-)'; then
    echo "WARNING: $BASENAME — id '$ID' does not start with US- or AS-"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check filename matches id
  if [ -n "$ID" ]; then
    EXPECTED_FILE="${ID}.md"
    if [ "$BASENAME" != "$EXPECTED_FILE" ]; then
      echo "ERROR: $BASENAME — filename doesn't match id '$ID'"
      echo "  FIX: Rename file to $EXPECTED_FILE (run: git mv \"$file\" \"docs/stories/$EXPECTED_FILE\")"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check title: exists
  TITLE=$(yaml_val "$FM" "title")
  if [ -z "$TITLE" ]; then
    echo "ERROR: $BASENAME — missing required 'title' field"
    echo "  FIX: Add title: \"Description of story\" to frontmatter"
    ERRORS=$((ERRORS + 1))
  fi

  # Check status: exists and is canonical
  STATUS=$(yaml_val "$FM" "status")
  if [ -z "$STATUS" ]; then
    echo "ERROR: $BASENAME — missing required 'status' field"
    echo "  FIX: Add status: \"draft\" to frontmatter. Valid: $VALID_STATUSES"
    ERRORS=$((ERRORS + 1))
  elif [ -n "$STATUS" ]; then
    match=0
    for v in $VALID_STATUSES; do [ "$STATUS" = "$v" ] && match=1; done
    if [ $match -eq 0 ]; then
      echo "ERROR: $BASENAME — status '$STATUS' not valid"
      echo "  FIX: Use one of: $VALID_STATUSES"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check prd: reference exists
  PRD=$(yaml_val "$FM" "prd")
  if [ -z "$PRD" ]; then
    echo "WARNING: $BASENAME — missing 'prd' field (story should reference a PRD)"
    WARNINGS=$((WARNINGS + 1))
  fi

done

echo ""
echo "=== Story Lint Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
  exit 1
fi
