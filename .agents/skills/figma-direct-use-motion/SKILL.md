---
name: figma-direct-use-motion
description: Author, inspect, and verify animations directly in an open Figma Desktop file through figma-cli without Figma MCP. Use when a user asks to add, edit, audit, or remove Figma Motion keyframes, styles, presets, timelines, or staggered sequences.
---

# Figma Direct Motion

Load `figma-direct-use` first. Confirm `figma-cli motion --help` exposes the needed capability before mutation.

1. Inspect the target node and parent frame. Do not animate a top-level page frame.
2. Read existing tracks and timing before changing anything.
3. Prefer a first-party style or named preset when it precisely expresses the requested behavior. Use explicit tracks only when needed.
4. Keep motion purposeful, preserve the resting state, and avoid motion that blocks reading or interaction.
5. Verify track/timeline data and visually check non-trivial choreography.
6. Record target IDs, tracks, and duration in the ledger. Never clear motion without confirming the exact target.
