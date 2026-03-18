#!/bin/bash
# PreToolUse hook for Bash commands
# Reads tool input JSON from stdin, checks for common issues
#
# Exit 0 = allow (stdout shown as feedback to Claude)
# Exit non-zero = block the tool call

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null)

# Check 1: Node/npm/npx commands without nvm
if echo "$COMMAND" | grep -qE '(^|\s)(node|npm|npx)\s' && ! echo "$COMMAND" | grep -q 'nvm use'; then
  echo "HOOK REMINDER: This command uses node/npm/npx. Ensure the correct Node version is available in this session."
fi

# Check 2: Migration-related commands without snapshot
if echo "$COMMAND" | grep -qE '(migrate|migration)' && ! echo "$COMMAND" | grep -q 'snapshot'; then
  echo "HOOK REMINDER: Migration detected. Have you taken a pre-migration snapshot? Use: npx directus schema snapshot ./snapshots/pre-<name>.yaml"
fi

# Check 3: After editing D11 loader files, remind to run lint checks
if echo "$COMMAND" | grep -qE 'git (add|commit)' && echo "$COMMAND" | grep -qE '(loader|assembler|directus-client)'; then
  echo "HOOK REMINDER: D11 loader files changed. Run lint checks first: bash .claude/hooks/lint-d11.sh && bash .claude/hooks/lint-loaders.sh"
fi

# Check 4: After editing PRD files, remind to run PRD lint
if echo "$COMMAND" | grep -qE 'git (add|commit)' && echo "$COMMAND" | grep -qE 'docs/prds/'; then
  echo "HOOK REMINDER: PRD files changed. Run PRD lint first: bash .claude/hooks/lint-prd.sh <changed-files>"
fi

# Check 5: After editing card files, remind to run card lint
if echo "$COMMAND" | grep -qE 'git (add|commit)' && echo "$COMMAND" | grep -qE 'docs/cards/'; then
  echo "HOOK REMINDER: Card files changed. Run card lint first: bash .claude/hooks/lint-card.sh <changed-files>"
fi

# Check 6: After editing story files, remind to run story lint
if echo "$COMMAND" | grep -qE 'git (add|commit)' && echo "$COMMAND" | grep -qE 'docs/stories/'; then
  echo "HOOK REMINDER: Story files changed. Run story lint first: bash .claude/hooks/lint-story.sh <changed-files>"
fi

# Check 7: Commit messages must reference a doc (PRD, US/AS story, or CARD)
# @story US-RIGID-004 — enforce traceability in every commit
if echo "$COMMAND" | grep -qE 'git commit'; then
  # Extract the commit message from -m flag or heredoc
  MSG=$(echo "$COMMAND" | grep -oP '(?<=-m\s")[^"]*|(?<=-m\s'"'"')[^'"'"']*' 2>/dev/null)
  if [ -z "$MSG" ]; then
    # Try heredoc pattern: cat <<'EOF' ... EOF
    MSG=$(echo "$COMMAND" | grep -oP "(?<=EOF\n).*(?=\nEOF)" 2>/dev/null)
  fi
  if [ -z "$MSG" ]; then
    MSG="$COMMAND"
  fi
  # Check if message starts with a doc reference (PRD-XXX, US-XXX, CARD-XXX)
  if ! echo "$MSG" | grep -qiE '(PRD-|US-|AS-|CARD-)'; then
    echo "HOOK REMINDER: Commit message must start with a document reference. Format: PRD-XXX: description, US-XXX: description, or CARD-XXX: description."
  fi
fi

exit 0
