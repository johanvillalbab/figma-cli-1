---
name: figma-direct-design-to-code
description: Inspect a node in an open Figma Desktop file and implement it in a local codebase without Figma MCP. Use for design-to-code requests when figma-cli can access the source document directly.
---

# Figma Direct Design to Code

1. Confirm the Figma file is open and the URL includes a node ID. Read it using `get`, `inspect`, `verify`, and optionally `export-jsx` as a structural reference.
2. Inspect the repository first. Reuse its components, tokens, icons, accessibility conventions, and responsive patterns.
3. Treat exported JSX as a reference, never production code. Translate semantic layout, not raw layer positions.
4. Use approved/project assets or Figma-exported assets; do not redraw unknown vectors by hand.
5. Implement and test in code, then compare with the Figma visual reference.

Do not modify Figma unless the user separately requests a Figma change.
