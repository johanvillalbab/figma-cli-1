---
name: figma-direct-verify
description: Audit and verify an open Figma design system or target page using figma-cli without Figma MCP. Use for component, token-binding, visual, naming, accessibility, contract, or drift checks.
---

# Figma Direct Verify

Load `figma-direct-use` first. Remain read-only unless repair is explicitly requested.

1. Confirm the file and authorized scope with `figma-cli files` and page/section inspection.
2. Inspect variables, styles, components, variant matrices, properties, and instance usage with direct CLI reads.
3. Run `lint`, `a11y audit`, and `verify --measure` only when available; use `figma-cli --help` to detect version support.
4. Use `snapshot`/`check` for a contract baseline only when the version exposes them and a baseline is authorized.
5. Report exact node IDs, evidence, severity, and the smallest safe repair. Separate existing findings from current-run regressions.

Read `references/checklist.md` before reporting completion.
