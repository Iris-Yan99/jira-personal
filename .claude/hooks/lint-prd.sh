#!/bin/bash
# PRD Frontmatter Validator
# Checks PRD markdown files for common validation issues before they hit runtime.
#
# Usage: bash .claude/hooks/lint-prd.sh [file...]
#   No args = check all docs/prds/PRD-*.md
#   With args = check only specified files
#
# "Linter as Prompt" pattern: errors include fix instructions.

ERRORS=0
FILES="$@"

if [ -z "$FILES" ]; then
  FILES=$(ls docs/prds/*.md 2>/dev/null)
fi

# Valid values (must match prd-validator.ts / lib/status.ts canonical set)
# @card CARD-DATA-003 — Updated to canonical status values
VALID_STATUSES="draft pending in-progress done blocked ready"
VALID_PATTERNS="collection-driven discovery-driven requirements-first"
VALID_PROJECTS="ww rk vec lr lms foundation angliss blue ota synque d11 capy sl expo ks rs"
VALID_PHASE_STATUSES="draft pending in-progress done blocked ready"

# Helper: extract YAML value, strip quotes and whitespace
yaml_val() {
  echo "$1" | grep "^$2:" | head -1 | sed "s/^$2://" | tr -d '"' | tr -d "'" | tr -d ' '
}

for file in $FILES; do
  [ -f "$file" ] || continue

  # Extract frontmatter (between --- markers)
  FM=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')
  [ -z "$FM" ] && continue

  BASENAME=$(basename "$file")

  # Check filename matches id
  ID=$(yaml_val "$FM" "id")
  if [ -n "$ID" ]; then
    EXPECTED_FILE="${ID}.md"
    if [ "$BASENAME" != "$EXPECTED_FILE" ]; then
      echo "ERROR: $BASENAME — filename doesn't match id '$ID'"
      echo "  FIX: Rename file to $EXPECTED_FILE (run: git mv \"$file\" \"docs/prds/$EXPECTED_FILE\")"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check status
  STATUS=$(yaml_val "$FM" "status")
  if [ -n "$STATUS" ]; then
    match=0
    for v in $VALID_STATUSES; do [ "$STATUS" = "$v" ] && match=1; done
    if [ $match -eq 0 ]; then
      echo "ERROR: $BASENAME — status '$STATUS' not valid"
      echo "  FIX: Use one of: $VALID_STATUSES"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check pattern (warn on non-standard, don't block — custom values are allowed with fallback)
  PATTERN=$(yaml_val "$FM" "pattern")
  if [ -n "$PATTERN" ]; then
    match=0
    for v in $VALID_PATTERNS; do [ "$PATTERN" = "$v" ] && match=1; done
    if [ $match -eq 0 ]; then
      echo "WARN: $BASENAME — pattern '$PATTERN' is non-standard (will render with default styling)"
      echo "  FIX: Prefer one of: $VALID_PATTERNS"
    fi
  fi

  # Check project (skip array values like [ww, rk], allow * for cross-project)
  PROJECT=$(yaml_val "$FM" "project")
  if [ -n "$PROJECT" ] && ! echo "$PROJECT" | grep -q '^\['; then
    if [ "$PROJECT" != "*" ]; then
      match=0
      for v in $VALID_PROJECTS; do [ "$PROJECT" = "$v" ] && match=1; done
      if [ $match -eq 0 ]; then
        echo "ERROR: $BASENAME — project '$PROJECT' not valid"
        echo "  FIX: Use one of: $VALID_PROJECTS, * (cross-project), or array [ww, rk]"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi

  # Check progressPhases format
  if echo "$FM" | grep -q "progressPhases:"; then
    # Check for 'name:' instead of 'phase:' within progressPhases block
    if echo "$FM" | grep -q "^  - name:" && ! echo "$FM" | grep -q "^    phase:"; then
      echo "ERROR: $BASENAME — progressPhases uses 'name:' instead of 'phase:'"
      echo "  FIX: Replace '- name:' with '- phase:' in progressPhases entries"
      ERRORS=$((ERRORS + 1))
    fi

    # Check for missing 'tasks:' array
    if echo "$FM" | grep -q "progressPhases:" && ! echo "$FM" | grep -q "tasks:"; then
      echo "ERROR: $BASENAME — progressPhases missing 'tasks:' array"
      echo "  FIX: Add tasks: [{text: '...', completed: true/false}] to each phase"
      ERRORS=$((ERRORS + 1))
    fi

    # Check phase status values (only 4-space indented = progressPhases entries)
    echo "$FM" | grep "^    status:" | while read -r line; do
      ps=$(echo "$line" | sed 's/.*status://' | tr -d '"' | tr -d "'" | tr -d ' ')
      match=0
      for v in $VALID_PHASE_STATUSES; do [ "$ps" = "$v" ] && match=1; done
      if [ $match -eq 0 ]; then
        echo "ERROR: $BASENAME — progressPhases status '$ps' not valid"
        echo "  FIX: Use one of: $VALID_PHASE_STATUSES"
        # Can't increment ERRORS in subshell, use temp file
        echo "1" >> /tmp/lint-prd-errors.tmp
      fi
    done
  fi

  # Graph density check — disabled: too slow for lint (O(N*M) file scans).
  # Use /team-health Agent 2 + Agent 5 for cross-reference audits instead.
  # if [ -n "$STATUS" ] && [ "$STATUS" != "draft" ] && [ -n "$ID" ]; then
  #   STORY_COUNT=0
  #   CARD_COUNT=0
  #   if [ -d "docs/stories" ]; then
  #     STORY_COUNT=$(grep -rl "^prd:.*$ID" docs/stories/ 2>/dev/null | wc -l | tr -d ' ')
  #   fi
  #   if [ -d "docs/cards" ]; then
  #     CARD_COUNT=$(grep -rl "^business_requirement:.*$ID" docs/cards/ 2>/dev/null | wc -l | tr -d ' ')
  #   fi
  #   if [ "$STORY_COUNT" -eq 0 ] && [ "$CARD_COUNT" -eq 0 ]; then
  #     echo "WARN: $BASENAME — status='$STATUS' but 0 stories and 0 cards point to $ID (dead graph node)"
  #     echo "  FIX: Create stories (docs/stories/US-*.md with prd: $ID) or set status back to draft"
  #   elif [ "$STORY_COUNT" -eq 0 ]; then
  #     echo "WARN: $BASENAME — status='$STATUS' but 0 stories point to $ID ($CARD_COUNT cards exist)"
  #     echo "  FIX: Create stories (docs/stories/US-*.md with prd: $ID) to complete the knowledge graph"
  #   fi
  # fi

  # Check verification field types
  if echo "$FM" | grep -q "prdAccurate:"; then
    VAL=$(echo "$FM" | grep "prdAccurate:" | head -1 | sed 's/.*prdAccurate://' | tr -d '"' | tr -d "'" | tr -d ' ')
    case "$VAL" in
      accurate|partial|outdated|missing|unknown) ;;
      *) echo "ERROR: $BASENAME — verification.prdAccurate '$VAL' not valid"
         echo "  FIX: Use one of: accurate, partial, outdated, missing, unknown"
         ERRORS=$((ERRORS + 1)) ;;
    esac
  fi

  # Check testsExist is boolean (not string like "partial")
  if echo "$FM" | grep -q "testsExist:"; then
    VAL=$(echo "$FM" | grep "testsExist:" | head -1 | sed 's/.*testsExist://' | tr -d '"' | tr -d "'" | tr -d ' ')
    case "$VAL" in
      true|false) ;;
      *) echo "ERROR: $BASENAME — verification.testsExist '$VAL' must be boolean"
         echo "  FIX: Use true or false (not strings like 'partial')"
         ERRORS=$((ERRORS + 1)) ;;
    esac
  fi

  # Check lastVerified is quoted (unquoted YYYY-MM-DD gets parsed as Date object by gray-matter)
  if echo "$FM" | grep -q "lastVerified:"; then
    RAW=$(echo "$FM" | grep "lastVerified:" | head -1 | sed 's/.*lastVerified://')
    # Trim leading space, check if value is unquoted and looks like a date
    TRIMMED=$(echo "$RAW" | sed 's/^ *//')
    if echo "$TRIMMED" | grep -qE '^[0-9]{4}-[0-9]{2}'; then
      echo "ERROR: $BASENAME — verification.lastVerified is unquoted date"
      echo "  FIX: Wrap in quotes: lastVerified: \"$TRIMMED\" (YAML parses bare dates as Date objects)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# Count subshell errors
if [ -f /tmp/lint-prd-errors.tmp ]; then
  SUBSHELL_ERRORS=$(wc -l < /tmp/lint-prd-errors.tmp | tr -d ' ')
  ERRORS=$((ERRORS + SUBSHELL_ERRORS))
  rm -f /tmp/lint-prd-errors.tmp
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ PRD frontmatter: all valid"
else
  echo "❌ Found $ERRORS PRD frontmatter issue(s)"
fi
exit $ERRORS
