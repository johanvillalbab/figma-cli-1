---
name: figma-direct-use-slides
description: Assess and prepare Figma Slides work for a direct figma-cli workflow without Figma MCP. Use when a user requests Figma Slides creation or editing and the agent must avoid MCP tools.
---

# Figma Direct Slides

The CLI may not expose native Slides authoring. Never pretend Design-frame commands create native Slides.

1. Confirm the requested editor is Figma Slides and probe CLI support with `figma-cli --help`.
2. If native editing is unsupported, explain the constraint and ask the user for the minimal Desktop action or permission for a different workflow. Do not silently create a Design file.
3. If the required Design surface is supported, use `figma-direct-generate-design` while preserving page/slide boundaries.
4. Record the unsupported operation and the handoff required.
