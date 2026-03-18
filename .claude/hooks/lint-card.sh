#!/bin/bash
# Card Frontmatter Validator
# Checks card markdown files for common validation issues before they hit runtime.
#
# Usage: bash .claude/hooks/lint-card.sh [file...]
#   No args = check all docs/cards/CARD-*.md
#   With args = check only specified files
#
# "Linter as Prompt" pattern: errors include fix instructions for agent self-repair.
# @card CARD-HEALTH-001 — Mechanical enforcement of card standards

ERRORS=0
WARNINGS=0
FILES="$@"

if [ -z "$FILES" ]; then
  FILES=$(ls docs/cards/CARD-*.md 2>/dev/null)
fi

# Valid values (must match lib/status.ts DocStatus)
VALID_STATUSES="draft pending in-progress done blocked ready"

# Helper: extract YAML value, strip quotes and whitespace
yaml_val() {
  echo "$1" | grep "^$2:" | head -1 | sed "s/^$2://" | tr -d '"' | tr -d "'" | sed 's/^ *//' | sed 's/ *$//'
}

# Helper: check if value is in valid list
in_list() {
  local val="$1"; shift
  for v in "$@"; do [ "$val" = "$v" ] && return 0; done
  return 1
}

CHECKED=0

for file in $FILES; do
  [ -f "$file" ] || continue

  # Extract frontmatter (between first two --- markers only)
  # Uses awk to stop after the closing --- to avoid matching horizontal rules in body
  FM=$(awk 'BEGIN{n=0} /^---$/{n++; if(n==2) exit; next} n==1{print}' "$file")
  [ -z "$FM" ] && continue

  BASENAME=$(basename "$file")
  CHECKED=$((CHECKED + 1))

  # === REQUIRED FIELDS ===

  # Check id: exists and starts with CARD-
  ID=$(yaml_val "$FM" "id")
  if [ -z "$ID" ]; then
    echo "ERROR: $BASENAME — missing required 'id' field"
    echo "  FIX: Add id: \"CARD-XXX-NNN\" to frontmatter (see card-template-v2.md)"
    ERRORS=$((ERRORS + 1))
  elif ! echo "$ID" | grep -qE '^CARD-'; then
    echo "ERROR: $BASENAME — id '$ID' does not start with CARD-"
    echo "  FIX: Card IDs must follow CARD-{CONTEXT}-{NUMBER} format (e.g., CARD-AUTH-001)"
    ERRORS=$((ERRORS + 1))
  fi

  # Check filename matches id
  if [ -n "$ID" ]; then
    EXPECTED_FILE="${ID}.md"
    if [ "$BASENAME" != "$EXPECTED_FILE" ]; then
      echo "ERROR: $BASENAME — filename doesn't match id '$ID'"
      echo "  FIX: Rename file to $EXPECTED_FILE (run: git mv \"$FILE\" \"docs/cards/$EXPECTED_FILE\")"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check title: exists
  TITLE=$(yaml_val "$FM" "title")
  if [ -z "$TITLE" ]; then
    echo "ERROR: $BASENAME — missing required 'title' field"
    echo "  FIX: Add title: \"Description of card\" to frontmatter"
    ERRORS=$((ERRORS + 1))
  fi

  # Check status: exists and is canonical
  STATUS=$(yaml_val "$FM" "status")
  if [ -z "$STATUS" ]; then
    echo "ERROR: $BASENAME — missing required 'status' field"
    echo "  FIX: Add status: \"draft\" to frontmatter. Valid: $VALID_STATUSES"
    ERRORS=$((ERRORS + 1))
  else
    if ! in_list "$STATUS" $VALID_STATUSES; then
      echo "ERROR: $BASENAME — status '$STATUS' is not canonical"
      echo "  FIX: Change to one of: $VALID_STATUSES (see lib/status.ts)"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # === DATE QUOTING ===
  # Unquoted YYYY-MM-DD in YAML gets parsed as JS Date by gray-matter

  for datefield in created_date last_updated updated_date completed_date updated; do
    RAW_LINE=$(echo "$FM" | grep "^$datefield:" | head -1)
    if [ -n "$RAW_LINE" ]; then
      RAW_VAL=$(echo "$RAW_LINE" | sed "s/^$datefield://" | sed 's/^ *//')
      # Check if it's an unquoted date (starts with digit, no quotes)
      if echo "$RAW_VAL" | grep -qE '^[0-9]{4}-[0-9]{2}'; then
        echo "ERROR: $BASENAME — $datefield is unquoted date"
        echo "  FIX: Wrap in quotes: $datefield: \"$RAW_VAL\" (YAML parses bare dates as Date objects)"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done

  # === RELATIONSHIP CHECKS ===

  # Check business_requirement has PRD- prefix (all PRD IDs are PRD-UPPERCASE)
  BR=$(yaml_val "$FM" "business_requirement")
  if [ -n "$BR" ] && [ "$BR" != "null" ] && [ "$BR" != "" ]; then
    if ! echo "$BR" | grep -qE '^PRD-'; then
      echo "WARN: $BASENAME — business_requirement '$BR' missing PRD- prefix"
      echo "  FIX: All PRD IDs use PRD- prefix (e.g., \"PRD-AI-CHAT\" not \"ai-chat\")"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # Check story reference is uppercase
  STORY=$(yaml_val "$FM" "story")
  if [ -n "$STORY" ] && [ "$STORY" != "null" ]; then
    if echo "$STORY" | grep -qE '^us-'; then
      echo "ERROR: $BASENAME — story '$STORY' is lowercase, must be uppercase"
      echo "  FIX: Change to uppercase (e.g., \"US-ONBOARD-001\")"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check depends_on entries are uppercase CARD- references
  echo "$FM" | grep -oE 'CARD-[A-Za-z0-9-]+' | while read -r dep; do
    if echo "$dep" | grep -qE '[a-z].*CARD'; then
      echo "WARN: $BASENAME — depends_on reference '$dep' has mixed case"
      echo "  FIX: Use UPPERCASE for all card references"
      echo "1" >> /tmp/lint-card-warnings.tmp
    fi
  done

done

# Count subshell warnings
if [ -f /tmp/lint-card-warnings.tmp ]; then
  SUBSHELL_WARNINGS=$(wc -l < /tmp/lint-card-warnings.tmp | tr -d ' ')
  WARNINGS=$((WARNINGS + SUBSHELL_WARNINGS))
  rm -f /tmp/lint-card-warnings.tmp
fi

# Summary
if [ $CHECKED -eq 0 ]; then
  echo "No card files found to check."
  exit 0
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Card frontmatter: $CHECKED files checked, all valid"
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Card frontmatter: $CHECKED files checked, $WARNINGS warning(s)"
else
  echo "❌ Card frontmatter: $CHECKED files checked, $ERRORS error(s), $WARNINGS warning(s)"
fi
exit $ERRORS
