# ROQ Model Visualizer

An interactive web tool for building Relationship-Oriented Questioning (ROQ) diagrams used in penetration testing methodology.

**Live Site:** https://cybaisecurity.github.io/ROQ-Model-Visualizer/

## What It Does

The ROQ model maps the relationships between your position, your target, and the surrounding environment during a pentest engagement. This tool lets you construct that diagram visually by defining the five core nodes and drawing connections between them.

**Nodes:**
- **Your Position** — Your current access level, privileges, or role
- **The Object** — The target system or service under assessment
- **Others Position(s)** — Other actors, accounts, or systems in scope
- **Known** — Techniques, exploits, and methods available to you
- **Unknown** — Gaps in knowledge that require further research

**Connections** are user-defined. You choose the source, destination, label, line style, and color for each arrow — nothing is hardcoded.

## Features

- Real-time SVG diagram rendering as you type
- Dynamic connection builder with customizable arrows (color, style, label)
- Adjustable node sizing
- Save/load scenarios via local storage with full history
- Export diagrams as SVG files
- Dark-themed UI built for cybersecurity workflows

## Tech Stack

Pure HTML, CSS, and JavaScript. No frameworks, no build step. Open `index.html` and go.

## Usage

1. Fill in the node fields on the left panel
2. Click **+ Add** under Connections to draw arrows between nodes
3. Configure each arrow's direction, label, color, and line style
4. Save scenarios to history or export the diagram as SVG
