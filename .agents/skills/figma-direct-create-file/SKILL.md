---
name: figma-direct-create-file
description: Prepare a Figma Desktop Design or FigJam file for direct figma-cli work without Figma MCP file creation. Use when a direct-Figma task needs a new file, an open target file, or a verified Desktop connection.
---

# Figma Direct File Preflight

`figma-cli` writes to a file that is already open in Figma Desktop; it does not create cloud files. Do not substitute an MCP file-creation call.

1. Ask the user to create or open the intended Design or FigJam file when no suitable file is open.
2. Run `figma-cli status` and `figma-cli files`; record the returned file URL in `/tmp/figma-direct-state-{run-id}.json`.
3. If disconnected, run `figma-cli connect` (or `connect --safe` when patching Desktop is inappropriate) and repeat status.
4. Inspect file pages and agree on the authorized page or section before any mutation.
5. Hand off to `figma-direct-use` or the specialized direct skill.

Never assume the first open file is intended or create content on a page solely because its name resembles the request.
