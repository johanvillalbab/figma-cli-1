# Brand Advisor Workflow

Workflow for using the Interface School Brand Advisor with an AI agent
(Codex, Claude, Cursor, or another coding/design agent) and `figma-cli`.

The advisor is the decision engine. The agent is the operator. `figma-cli` is the
execution layer inside Figma.

## Source of Truth

Current advisor file:

```text
/Users/johanvillalba/Downloads/brand-advisor-v2.md
```

At session start, the agent must read the advisor before making brand decisions.
If the advisor file is moved into the repo later, update this path and treat the
repo copy as canonical.

## Roles

### User

Defines the task, the Figma file or node, and the desired output.

Examples:

- "Use the Brand Advisor to review this draft."
- "Create two logo proposals based on the advisor."
- "Extend this route into a mini brand system."
- "Evaluate this landing page through the Brand Advisor."

### Brand Advisor

Makes the brand judgment.

The advisor governs:

- visual system coherence
- logo direction
- typography and color discipline
- grid and layout logic
- voice and visual behavior
- long-term brand recognition

The advisor does not govern:

- growth channels
- paid media
- pricing
- legal trademark clearance
- frontend implementation details

### Agent

Runs the workflow.

The agent must:

- read the advisor
- inspect the Figma draft
- ask only blocking questions
- translate the advisor's judgment into concrete Figma actions
- execute with `figma-cli`
- verify the result
- report what was created and why

The agent must not:

- invent decisions that violate the advisor
- treat the logo as a standalone artifact disconnected from the system
- use decoration as a substitute for a repeatable brand program
- overwrite or delete existing Figma work unless explicitly asked

### figma-cli

Executes the work in Figma Desktop.

Use `figma-cli` for:

- connection and diagnostics
- canvas inspection
- node search
- screenshot/measurement verification
- rendering proposal boards
- creating system explorations
- exporting or documenting the design system

## Activation Phrase

When the user says something like:

```text
Use the Brand Advisor for this Figma task.
```

or

```text
Trabaja esto con el Advisor de Brand.
```

the agent must switch into this workflow.

## Session Startup

1. Confirm `figma-cli` is reachable:

```bash
figma-cli daemon status
```

2. If needed, connect:

```bash
figma-cli connect
```

3. Read the advisor:

```bash
sed -n '1,260p' /Users/johanvillalba/Downloads/brand-advisor-v2.md
```

Read more if the file is longer than the first chunk.

4. Inspect the active Figma canvas:

```bash
figma-cli canvas info
```

5. If the user provides a Figma node id, verify it:

```bash
figma-cli verify "<nodeId>" --measure --save /private/tmp/brand-advisor-current.png
```

6. If names are useful, search the file:

```bash
figma-cli find "Logo"
figma-cli find "Interface"
figma-cli find "Brand"
```

## Decision Protocol

Before creating anything, the agent should derive a short advisor brief.

Use this format internally:

```text
Advisor brief
- Decision: what exact brand decision is being made.
- Function: what the mark/system must communicate.
- System fit: how it extends the current brand system.
- Constraints: what must be preserved.
- Vetoes: what the advisor rejects.
- Output: what will be created in Figma.
```

For Interface School, default advisor constraints are:

- rigor before decoration
- system before isolated logo
- green remains the primary equity color unless the user changes strategy
- orange is a warm accent, not the primary mark
- multicolor can become a secondary pattern language, not a logo dependency
- visual warmth must live inside rules: color tokens, type, grid, voice, motifs
- every proposal must work in one-color or reduced-color form
- every proposal must include rationale, not just visuals

## Creation Protocol

When generating proposals, create Figma boards, not loose objects.

Each board should include:

- route name
- advisor summary
- logo or symbol proposal
- wordmark or lockup
- small-size / monochrome check
- extension example
- rationale
- risk or veto

Recommended board names:

```text
Advisor Proposal 01 - <Route Name>
Advisor Proposal 02 - <Route Name>
Advisor Review - <Topic>
Advisor System Extension - <Route Name>
```

Use `render-batch` for multiple independent boards:

```bash
figma-cli render-batch '["<Frame name=\"Advisor Proposal 01\">...</Frame>", "<Frame name=\"Advisor Proposal 02\">...</Frame>"]' --direction row --gap 120 --verify
```

If the JSX is large, create a temporary script in `/private/tmp` that calls
`figma-cli render-batch`. Do not write temporary render scripts into the repo.

## Review Protocol

After creating visual work:

1. Verify each created board:

```bash
figma-cli verify "<nodeId>" --measure --save /private/tmp/<name>.png
```

2. Inspect the screenshots.

3. Fix issues before reporting completion:

- clipped text
- crowded rationale blocks
- mismatched rationale and symbol behavior
- weak small-size mark
- color usage that contradicts the advisor
- proposals that cannot become a system

4. Keep the original draft intact unless the user asks for replacement.

## Response Protocol

The final response should be concise and include:

- what was created
- node ids
- advisor recommendation
- any notable tradeoff

Example:

```text
Created two Brand Advisor boards in Figma:

- 2250:211 — Advisor Proposal 01 - Interface Gate
- 2250:244 — Advisor Proposal 02 - System I Monogram

Advisor recommendation: Route 01 is the stronger primary direction because it
preserves the green equity, turns the current I into a repeatable system, and
uses multicolor as extension rather than logo dependency. Route 02 is stronger
for institutional/UX+AI authority but needs more warmth in voice and imagery.
```

## Typical Interaction

### User

```text
Use the Brand Advisor to review this logo draft and propose two directions.
Figma node: 2249:2
```

### Agent

1. Reads the advisor.
2. Confirms Figma connection.
3. Captures node `2249:2`.
4. Diagnoses the draft using advisor criteria.
5. Produces two route boards in Figma.
6. Verifies screenshots and measurements.
7. Reports node ids and recommendation.

### Advisor Decision Shape

```text
The current mark has energy but depends too heavily on decorative color.
Preserve the green as equity. Reframe multicolor as a controlled pattern
language. Create one route that evolves the current I, and one route that turns
the I into a more modular system mark.
```

### Agent Execution Shape

```text
figma-cli verify "2249:2" --measure --save /private/tmp/current.png
figma-cli render-batch '[...]' --direction row --gap 120 --verify
```

## Quality Bar

A Brand Advisor output is not done until it passes these checks:

- It answers the specific decision asked by the user.
- It states the functional communication goal.
- It integrates with the existing Interface School system.
- It avoids unsupported decoration.
- It includes a rationale the team can reuse later.
- It is represented concretely in Figma.
- It has been visually verified.
