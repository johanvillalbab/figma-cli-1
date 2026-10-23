---
name: figma-direct-code-connect
description: Create or update Figma Code Connect templates from an open Figma Desktop file and a local codebase without Figma MCP. Use when mapping a Figma component's variants and properties to code or creating .figma.ts template files.
---

# Figma Direct Code Connect

1. Confirm Code Connect is available for the organization and the component is published. Stop if not.
2. Parse the URL and inspect the component set with `get`, `find`, `component`, or read-only `eval`. Record every property type and variant value.
3. Inspect the codebase for the canonical implementation and public prop interface. Do not invent code props.
4. Create a parserless `.figma.ts` template at the configured path; do not use `.figma.tsx` for this workflow.
5. Map every Figma variant value exhaustively. Map text, boolean, and instance swap only where a code correspondence exists; omit unmatched affordances.
6. Link source documentation with `figma-cli dev link` when a stable source URL exists and the command is available.

Return component node, code path, mapping, and non-isomorphic properties.
