---
name: figma-direct-implement-motion
description: Inspect motion in an open Figma Desktop file with figma-cli and implement it in a local codebase without Figma MCP. Use when a user asks to translate Figma animations, keyframes, or timelines into application code.
---

# Figma Direct Motion to Code

Load `figma-direct-use-motion` before inspection.

1. Read the static node with `get`/`verify`, then inspect motion tracks and containing timeline when supported.
2. Treat the hierarchy as structural context and track values/timing as motion truth. Record animated fields and easing.
3. Inspect the codebase's animation stack and use it when present. Otherwise select the smallest suitable native/CSS approach.
4. Preserve static layout and intended timing; do not invent motion for static nodes.
5. Respect reduced-motion settings, keep repeated choreography data-driven, test one full animation, and compare key moments.

Do not change Figma tracks unless separately requested.
