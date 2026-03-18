#!/usr/bin/env python3
"""Generate visualization showcase page with links to all visualizations."""

import webbrowser
from pathlib import Path
from datetime import datetime

def generate_showcase_html(output: Path):
    """Generate showcase page with all visualization links."""

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualization Showcase</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1 {{
            color: white;
            text-align: center;
            font-size: 48px;
            margin-bottom: 16px;
            text-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }}
        .subtitle {{
            color: rgba(255,255,255,0.9);
            text-align: center;
            font-size: 18px;
            margin-bottom: 50px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }}
        .card {{
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: all 0.3s;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }}
        .card:hover {{
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }}
        .card::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
        }}
        .card.blue::before {{ background: #3b82f6; }}
        .card.purple::before {{ background: #8b5cf6; }}
        .card.green::before {{ background: #10b981; }}
        .card.orange::before {{ background: #f59e0b; }}
        .card.red::before {{ background: #ef4444; }}

        .icon {{
            font-size: 48px;
            margin-bottom: 16px;
            text-align: center;
        }}
        .card-title {{
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 12px;
            text-align: center;
        }}
        .card-description {{
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 20px;
            text-align: center;
        }}
        .features {{
            list-style: none;
            padding: 0;
            margin-bottom: 20px;
        }}
        .features li {{
            padding: 8px 0;
            color: #4b5563;
            font-size: 13px;
            border-bottom: 1px solid #f3f4f6;
        }}
        .features li:last-child {{
            border-bottom: none;
        }}
        .features li::before {{
            content: '✓';
            color: #10b981;
            font-weight: bold;
            margin-right: 8px;
        }}
        .button {{
            display: block;
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
        }}
        .button:hover {{
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 12px;
        }}
        .status-new {{ background: #dbeafe; color: #1e40af; }}
        .status-updated {{ background: #d1fae5; color: #065f46; }}
        .footer {{
            text-align: center;
            color: white;
            margin-top: 50px;
            font-size: 14px;
            opacity: 0.9;
        }}
        .generation-info {{
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            color: white;
            text-align: center;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Visualization Showcase</h1>
        <div class="subtitle">Interactive HTML visualizations powered by YAML frontmatter</div>

        <div class="generation-info">
            <strong>🚀 Data-Driven Visualizations:</strong> Only showing visualizations that read from real data<br>
            <small>Uses YAML frontmatter from PRD markdown files + Card status - zero hardcoding</small>
        </div>

        <div class="grid">
            <!-- Card Progress Heatmap - ONLY DATA-DRIVEN VISUALIZATION -->
            <div class="card orange" onclick="window.location.href='card-progress-heatmap.html'">
                <div class="icon">🎯</div>
                <div class="card-title">Card Progress Heatmap</div>
                <span class="status-badge status-new">Fully Data-Driven</span>
                <div class="card-description">
                    Visual heatmap showing PRD completion based on Card status (Done/In Progress/Pending)
                </div>
                <ul class="features">
                    <li>Card-driven progress calculation</li>
                    <li>Color-coded by completion %</li>
                    <li>Zero hardcoding - reads Card status</li>
                    <li>Interactive filtering</li>
                    <li>Auto-updates when Card status changes</li>
                </ul>
                <a href="card-progress-heatmap.html" class="button">View Card Progress</a>
            </div>
        </div>

        <div class="generation-info" style="margin-top: 40px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">
            <strong>⚠️ Other Visualizations Removed</strong><br>
            <small>Progress Dashboard, PRD Graph, Phase Tracker, and Test Coverage were removed due to hardcoded data.<br>
            Focus is now on establishing proper YAML formats first before creating new visualizations.</small>
        </div>

        <div class="footer">
            Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}<br>
            <small>Data source: YAML frontmatter in docs/prds/*.md and docs/cards/*.md</small>
        </div>
    </div>
</body>
</html>'''

    output.write_text(html)

if __name__ == '__main__':
    output = Path('visualization-showcase.html')
    generate_showcase_html(output)
    print(f'✅ Generated {output.absolute()}')
    webbrowser.open(f'file://{output.absolute()}')
