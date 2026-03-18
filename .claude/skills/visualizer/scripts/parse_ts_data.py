#!/usr/bin/env python3
"""Parse TypeScript data files to extract PRD and progress information."""

import re
import json
from pathlib import Path
from typing import Dict, List, Any

def parse_prd_data(file_path: Path) -> Dict[str, Any]:
    """Parse lib/prd-data.ts to extract PRD metadata."""
    content = file_path.read_text()

    prds = []

    # Find PRD_LIST array
    prd_list_match = re.search(r'export const PRD_LIST: PRDMeta\[\] = \[(.*?)\];', content, re.DOTALL)
    if not prd_list_match:
        return {"prds": []}

    prd_array = prd_list_match.group(1)

    # Extract individual PRD objects
    prd_objects = re.finditer(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', prd_array)

    for match in prd_objects:
        prd_text = match.group(1)
        prd = {}

        # Extract fields
        id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", prd_text)
        title_match = re.search(r"title:\s*['\"]([^'\"]+)['\"]", prd_text)
        desc_match = re.search(r"description:\s*['\"]([^'\"]+)['\"]", prd_text)
        status_match = re.search(r"status:\s*['\"]([^'\"]+)['\"]", prd_text)
        project_match = re.search(r"project:\s*['\"]([^'\"]+)['\"]", prd_text)
        pattern_match = re.search(r"pattern:\s*['\"]([^'\"]+)['\"]", prd_text)

        # Extract arrays
        collections_match = re.search(r"relatedCollections:\s*\[([^\]]*)\]", prd_text)
        tags_match = re.search(r"tags:\s*\[([^\]]*)\]", prd_text)

        if id_match and title_match:
            prd['id'] = id_match.group(1)
            prd['title'] = title_match.group(1)
            prd['description'] = desc_match.group(1) if desc_match else ''
            prd['status'] = status_match.group(1) if status_match else 'draft'
            prd['project'] = project_match.group(1) if project_match else 'ww'
            prd['pattern'] = pattern_match.group(1) if pattern_match else 'discovery-driven'

            if collections_match:
                collections_str = collections_match.group(1)
                prd['relatedCollections'] = [
                    c.strip().strip("'\"")
                    for c in collections_str.split(',')
                    if c.strip() and c.strip() != ''
                ]
            else:
                prd['relatedCollections'] = []

            if tags_match:
                tags_str = tags_match.group(1)
                prd['tags'] = [
                    t.strip().strip("'\"")
                    for t in tags_str.split(',')
                    if t.strip() and t.strip() != ''
                ]
            else:
                prd['tags'] = []

            prds.append(prd)

    return {"prds": prds}

def parse_progress_data(file_path: Path) -> Dict[str, Any]:
    """Parse lib/progress-data.ts to extract project and phase information."""
    content = file_path.read_text()

    result = {
        "projects": [],
        "phases": []
    }

    # Parse PROJECT_PROGRESS array
    project_match = re.search(r'export const PROJECT_PROGRESS: ProjectProgress\[\] = \[(.*?)\];', content, re.DOTALL)
    if project_match:
        projects_text = project_match.group(1)
        project_objects = re.finditer(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', projects_text)

        for match in project_objects:
            proj_text = match.group(1)

            id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", proj_text)
            name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", proj_text)
            desc_match = re.search(r"description:\s*['\"]([^'\"]+)['\"]", proj_text)
            status_match = re.search(r"status:\s*['\"]([^'\"]+)['\"]", proj_text)
            updated_match = re.search(r"lastUpdated:\s*['\"]([^'\"]+)['\"]", proj_text)

            # Extract features object
            features_match = re.search(r"features:\s*\{([^}]*)\}", proj_text)

            if id_match and name_match:
                project = {
                    'id': id_match.group(1),
                    'name': name_match.group(1),
                    'description': desc_match.group(1) if desc_match else '',
                    'status': status_match.group(1) if status_match else 'active',
                    'lastUpdated': updated_match.group(1) if updated_match else '',
                    'features': {'undocumented': 0, 'documented': 0, 'verified': 0}
                }

                if features_match:
                    feat_text = features_match.group(1)
                    undoc_match = re.search(r"undocumented:\s*(\d+)", feat_text)
                    doc_match = re.search(r"documented:\s*(\d+)", feat_text)
                    ver_match = re.search(r"verified:\s*(\d+)", feat_text)

                    if undoc_match:
                        project['features']['undocumented'] = int(undoc_match.group(1))
                    if doc_match:
                        project['features']['documented'] = int(doc_match.group(1))
                    if ver_match:
                        project['features']['verified'] = int(ver_match.group(1))

                result['projects'].append(project)

    # Parse EVOLUTION_PHASES array
    phases_match = re.search(r'export const EVOLUTION_PHASES: EvolutionPhase\[\] = \[(.*?)\];', content, re.DOTALL)
    if phases_match:
        phases_text = phases_match.group(1)

        # Find phase objects
        phase_pattern = r'\{[^{}]*name:\s*[\'"]([^\'"]+)[\'"][^{}]*status:\s*[\'"]([^\'"]+)[\'"][^{}]*project:\s*[\'"]([^\'"]+)[\'"][^{}]*items:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\][^{}]*\}'

        for match in re.finditer(phase_pattern, phases_text):
            name = match.group(1)
            status = match.group(2)
            project = match.group(3)
            items_text = match.group(4)

            # Parse items
            tasks = []
            task_pattern = r'\{\s*task:\s*[\'"]([^\'"]+)[\'"][^}]*completed:\s*(true|false)'
            for task_match in re.finditer(task_pattern, items_text):
                tasks.append({
                    'name': task_match.group(1),
                    'completed': task_match.group(2) == 'true'
                })

            result['phases'].append({
                'name': name,
                'status': status,
                'project': project,
                'tasks': tasks,
                'total': len(tasks),
                'completed': sum(1 for t in tasks if t['completed'])
            })

    return result

def load_real_data():
    """Load and parse all data files."""
    base_path = Path(__file__).parent.parent.parent.parent.parent  # Go to repo root

    prd_file = base_path / 'lib' / 'prd-data.ts'
    progress_file = base_path / 'lib' / 'progress-data.ts'

    data = {
        'prds': [],
        'projects': [],
        'phases': []
    }

    if prd_file.exists():
        prd_data = parse_prd_data(prd_file)
        data['prds'] = prd_data.get('prds', [])

    if progress_file.exists():
        progress_data = parse_progress_data(progress_file)
        data['projects'] = progress_data.get('projects', [])
        data['phases'] = progress_data.get('phases', [])

    return data

if __name__ == '__main__':
    data = load_real_data()
    print(json.dumps(data, indent=2))
