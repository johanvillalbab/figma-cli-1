---
name: figma-direct-use-figjam
description: Create, inspect, and edit an open FigJam board directly through figma-cli without Figma MCP. Use for stickies, shapes, connectors, workshop boards, flows, and board organization.
---

# FigJam Direct Use

1. Run `figma-cli status`, then `figma-cli figjam list` and `figma-cli figjam info`; confirm the intended board/page.
2. Read the board before editing. Preserve workshop content outside the authorized area.
3. Use `figma-cli figjam sticky`, `shape`, `text`, `connect`, `move`, and `update` for board work. Use `figma-cli figjam eval` only for structured operations lacking a command.
4. Keep every node labelled, preserve a clear reading order, and label non-obvious connectors.
5. Verify with `figma-cli figjam nodes` and visual inspection. Return board IDs and assumptions.

Do not use Design-only Plugin APIs in FigJam or fabricate process content when the underlying source is unknown.
