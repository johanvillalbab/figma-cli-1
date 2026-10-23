---
name: figma-direct-generate-diagram
description: Create accurate flowcharts, architecture diagrams, process maps, and journey maps directly in an open FigJam board with figma-cli, without Figma MCP. Use whenever a user asks to draw or update a diagram in FigJam.
---

# FigJam Direct Diagram

Load `figma-direct-use-figjam` first.

1. Gather source truth from code, specifications, process steps, or existing documentation. Do not infer ownership or data flow from a vague title.
2. Turn it into a compact node-and-edge plan: labels, edge direction, decisions, and groups/lanes.
3. Confirm the board area, create shapes/text, place them in a readable grid, and connect them with the FigJam CLI commands.
4. Use one shape convention per semantic kind and label non-obvious arrows.
5. Inspect the result for overlap, connector direction, and ambiguous labels before handoff.

Return board/page, sources used, created IDs, and assumptions.
