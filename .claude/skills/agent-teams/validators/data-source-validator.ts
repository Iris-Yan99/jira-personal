/**
 * @card CARD-AGENT-004
 * Data Source Validator - Prevents speculation-based agent team failures
 *
 * Core Learning: Agent teams amplify data quality (good or bad)
 * This validator PREVENTS agent teams from using speculation
 */

export interface DataSource {
  type: 'structured' | 'speculation' | 'hybrid'
  quality: 'primary' | 'secondary' | 'invalid'
  examples: string[]
}

export const DATA_SOURCE_HIERARCHY: DataSource[] = [
  {
    type: 'structured',
    quality: 'primary',
    examples: [
      'docs/cards/*.md with YAML frontmatter',
      'docs/prds/*.md with structured metadata',
      'docs/stories/*.md with relationships',
      'Collection JSON from /collection/{name}',
      'API responses with defined schemas'
    ]
  },
  {
    type: 'structured',
    quality: 'secondary',
    examples: [
      'Git history with @card references',
      'package.json dependencies',
      'TypeScript interfaces',
      'Test fixtures with expected outputs'
    ]
  },
  {
    type: 'speculation',
    quality: 'invalid',
    examples: [
      'Directory listings without context',
      'File counts and sizes',
      'Unstructured code exploration',
      'Assumptions about file purposes',
      'Guessing relationships from names'
    ]
  }
]

export function validateAgentTeamConfig(config: {
  agents: Array<{
    task: string
    dataSource: string
  }>
}): {
  valid: boolean
  errors: string[]
  recommendation?: string
} {
  const errors: string[] = []

  for (const agent of config.agents) {
    // Check if agent is using speculation
    const speculativeKeywords = [
      'explore files',
      'check directory',
      'count files',
      'browse code',
      'look for patterns',
      'analyze structure'
    ]

    const usesSpeculation = speculativeKeywords.some(keyword =>
      agent.task.toLowerCase().includes(keyword) ||
      agent.dataSource.toLowerCase().includes(keyword)
    )

    if (usesSpeculation) {
      errors.push(`Agent "${agent.task.slice(0, 50)}..." uses speculation-based exploration`)
    }

    // Check if agent has structured data source
    const structuredKeywords = [
      'PRD', 'Story', 'Card',
      'YAML', 'frontmatter',
      'collection schema',
      'API response',
      'test fixtures'
    ]

    const hasStructuredSource = structuredKeywords.some(keyword =>
      agent.dataSource.toUpperCase().includes(keyword.toUpperCase())
    )

    if (!hasStructuredSource && !usesSpeculation) {
      errors.push(`Agent "${agent.task.slice(0, 50)}..." lacks structured data source`)
    }
  }

  // Check for sequential dependencies
  const sequentialKeywords = ['then', 'after', 'wait for', 'depends on', 'use output from']
  const hasSequentialDeps = config.agents.some(agent =>
    sequentialKeywords.some(keyword =>
      agent.task.toLowerCase().includes(keyword)
    )
  )

  if (hasSequentialDeps) {
    errors.push('Agents have sequential dependencies - defeats parallel advantage')
  }

  return {
    valid: errors.length === 0,
    errors,
    recommendation: errors.length > 0
      ? 'Reconfigure agents to use PRD → Story → Card hierarchy as primary data source'
      : undefined
  }
}

/**
 * Example Usage:
 *
 * GOOD Configuration:
 * {
 *   agents: [
 *     { task: "Analyze PRD-VEC-1 completion", dataSource: "docs/prds/PRD-VEC-1.md" },
 *     { task: "Count done cards in VEC", dataSource: "docs/cards/CARD-VEC-*.md YAML status" },
 *     { task: "Check story relationships", dataSource: "docs/stories/{US,AS}-VEC-*.md frontmatter" }
 *   ]
 * }
 *
 * BAD Configuration (would be rejected):
 * {
 *   agents: [
 *     { task: "Explore VEC codebase structure", dataSource: "filesystem" },
 *     { task: "Count files in src directory", dataSource: "directory listing" },
 *     { task: "Analyze code patterns", dataSource: "browse files" }
 *   ]
 * }
 */

// Runtime enforcement in agent-teams skill
export function enforceDataSourceValidation(prompt: string): string {
  // This would be called BEFORE agent team execution
  // Automatically checks and warns about speculation

  const warning = `
⚠️ DATA SOURCE CHECK - Agent teams amplify data quality (good or bad)

PRIMARY sources (use these first):
- docs/cards/*.md, docs/prds/*.md, docs/stories/*.md
- Collection schemas from /collection/{name}
- API responses with defined schemas

INVALID sources (will amplify unreliability):
- Directory exploration without context
- File counting/sizing
- Speculation about code structure

Proceeding with speculation = 4x more likely to fail
`

  if (prompt.toLowerCase().includes('explore') ||
      prompt.toLowerCase().includes('browse') ||
      prompt.toLowerCase().includes('analyze files')) {
    return warning + '\n\n' + prompt
  }

  return prompt
}