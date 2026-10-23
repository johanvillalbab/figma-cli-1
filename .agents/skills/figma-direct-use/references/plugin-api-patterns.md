# Direct Plugin API Patterns

Use `figma-cli eval` only after confirming there is no focused CLI command.

1. Use top-level `await` and `return`; do not wrap in an async IIFE or call `figma.closePlugin()`.
2. Use `eval` for reads or narrow mutations of known existing nodes, never for visual-node creation. Use `render`/`render-batch` for frames and layout.
3. Load every current font before changing text, and return affected IDs plus names.
4. Append a child to an auto-layout parent before setting `HUG` or `FILL`. Frame axis modes use `FIXED`/`AUTO`; child sizing uses `FIXED`/`HUG`/`FILL`.
5. Reassign paints after binding a variable; do not assume bound paint arrays mutate in place.
6. Use returned property identifiers from `addComponentProperty` with `instance.setProperties`; an instance-swap default is a component ID string.
7. Do not create/delete broad groups of visual nodes through eval. Keep the ledger authoritative for exact targets.
