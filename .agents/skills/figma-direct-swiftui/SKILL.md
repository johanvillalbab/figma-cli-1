---
name: figma-direct-swiftui
description: Translate between SwiftUI code and an open Figma Desktop file through figma-cli without Figma MCP. Use for SwiftUI-to-Figma or Figma-to-SwiftUI work when the direct CLI connection is available.
---

# Figma Direct SwiftUI

Choose the direction first.

## Figma to SwiftUI

Read the node with `get`, `inspect`, `verify`, and optional JSX export. Inspect the SwiftUI project, map semantic colors to named colors/tokens, preserve SF Symbol names, and match native platform patterns instead of absolute Figma layers. Test and compare.

## SwiftUI to Figma

Inspect the source view and tokens first. Confirm an authorized page, then use `figma-direct-generate-design` or `figma-direct-generate-library` to create variable-bound frames and components. Verify hierarchy and reuse.

Do not present either translation direction as a pixel-perfect compiler.
