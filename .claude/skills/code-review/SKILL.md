---
name: code-review
---

# Code Review Skill

## Purpose
Systematic code review process for PRs containing documentation (PRD/Story/Card) and code changes. Ensures quality, consistency, and catches issues before merge.

## Activation Triggers
- "code review"
- "review PR"
- "review this branch"
- "start code review"
- User mentions PR number: "review PR #106"

## Prerequisites
- User has checked out the branch to review
- Branch is based on a known base branch (e.g., `dev`, `init-ai`)
- PR exists (optional but recommended)

---

## Workflow

### Phase 0: Context Gathering

#### 0.1 PR Detection & Auto-Fetch

**If user provides PR number** (e.g., "review PR #106"):

1. **Extract PR number** from user input
2. **Auto-fetch PR metadata** using `gh` CLI:
   ```bash
   gh pr view <number> --json number,title,body,headRefName,baseRefName,author,state,additions,deletions,changedFiles,files
   ```

3. **Auto-populate context**:
   - ✅ PR number & title
   - ✅ Branch name (headRefName)
   - ✅ Base branch (baseRefName)
   - ✅ Author
   - ✅ PR description (body)
   - ✅ Status (open/merged/closed)
   - ✅ Files changed (count & list)
   - ✅ Line changes (additions/deletions)

4. **Checkout PR branch** (if not already):
   ```bash
   gh pr checkout <number>
   ```

5. **Skip to Phase 1** (branch analysis) with auto-populated context

**Example auto-fetch output:**
```
🔍 Auto-fetched PR #<number> from GitHub

✅ Title: [PR title]
✅ Branch: [source branch]
✅ Base: [target branch]
✅ Author: [username]
✅ Status: [OPEN/MERGED/CLOSED]
✅ Files: [X] files (+[additions], -[deletions])
✅ Description: [PR description body]

Proceeding with automated review...
```

---

#### 0.2 Manual Context Gathering

**If NO PR number provided**, ask these questions:

```
🔍 Code Review: Context Questions

1. **Branch & PR Info**
   - What is the branch name?
   - What is the base branch?
   - Is there a PR number?

2. **Change Scope**
   - What feature or bug fix does this PR implement?
   - Is there a related PRD, Story, or Card?
   - What are the acceptance criteria?

3. **Developer Intent**
   - What was the developer asked to do?
   - Were there specific implementation requirements?
   - Are there any known WIP areas?

4. **Testing Status**
   - Has the developer tested their changes?
   - Are there API tests or manual testing notes?
   - Does it build successfully?

5. **Documentation Expectations**
   - Should this PR have documentation updates?
   - Are there schema changes or new collections?
```

**If user doesn't know answers**, proceed with investigation but note gaps.

---

### Phase 1: Branch Analysis

#### 1.1 Check Git Status
```bash
# Get commit history
git log --oneline <base-branch>..HEAD

# Show file changes summary
git diff --stat <base-branch>..HEAD

# Check current branch
git status
```

#### 1.2 Identify Change Type

| Files Changed | Type | Review Focus |
|---------------|------|--------------|
| `docs/prds/*.md` | Documentation PR | PRD structure, data files |
| `docs/stories/*.md` (US-/AS-) + `docs/cards/*.md` | Story/Card PR | Linkage, templates |
| `lib/*.ts`, `app/*.tsx` | Code PR | Patterns, tests, docs |
| `scripts/*.ts` | Tooling PR | Usage docs, error handling |
| Mixed | Hybrid PR | All of the above |

---

### Phase 2: Documentation Review (if applicable)

#### 2.1 PRD Quality Checklist

**Frontmatter Compliance (v2.0 Template)**
- [ ] `id` - Unique, matches filename
- [ ] `title` - Clear, descriptive
- [ ] `description` - One-sentence summary
- [ ] `status` - Valid (draft/pending/in-progress/done/blocked/ready)
- [ ] `owner` - Assigned person/team
- [ ] `category` - Proper categorization
- [ ] `product_area` - Business domain
- [ ] `relatedCollections` - DB collections used
- [ ] `stories` - List of user stories
- [ ] `cards` - List of implementation cards
- [ ] `tags` - Searchable keywords
- [ ] `project` - Project identifier (ww/rk/lr)
- [ ] `verification` - Test status metadata

**Content Quality**
- [ ] Clear problem statement
- [ ] User stories linked
- [ ] Acceptance criteria defined
- [ ] Technical approach documented
- [ ] Edge cases considered

#### 2.2 Story Quality Checklist

**Frontmatter**
- [ ] `id` - Format: US-XXX or US-PROJECT-XXX or AS-PROJECT-XXX
- [ ] `title` - User-facing capability
- [ ] `prd` - Parent PRD ID
- [ ] `status` - Current state
- [ ] `priority` - Importance level
- [ ] `estimate` - Time estimate

**Content**
- [ ] "As a... I want... So that..." format
- [ ] Gherkin acceptance criteria
- [ ] Related cards linked
- [ ] Technical notes included

#### 2.3 Card Quality Checklist

**Frontmatter (v2.0)**
- [ ] `id` - Format: CARD-XXX or CARD-PROJECT-XXX-NNN
- [ ] `title` - Technical task description
- [ ] `story` - Parent story ID
- [ ] `business_requirement` - Parent PRD ID
- [ ] `status` - draft/pending/in-progress/done/blocked/ready
- [ ] `team` - Responsible team
- [ ] `depends_on` - Blocking cards
- [ ] `triggers` - Dependent cards

**Content**
- [ ] Purpose clearly stated
- [ ] Prerequisites listed
- [ ] Implementation steps detailed
- [ ] Testing approach documented
- [ ] Acceptance criteria clear

#### 2.4 Cross-Reference Verification

**PRD → Stories → Cards**
```bash
# Check if PRD lists all stories (filename = PRD-XXX.md, no slug)
grep "^  - US-" docs/prds/PRD-XXX.md
grep "^  - AS-" docs/prds/PRD-XXX.md   # Also check AS- prefixed stories

# Check if stories exist (filename = {ID}.md, no slug)
for story in $(grep -oE "(US|AS)-[A-Z0-9-]+" docs/prds/PRD-XXX.md); do
  ls docs/stories/$story.md 2>/dev/null || echo "Missing: $story"
done

# Verify cards referenced (filename = CARD-XXX.md, no slug)
grep "^  - CARD-" docs/prds/PRD-XXX.md
```

**Story → Card Linkage**
```bash
# In each story file (cards are CARD-XXX.md, no slug suffix)
grep "^story: " docs/cards/CARD-*.md
```

---

### Phase 3: Data File Integrity

#### 3.1 Check `lib/prd-data.ts`

**For new PRDs**, verify entry exists:
```typescript
{
  id: 'new-prd-id',
  title: 'PRD Title',
  description: 'Description',
  keyLearning: 'Key insight',
  pattern: 'discovery-driven' | 'requirements-first',
  status: 'draft',
  filePath: 'docs/prds/PRD-XXX.md',  // All PRDs have PRD- prefix
  relatedCollections: ['collection1', 'collection2'],
  tags: ['tag1', 'tag2'],
  project: 'ww' | 'rk' | 'lr',
  verification: { ... },
}
```

**Validation**:
- [ ] `id` matches PRD frontmatter
- [ ] `filePath` points to correct file
- [ ] `relatedCollections` matches PRD frontmatter
- [ ] `tags` are relevant
- [ ] `project` is correct

#### 3.2 Check `lib/progress-data.ts`

**For new phases**, verify entry:
```typescript
{
  name: 'WW Phase X: Feature Name',
  status: 'current' | 'planned' | 'completed',
  project: 'ww',
  items: [
    { task: 'Description', completed: true/false, link: '/prd/...' },
  ]
}
```

**Validation**:
- [ ] Phase name follows naming convention
- [ ] Tasks accurately reflect PRD content
- [ ] Links are correct
- [ ] Completion status matches reality

---

### Phase 4: Claim Verification

**Critical**: Verify any numerical claims in documentation.

#### Example: Relationship Counts

If PRD claims "44 M2O relations":
```bash
# Count M2O in PRD (filename = PRD-XXX.md)
grep -E "^\| .* \| .* FK \| m2o \|" docs/prds/PRD-XXX.md | wc -l

# Count in Card (filename = CARD-XXX.md, no slug suffix)
grep -E "^- \`.+\` ->" docs/cards/CARD-XXX.md | wc -l
```

If PRD claims "31 O2M relations":
```bash
# Count O2M sections (filename = CARD-XXX.md, no slug suffix)
grep -E "^\*\*From .+ \([0-9]+ O2M\)" docs/cards/CARD-XXX.md

# Sum up the counts
# Example from PR #106: organization(9) + product_category(2) + ... = 30 ❌
```

**When counts don't match:**
1. Document the discrepancy
2. Identify what's missing (e.g., UOM O2M relations)
3. Provide actionable recommendations

---

### Phase 5: Code Quality (if code changes exist)

#### 5.1 Pattern Compliance

**Data Ownership Model (Foundation Check)**

The most important architectural check. Reference: [Data Ownership Guide](../../docs/reference/MULTI-ORG-SWITCHING.md)

For EACH collection touched by the PR, verify the correct model is used:

| Model | Check | Red Flag |
|-------|-------|----------|
| **A: Org-scoped** | Permission uses AND filter (`orq` + `$CURRENT_USER.active_orq`) | Hardcoded `orq` filter without `active_orq` — multi-org users see wrong data |
| **B: User-scoped** | Permission uses `$CURRENT_USER` filter, no `orq` | Using `orq` on personal data — wallet transactions don't belong to orgs |
| **C: Hybrid** | Both `orq` (AND filter) and `user_created` for "My Items" | Missing one of the two — either no org scoping or no personal view |
| **D: System** | `permissions: {}` or admin-only, no ownership filter | Adding `orq` filter to shared config — payment gateways aren't org-specific |

```bash
# Quick check: does this file add orq filtering?
grep -n "orq" <changed-files>

# If yes: is it AND-filtered (Model A) or hardcoded-only (legacy)?
grep -n "_and.*orq.*active_orq" <changed-files>

# If no orq: is it user-scoped ($CURRENT_USER) or system ({})?
grep -n "CURRENT_USER\|user_created" <changed-files>
```

**Key questions for the reviewer:**
- [ ] Does each collection use the right ownership model (A/B/C/D)?
- [ ] Org-scoped collections use AND filter (not just hardcoded `orq`)?
- [ ] User-scoped collections don't reference `orq`?
- [ ] CREATE permissions have `validation` field for org-scoped data?
- [ ] `fields: ["*"]` is set explicitly (D11: omitting = no field access)?

**Organization Management**
- [ ] Uses `useOrgStore.getState().getSelectedOrq()` for org ID
- [ ] API calls use `getApiOrqUrl()`
- [ ] No manual localStorage parsing for org data

**API Integration**
- [ ] Loading guards prevent duplicate calls
- [ ] useEffect dependencies are primitives (not functions)
- [ ] Error handling for network failures
- [ ] Proper field expansion patterns (check existing similar features)

**Authentication**
- [ ] Uses `getAccessToken()` or `authenticatedFetch` for auth
- [ ] Handles token expiration (401 → logout via authenticatedFetch)
- [ ] Organization-aware endpoints

**Common Pitfalls** (from CLAUDE.md)
- [ ] No "No data found" issues due to API response structure mismatch
- [ ] Field expansion matches existing patterns (`fields=*` vs nested objects)
- [ ] Loading flags prevent duplicate simultaneous calls

#### 5.2 Build Test
```bash
yarn build
```

**Check for**:
- [ ] TypeScript errors
- [ ] Missing imports
- [ ] Type mismatches
- [ ] Unused variables (if strict mode)

---

### Phase 6: Generate Review Report

**Format**: Structured scorecard with actionable findings

```markdown
## 📋 Code Review Report: PR #XXX - [Title]

### ✅ STRENGTHS
1. **Documentation Structure**
   - [Specific positive findings]
2. **Data File Integrity**
   - [What was done well]
3. **Code Quality**
   - [Positive patterns observed]

---

### ❌ CRITICAL ISSUES
**1. [Issue Title]**

| **Claimed** | **Actual** | **Impact** |
|-------------|------------|------------|
| [Expected] | [Found] | [Severity] |

**Evidence**: [Show proof]
**Root Cause**: [Analysis]
**Recommendation**: [Actionable fix]

---

### ⚠️ MODERATE FINDINGS
[Medium-priority issues]

---

### 💡 MINOR SUGGESTIONS
[Nice-to-haves, style improvements]

---

### 📊 Compliance Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Data Ownership Model** | X% | Correct model per collection (A/B/C/D)? |
| **Documentation Structure** | X% | ... |
| **Data File Accuracy** | X% | ... |
| **Cross-References** | X% | ... |
| **Code Patterns** | X% | ... |
| **Build Success** | X% | ... |

**Overall Score**: X% (Excellent/Good/Needs Work)
```

---

### Phase 7: Post Review Feedback to Directus

**Automatically post structured review comments to affected cards using the Directus comments system.**

#### When to Post Comments

Post review comments to Directus when:
- ✅ Critical or moderate issues found in specific cards
- ✅ Cards need updates based on review findings
- ✅ Developer needs actionable feedback on specific implementation
- ❌ Skip if review is only informational or no card-specific issues

#### Comment Structure

For each affected card, post a structured comment:

```markdown
🔍 **Code Review Feedback** (PR #{number})

**Issue**: {Brief description}

**Evidence**: {Specific finding}

**Action Required**: {What needs to be fixed}

**Priority**: {Critical | Moderate | Low}

---
Review Score: {X%}
Reviewer: Claude Code Review
```

#### Implementation Pattern

**Step 1: Identify Affected Cards**

From the review findings, extract card IDs that have issues:
```bash
# Example: For PR #106, affected cards are:
# - CARD-ORDER-CORE-V2-009 (O2M count issue)
# - PRD-ORDER-CORE-V2-DIRECTUS (O2M count in frontmatter)
```

**Step 2: Format Comments for Each Card**

Create targeted, actionable comments:

```typescript
// Example for CARD-ORDER-CORE-V2-009:
const comment = `🔍 **Code Review Feedback** (PR #106)

**Issue**: O2M relation count discrepancy

**Evidence**:
- Card documents 30 O2M relations (organization:9, product_category:2, product:3, company:6, discount:2, promotion:2, order:1, order_line:2, source_record:2, ww_order_key:1)
- PR claims 31 O2M relations
- UOM collection has 5 M2O references pointing to it, but NO O2M reverse relations documented

**Action Required**:
Add UOM O2M section to card:

\`\`\`markdown
**From uom (1 O2M)**
- \`uom.product_prices\` -> \`product_price.uom_id\` (read-only)
\`\`\`

**Priority**: Critical (blocking merge)

---
Review Score: 94%
Reviewer: Claude Code Review`
```

**Step 3: Post Comments Using write-comment Script**

**IMPORTANT: Always use `@file` mode for multi-line comments.**
On Windows, multi-line strings passed as bash arguments are truncated to the first line.
The `@file` pattern writes the comment to a temp file first, ensuring all lines are preserved.

```bash
# Step 3a: Write comment to temp file
# Use the Write tool to create a temp file with the full comment text:
#   File: /tmp/review-comment-CARD-ORDER-CORE-V2-009.txt
#   Content: (full multi-line comment)

# Step 3b: Post using @file mode
npx tsx scripts/sync/write-comment.ts \
  "CARD-ORDER-CORE-V2-009" \
  @/tmp/review-comment-CARD-ORDER-CORE-V2-009.txt

# Step 3c: Clean up temp file
rm -f /tmp/review-comment-CARD-ORDER-CORE-V2-009.txt

# Output:
# ✅ Comment created successfully!
# 📱 View in browser: https://synque.hk/docs/cards/CARD-ORDER-CORE-V2-009
```

**Never use inline multi-line arguments:**
```bash
# ❌ WRONG - truncated to first line on Windows:
npx tsx scripts/sync/write-comment.ts "CARD-XXX" "Line 1
Line 2
Line 3"

# ✅ CORRECT - use @file mode:
npx tsx scripts/sync/write-comment.ts "CARD-XXX" @comment.txt
```

**Step 4: Notify User**

After posting comments:
```
✅ Review feedback posted to Directus:
   - CARD-ORDER-CORE-V2-009: O2M count issue
   - PRD-ORDER-CORE-V2-DIRECTUS: Frontmatter update needed

📱 View comments:
   https://synque.hk/docs/cards/CARD-ORDER-CORE-V2-009
   https://synque.hk/docs/prds/PRD-ORDER-CORE-V2-DIRECTUS
```

#### Comment Categories

**Critical Issues** (🔴):
- Blocking merge
- Numerical discrepancies
- Data file integrity issues
- Broken cross-references

**Moderate Issues** (🟡):
- Template non-compliance
- Missing optional sections
- Inconsistent formatting

**Suggestions** (🟢):
- Nice-to-have improvements
- Style recommendations

#### Example Workflow

For PR #106:

1. **Review finds**: O2M count off by 1
2. **Identify cards**: CARD-ORDER-CORE-V2-009, PRD-ORDER-CORE-V2-DIRECTUS
3. **Post comments** (using @file mode for multi-line):
   ```bash
   # Write comment to temp file, then post via @file
   npx tsx scripts/sync/write-comment.ts "CARD-ORDER-CORE-V2-009" \
     @/tmp/review-card-009.txt

   npx tsx scripts/sync/write-comment.ts "PRD-ORDER-CORE-V2-DIRECTUS" \
     @/tmp/review-prd.txt

   # Clean up
   rm -f /tmp/review-card-009.txt /tmp/review-prd.txt
   ```

4. **Developer sees** comments in Directus UI → fixes → marks resolved

#### Prerequisites

- `scripts/sync/write-comment.ts` exists ✅
- Environment variables set:
  - `DIRECTUS_PRD_ENDPOINT`
  - `DIRECTUS_PRD_TOKEN`
- Cards/PRDs already synced to Directus

---

### Phase 8: Skill Integration

**Use existing skills when applicable:**

| Scenario | Skill to Use | When |
|----------|--------------|------|
| PRD has API endpoints | `/api-testing` | Verify test coverage |
| New collections added | Use Collection Viewer | Validate schema |
| Stories/Cards created | `/ai-workflow` | Check template compliance |
| Post review comments | `write-comment.ts` | After Phase 7 (automatic) |

---

## Review Checklist Template

Copy this for each review:

```markdown
### PR #XXX Review Checklist

**Phase 0: Context**
- [ ] Branch: ___________
- [ ] Base: ___________
- [ ] Scope: ___________

**Phase 1: Analysis**
- [ ] Git log checked
- [ ] File changes reviewed
- [ ] Change type identified

**Phase 2: Documentation (if applicable)**
- [ ] PRD frontmatter valid
- [ ] Stories follow template
- [ ] Cards follow v2.0 template
- [ ] Cross-references verified

**Phase 3: Data Files**
- [ ] prd-data.ts updated
- [ ] progress-data.ts updated
- [ ] IDs match frontmatter

**Phase 4: Claim Verification**
- [ ] Numerical claims verified
- [ ] Relationship counts accurate
- [ ] Collection lists complete

**Phase 5: Code Quality (if applicable)**
- [ ] Pattern compliance checked
- [ ] Build successful
- [ ] No common pitfalls

**Phase 6: Report**
- [ ] Strengths documented
- [ ] Issues categorized
- [ ] Recommendations clear
- [ ] Scorecard generated
```

---

## Typical Review Process

### General Workflow (With PR Auto-Fetch + Directus Integration)
1. **Auto-fetch PR metadata** using `gh pr view <number> --json ...`
   - Extract branch, base, author, files changed
   - Get PR description and context
2. **Checkout PR branch**: `gh pr checkout <number>`
3. **Analyze changes**: `git diff --stat <base>..HEAD`
4. **Verify data files**: Check prd-data.ts, progress-data.ts updates
5. **Check documentation quality**: PRD/Story/Card frontmatter and structure
6. **Verify numerical claims**: Count M2O/O2M relations, collections, fields
7. **Test code patterns**: Org store usage, API patterns, loading guards
8. **Generate report**: Structured scorecard with findings
9. **Post feedback to Directus**: Automatically comment on affected cards

**Key Principles**:
- Always verify numerical claims by counting actual documented items, not just trusting frontmatter
- Post actionable, structured feedback to Directus for developer visibility

---

## GitHub CLI Commands Reference

### PR Metadata Fetching

**Get comprehensive PR info:**
```bash
gh pr view <number> --json number,title,body,headRefName,baseRefName,author,state,additions,deletions,changedFiles,files
```

**Get specific fields:**
```bash
# Just title and status
gh pr view <number> --json title,state

# Get file list
gh pr view <number> --json files --jq '.files[].path'

# Get commit count
gh pr view <number> --json commits --jq '.commits | length'

# Get labels
gh pr view <number> --json labels --jq '.labels[].name'
```

### PR Operations

**Checkout PR branch:**
```bash
gh pr checkout <number>
```

**Get PR diff:**
```bash
gh pr diff <number>

# Show only file names
gh pr diff <number> --name-only

# Show stats
gh pr diff <number> --stat
```

**Get PR checks status:**
```bash
gh pr checks <number>
```

### JSON Fields Available

| Field | Type | Description |
|-------|------|-------------|
| `number` | int | PR number |
| `title` | string | PR title |
| `body` | string | PR description |
| `headRefName` | string | Source branch name |
| `baseRefName` | string | Target branch name |
| `author.login` | string | Author username |
| `state` | string | OPEN, MERGED, CLOSED |
| `additions` | int | Lines added |
| `deletions` | int | Lines deleted |
| `changedFiles` | int | Number of files changed |
| `files` | array | List of changed files with paths |
| `commits` | array | List of commits |
| `labels` | array | PR labels |
| `reviewers` | array | Requested reviewers |

### Example Usage in Review

```bash
# Get PR info and store as JSON
PR_INFO=$(gh pr view <number> --json number,title,headRefName,baseRefName,changedFiles,additions,deletions)

# Parse and use
TITLE=$(echo $PR_INFO | jq -r '.title')
BRANCH=$(echo $PR_INFO | jq -r '.headRefName')
BASE=$(echo $PR_INFO | jq -r '.baseRefName')

# Checkout and start review
gh pr checkout <number>
git diff --stat $BASE..HEAD
```

---

## Anti-Patterns to Avoid

❌ **Don't**:
- Assume numerical claims are correct without verification
- Skip build testing for "documentation-only" PRs
- Ignore data file updates
- Review in isolation (check related skills/standards)
- Provide vague feedback ("needs improvement")

✅ **Do**:
- Ask context questions upfront
- Verify every claim with grep/counting
- Check cross-references systematically
- Provide specific, actionable recommendations
- Generate structured scorecards

---

## Output Format

**Always provide**:
1. Structured report (Strengths / Issues / Scorecard)
2. Specific evidence for each finding
3. Actionable recommendations with code examples where applicable
4. Overall compliance score with rationale

**Automatic** (Phase 7):
- Post structured review feedback to Directus comments (uses `write-comment.ts`)
- Notify developer of issues in their Directus workflow

**Optional**:
- Create GitHub PR review comments (if gh CLI available)
- Generate visual progress report (if /visualizer applicable)

---

## Skill Metadata

**Version**: 1.2
**Created**: 2026-02-15
**Updated**: 2026-02-15
**Related Skills**: pm-comments (write-comment.ts), api-testing, ai-workflow, visualizer
**Maintainer**: Code review team

### Changelog
- **v1.2** (2026-02-15): Added Phase 7 - Auto-post review feedback to Directus comments
- **v1.1** (2026-02-15): Added PR auto-fetch capability using `gh` CLI
- **v1.0** (2026-02-15): Initial release with 7-phase review workflow
