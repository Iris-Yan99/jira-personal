#!/usr/bin/env python3
"""
Generate Card Progress Heatmap - shows PRD completion based on Card status.

DATA SOURCE:
  Primary: docs/prds/*.md (cards field in YAML frontmatter)
  Secondary: docs/cards/*.md (status field - YAML or markdown)
  Parser: parse_prd_markdown.load_all_prds()

CURRENT STATUS: ✅ **FULLY DATA-DRIVEN** (Zero Hardcoding)

WHAT IT READS:
  - PRD fields: id, title, cards (list of Card IDs)
  - Card fields: status (Done/Completed/In Progress/Pending)
  - Calculated: progress (total_cards, completed, in_progress, pending, progress_pct)

HOW IT WORKS:
  1. Reads all PRDs from docs/prds/*.md
  2. For each PRD, reads Card files from docs/cards/
  3. Calculates progress % from Card status
  4. Displays as heatmap (Green=Complete, Orange=In Progress, Gray=Pending)

ZERO HARDCODING: ✅ YES
"""

import json
import webbrowser
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from parse_prd_markdown import load_all_prds

def load_card_progress():
    """Load PRDs with Card-driven progress data."""
    prds = load_all_prds()

    # Filter to only PRDs with Cards
    prds_with_cards = []
    for prd in prds:
        if 'progress' in prd and prd['progress'].get('total_cards', 0) > 0:
            prds_with_cards.append(prd)

    return prds_with_cards

def generate_html(prds, output: Path):
    """Generate interactive Card progress heatmap."""
    prds_json = json.dumps(prds)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Progress Heatmap</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: white;
            padding: 20px;
            min-height: 100vh;
        }}
        .container {{
            max-width: 1600px;
            margin: 0 auto;
        }}
        h1 {{
            text-align: center;
            margin-bottom: 10px;
            font-size: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .subtitle {{
            text-align: center;
            color: #94a3b8;
            margin-bottom: 30px;
            font-size: 14px;
        }}
        .legend {{
            background: rgba(30, 41, 59, 0.8);
            padding: 16px 24px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 24px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }}
        .legend-box {{
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }}
        .heatmap {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
        }}
        .cell {{
            background: rgba(30, 41, 59, 0.5);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
        }}
        .cell::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.1;
            border-radius: 10px;
        }}
        .cell.excellent {{ border-color: #10b981; }}
        .cell.excellent::before {{ background: #10b981; opacity: 0.2; }}
        .cell.good {{ border-color: #3b82f6; }}
        .cell.good::before {{ background: #3b82f6; opacity: 0.2; }}
        .cell.warning {{ border-color: #f59e0b; }}
        .cell.warning::before {{ background: #f59e0b; opacity: 0.2; }}
        .cell.critical {{ border-color: #ef4444; }}
        .cell.critical::before {{ background: #ef4444; opacity: 0.2; }}
        .cell.pending {{ border-color: #6b7280; }}
        .cell.pending::before {{ background: #6b7280; opacity: 0.1; }}
        .cell:hover {{
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }}
        .prd-id {{
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
            position: relative;
            z-index: 1;
        }}
        .prd-title {{
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
            line-height: 1.3;
            min-height: 40px;
        }}
        .progress-score {{
            font-size: 42px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }}
        .progress-label {{
            font-size: 11px;
            text-align: center;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
            margin-bottom: 16px;
        }}
        .card-stats {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            position: relative;
            z-index: 1;
        }}
        .stat-box {{
            text-align: center;
        }}
        .stat-value {{
            font-size: 20px;
            font-weight: 700;
        }}
        .stat-label {{
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
        }}
        .stat-box.completed .stat-value {{ color: #10b981; }}
        .stat-box.in-progress .stat-value {{ color: #f59e0b; }}
        .stat-box.pending .stat-value {{ color: #6b7280; }}
        .filters {{
            background: rgba(30, 41, 59, 0.8);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
        }}
        .filter-btn {{
            padding: 8px 16px;
            margin: 4px;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid #3b82f6;
            color: #60a5fa;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }}
        .filter-btn:hover {{
            background: rgba(59, 130, 246, 0.3);
        }}
        .filter-btn.active {{
            background: #3b82f6;
            color: white;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }}
        .summary-card {{
            background: rgba(30, 41, 59, 0.8);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }}
        .summary-value {{
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        .summary-label {{
            font-size: 12px;
            color: #94a3b8;
            text-transform: uppercase;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Card Progress Heatmap</h1>
        <div class="subtitle">Real-time PRD completion tracking based on Card status (Zero Hardcoding)</div>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-box" style="background: #10b981;"></div>
                <span>Excellent (≥90%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box" style="background: #3b82f6;"></div>
                <span>Good (70-89%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box" style="background: #f59e0b;"></div>
                <span>In Progress (1-69%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box" style="background: #ef4444;"></div>
                <span>Critical (<1%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box" style="background: #6b7280;"></div>
                <span>Pending (0%)</span>
            </div>
        </div>

        <div class="summary" id="summary"></div>

        <div class="filters">
            <button class="filter-btn active" onclick="filterView('all')">All PRDs</button>
            <button class="filter-btn" onclick="filterView('excellent')">Excellent</button>
            <button class="filter-btn" onclick="filterView('good')">Good</button>
            <button class="filter-btn" onclick="filterView('in-progress')">In Progress</button>
            <button class="filter-btn" onclick="filterView('pending')">Pending</button>
        </div>

        <div class="heatmap" id="heatmap"></div>
    </div>

    <script>
        const prds = {prds_json};
        let currentFilter = 'all';

        function getProgressClass(pct) {{
            if (pct === 0) return 'pending';
            if (pct >= 90) return 'excellent';
            if (pct >= 70) return 'good';
            if (pct >= 1) return 'warning';
            return 'critical';
        }}

        function calculateSummary(filtered) {{
            let excellent = 0, good = 0, inProgress = 0, pending = 0;
            let totalCards = 0, totalCompleted = 0;

            filtered.forEach(prd => {{
                const prog = prd.progress;
                const cls = getProgressClass(prog.progress_pct);
                if (cls === 'excellent') excellent++;
                else if (cls === 'good') good++;
                else if (cls === 'warning') inProgress++;
                else pending++;

                totalCards += prog.total_cards;
                totalCompleted += prog.completed;
            }});

            const avgProgress = totalCards > 0 ? ((totalCompleted / totalCards) * 100).toFixed(1) : 0;

            return {{ excellent, good, inProgress, pending, avgProgress, totalCards }};
        }}

        function renderSummary(summary) {{
            document.getElementById('summary').innerHTML = `
                <div class="summary-card">
                    <div class="summary-value" style="color: #60a5fa;">${{summary.avgProgress}}%</div>
                    <div class="summary-label">Avg Progress</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value" style="color: #10b981;">${{summary.excellent}}</div>
                    <div class="summary-label">Excellent</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value" style="color: #f59e0b;">${{summary.inProgress}}</div>
                    <div class="summary-label">In Progress</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value" style="color: #6b7280;">${{summary.pending}}</div>
                    <div class="summary-label">Pending</div>
                </div>
            `;
        }}

        function renderHeatmap() {{
            let filtered = prds;
            if (currentFilter !== 'all') {{
                filtered = prds.filter(p => {{
                    const cls = getProgressClass(p.progress.progress_pct);
                    if (currentFilter === 'in-progress') return cls === 'warning';
                    return cls === currentFilter;
                }});
            }}

            const summary = calculateSummary(filtered);
            renderSummary(summary);

            document.getElementById('heatmap').innerHTML = filtered.map(prd => {{
                const prog = prd.progress;
                const cls = getProgressClass(prog.progress_pct);
                const pct = prog.progress_pct;

                return `
                    <div class="cell ${{cls}}">
                        <div class="prd-id">${{prd.id}}</div>
                        <div class="prd-title">${{prd.title}}</div>
                        <div class="progress-score">${{pct.toFixed(0)}}%</div>
                        <div class="progress-label">Completion</div>
                        <div class="card-stats">
                            <div class="stat-box completed">
                                <div class="stat-value">${{prog.completed}}</div>
                                <div class="stat-label">Done</div>
                            </div>
                            <div class="stat-box in-progress">
                                <div class="stat-value">${{prog.in_progress}}</div>
                                <div class="stat-label">Active</div>
                            </div>
                            <div class="stat-box pending">
                                <div class="stat-value">${{prog.pending}}</div>
                                <div class="stat-label">Pending</div>
                            </div>
                        </div>
                    </div>
                `;
            }}).join('');
        }}

        function filterView(filter) {{
            currentFilter = filter;
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            renderHeatmap();
        }}

        renderHeatmap();
    </script>
</body>
</html>'''

    output.write_text(html)

if __name__ == '__main__':
    prds = load_card_progress()
    output = Path('card-progress-heatmap.html')
    generate_html(prds, output)
    print(f'✅ Generated {output.absolute()}')
    print(f'📊 Showing {len(prds)} PRDs with Card-driven progress')
    webbrowser.open(f'file://{output.absolute()}')
