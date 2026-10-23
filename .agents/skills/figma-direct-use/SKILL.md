---
name: figma-direct-use
description: Operate an already open Figma Desktop file directly through figma-cli and the Figma Plugin API, without Figma MCP. Use for inspecting or mutating pages, frames, variables, components, variants, auto layout, styles, bindings, and instances in Figma.
---

# Figma Direct Use

Use `figma-cli` as the only Figma integration. Do not call Figma MCP tools.

## Preflight

1. Run `figma-cli status` and `figma-cli files`. If Desktop is not connected or no target is open, stop and use `figma-direct-create-file`.
2. Identify the authorized page, target section, and nodes before any mutation. Never infer permission to modify another page.
3. Read `references/plugin-api-patterns.md` before using `figma-cli eval`.
4. Create or resume `/tmp/figma-direct-state-{run-id}.json` with the file URL, page IDs, created IDs, and validation evidence.

## Working rules

1. Inspect before creating with `get`, `find`, `var list`, `section list`, and read-only `eval` when needed.
2. Make mutations sequentially in small units. Do not retry an error without reading it.
3. Create visual frames and layouts with `render` or `render-batch`; these provide safe positioning and constraints. Never use `eval` to create visual nodes.
4. Use `eval` only for a Plugin API operation with no CLI equivalent, and only after confirming the target IDs.
5. Bind existing variables using `var:` in renders or the CLI binding commands. Do not introduce a literal when a matching token exists.
6. Use auto layout for related children and component instances for reusable content. Use deterministic names and exact IDs; never delete by broad matching.
7. Preserve user-owned content and never change pages outside the authorized target.

## Verify each unit

Run `figma-cli verify <node-id> --measure` after meaningful creation. Use available `lint`, `a11y`, `extract`, `snapshot`, and `check` commands only after confirming them in `figma-cli --help`. Record evidence in the ledger.

If context is lost, reread the ledger, inspect the target page, and reconcile IDs before resuming. Do not recreate nodes merely because conversation history is incomplete.
