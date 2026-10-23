---
name: figma-direct-generate-design
description: Create or update product screens, flows, and multi-section layouts directly in an open Figma Desktop file with figma-cli, without Figma MCP. Use when source code, requirements, or an existing design system must be assembled into Figma screens.
---

# Figma Direct Design

Load `figma-direct-use` first. Also load `figma-direct-generate-library` when reusable components change.

1. Inspect the target frame/page, existing components, variable collections, and source requirements before creating nodes.
2. State the authorized target; preserve all other pages and frames.
3. Build screen sections with `render`/`render-batch`, nested auto layout, and `var:` tokens. Avoid layer-by-layer `eval` creation and normal-content absolute positioning.
4. Use component instances and component properties for existing library elements. Do not detach instances or recreate an available component locally.
5. Work section-by-section, verify each section visually, then inspect the final frame with `verify --measure`.
6. Run available accessibility checks for interactive surfaces, text contrast, and touch targets.

Return the target node IDs, reused components, and validation evidence.
