#!/usr/bin/env python3
"""Parse PRD markdown files with YAML frontmatter - the CORRECT approach."""

import re
import json
from pathlib import Path
from typing import Dict, List, Any

def parse_yaml_simple(yaml_text: str) -> Dict[str, Any]:
    """Simple YAML parser for frontmatter (handles basic key-value pairs)."""
    data = {}
    current_key = None
    current_list = []
    in_list = False

    for line in yaml_text.split('\n'):
        line = line.rstrip()

        # Skip empty lines and comments
        if not line or line.startswith('#'):
            continue

        # List item
        if line.strip().startswith('- '):
            in_list = True
            item = line.strip()[2:].strip().strip('"').strip("'")
            current_list.append(item)
            continue

        # Key-value pair
        if ':' in line and not line.startswith(' '):
            # Save previous list
            if in_list and current_key:
                data[current_key] = current_list
                current_list = []
                in_list = False

            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if value.lower() == 'true':
                value = True
            elif value.lower() == 'false':
                value = False
            elif value.lower() == 'null':
                value = None
            elif value.isdigit():
                value = int(value)
            elif value == '':
                # This might be start of a list
                current_key = key
                continue

            data[key] = value
            current_key = key

    # Save final list
    if in_list and current_key:
        data[current_key] = current_list

    return data

def parse_frontmatter(content: str) -> Dict[str, Any]:
    """Extract YAML frontmatter from markdown file."""
    # Match YAML frontmatter between --- markers
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}

    yaml_text = match.group(1)
    return parse_yaml_simple(yaml_text)

def load_card_from_markdown(file_path: Path) -> Dict[str, Any]:
    """Load a single Card from markdown file with frontmatter OR markdown status."""
    try:
        content = file_path.read_text(encoding='utf-8')
        frontmatter = parse_frontmatter(content)

        # If no status in frontmatter, try to extract from markdown content
        if not frontmatter.get('status'):
            # Pattern: **Status**: ✅ Complete OR **Status**: 🚧 In Progress
            status_match = re.search(r'\*\*Status\*\*:\s*(.+)', content)
            if status_match:
                status_text = status_match.group(1).strip()
                # Extract text after emoji if present
                status_clean = re.sub(r'^[✅🚧❌⏸️📋]\s*', '', status_text)
                frontmatter['status'] = status_clean

        frontmatter['filePath'] = str(file_path)
        frontmatter['fileName'] = file_path.name
        return frontmatter
    except Exception as e:
        return {'id': file_path.stem, 'status': 'unknown', 'error': str(e)}

def calculate_progress_from_cards(prd: Dict[str, Any], cards_dir: Path) -> Dict[str, Any]:
    """Calculate PRD progress from related Card statuses."""
    card_ids = prd.get('cards', [])

    if not card_ids or not isinstance(card_ids, list):
        return {
            'total_cards': 0,
            'completed': 0,
            'in_progress': 0,
            'pending': 0,
            'progress_pct': 0
        }

    # Load each card
    cards_data = []
    for card_id in card_ids:
        # Try exact match first (e.g., CARD-OAUTH-001-google-oauth-testing.md)
        exact_file = cards_dir / f"{card_id}.md"

        if exact_file.exists():
            card_data = load_card_from_markdown(exact_file)
            cards_data.append(card_data)
        else:
            # Fallback to glob pattern for shorter IDs (e.g., CARD-001-*.md)
            pattern = f"{card_id}-*.md"
            matching_files = list(cards_dir.glob(pattern))

            if matching_files:
                card_data = load_card_from_markdown(matching_files[0])
                cards_data.append(card_data)

    # Count statuses (normalize status values)
    total = len(cards_data)
    def is_completed(status):
        if not status:
            return False
        status_lower = str(status).lower()
        return status_lower in ['done', 'completed', 'complete', '✅ complete']

    def is_in_progress(status):
        if not status:
            return False
        status_lower = str(status).lower()
        return status_lower in ['in_progress', 'in progress', 'active', 'wip', '🚧 in progress']

    completed = sum(1 for c in cards_data if is_completed(c.get('status')))
    in_progress = sum(1 for c in cards_data if is_in_progress(c.get('status')))
    pending = total - completed - in_progress

    return {
        'total_cards': total,
        'completed': completed,
        'in_progress': in_progress,
        'pending': pending,
        'progress_pct': (completed / total * 100) if total > 0 else 0,
        'cards': cards_data
    }

def load_prd_from_markdown(file_path: Path) -> Dict[str, Any]:
    """Load a single PRD from markdown file with frontmatter and calculate progress."""
    content = file_path.read_text(encoding='utf-8')
    frontmatter = parse_frontmatter(content)

    # Add file path
    frontmatter['filePath'] = str(file_path)
    frontmatter['fileName'] = file_path.name

    # Calculate progress from Cards
    base_path = file_path.parent.parent  # Go up to repo root
    cards_dir = base_path / 'cards'
    if cards_dir.exists():
        frontmatter['progress'] = calculate_progress_from_cards(frontmatter, cards_dir)

    return frontmatter

def load_all_prds() -> List[Dict[str, Any]]:
    """Load all PRDs from docs/prds/ directory."""
    base_path = Path(__file__).parent.parent.parent.parent.parent  # Go to repo root
    prds_dir = base_path / 'docs' / 'prds'

    if not prds_dir.exists():
        print(f"⚠️  PRDs directory not found: {prds_dir}")
        return []

    prds = []
    for file_path in sorted(prds_dir.glob('PRD-*.md')):
        try:
            prd = load_prd_from_markdown(file_path)
            if prd.get('id'):  # Only include if it has an ID
                prds.append(prd)
        except Exception as e:
            print(f"⚠️  Error parsing {file_path.name}: {e}")

    return prds

def load_progress_from_ts() -> Dict[str, Any]:
    """Load project progress from lib/progress-data.ts (fallback for now)."""
    # For now, return mock data
    # TODO: Parse progress-data.ts or create progress markdown files
    return {
        "projects": [
            {
                "id": "ww",
                "name": "WantWant (WW)",
                "description": "Sales order management system",
                "status": "active",
                "features": {"undocumented": 6, "documented": 0, "verified": 0},
                "lastUpdated": "2026-01-12",
            },
            {
                "id": "rk",
                "name": "RewardKoi (RK)",
                "description": "B2B2C e-voucher platform",
                "status": "handover",
                "features": {"undocumented": 10, "documented": 0, "verified": 0},
                "lastUpdated": "2026-01-12",
            },
            {
                "id": "lr",
                "name": "License Rental (LR)",
                "description": "License & car rental SaaS",
                "status": "discovery",
                "features": {"undocumented": 0, "documented": 1, "verified": 0},
                "lastUpdated": "2026-02-07",
            }
        ],
        "phases": [
            {
                "name": "WW Phase 1: Foundation",
                "project": "ww",
                "status": "completed",
                "tasks": [],
                "total": 8,
                "completed": 8
            },
            {
                "name": "WW Phase 2: Consolidation",
                "project": "ww",
                "status": "current",
                "tasks": [],
                "total": 12,
                "completed": 10
            },
            {
                "name": "LR Phase 1: Discovery",
                "project": "lr",
                "status": "current",
                "tasks": [],
                "total": 8,
                "completed": 2
            },
        ]
    }

def load_real_data():
    """Load all data from markdown files and TypeScript."""
    prds = load_all_prds()
    progress = load_progress_from_ts()

    return {
        'prds': prds,
        'projects': progress.get('projects', []),
        'phases': progress.get('phases', [])
    }

if __name__ == '__main__':
    import json
    data = load_real_data()
    print(json.dumps({
        'prds_count': len(data['prds']),
        'projects_count': len(data['projects']),
        'phases_count': len(data['phases']),
        'sample_prd': data['prds'][0] if data['prds'] else None
    }, indent=2))
