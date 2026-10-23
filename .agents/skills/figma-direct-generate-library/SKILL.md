---
name: figma-direct-generate-library
description: Build or extend a token-bound Figma component library from a codebase by writing directly through figma-cli, without Figma MCP. Use for variables, modes, styles, component sets, variants, component properties, foundations, and library QA.
---

# Figma Direct Library

Load `figma-direct-use` first.

## Discovery and foundations

1. Inspect source tokens, public component APIs, aliases, and target Figma collections/styles/components.
2. Produce a scoped gap list before mutating: source-only, Figma-only, conflicts, and out-of-scope items. Record exact IDs in `/tmp/figma-direct-state-{run-id}.json`.
3. Create or reuse variable collections and modes before components. Preserve source taxonomy and bind semantic values to primitives when that relation exists.
4. Verify variables and styles before building visual components.

## Components

For each family, build atoms before composites:

1. Use `render`/`render-batch` for visual anatomy, auto layout, and `var:` bindings. Use `node to-component`, `variants from`, `component`, and `slot` for component semantics.
2. Add only meaningful variant axes. Split an unwieldy cross-product instead of generating a matrix that cannot be used.
3. Map editable strings to text properties, visibility to boolean properties, and icons/media to instances or instance swaps where the CLI supports them.
4. Create catalogue samples as instances, not copies of the main component. Represent deprecated names as labelled references to canonical components, not duplicate implementations.
5. Verify structure, visual rendering, binding, naming, contrast, and touch targets before proceeding.

## Handoff

Run `extract` for a portable design description and use `snapshot`/`check` only if that CLI version exposes them. Return changed components, token evidence, validation output, and ledger path.

Read `references/library-acceptance.md` before declaring completion.
