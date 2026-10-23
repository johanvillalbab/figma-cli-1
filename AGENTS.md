# Using figma-cli

figma-cli controls Figma Desktop directly. It runs in a terminal after Figma
Desktop is open and `figma-cli connect` has been run for the session.

For Interface School brand work, use the Brand Advisor workflow in
`docs/BRAND-ADVISOR-WORKFLOW.md`. In that workflow the advisor is the decision
engine, the agent is the operator, and `figma-cli` is the Figma execution layer.

## Golden Rules

1. Create visual frames with `figma-cli render` or `figma-cli render-batch`.
   These commands handle positioning and guardrails.
2. Do not use `figma-cli eval` to create new visual nodes. Use it only for API
   operations that do not have a CLI command, bulk reads, or mutations of
   existing nodes.
3. Do not delete existing user nodes unless the user explicitly asks.
4. After creating or changing visual nodes, verify with
   `figma-cli verify "<nodeId>" --measure`.
5. For dashboards and page layouts, prefer `figma-cli blocks create` over manual
   reconstruction when an existing block fits.

## Multi-Item Creation

When the user asks for N of something, create N independent top-level nodes.
Do not wrap repeated items in one parent frame or component.

Use:

```bash
figma-cli shadcn add button --count 3
figma-cli shadcn add card --count 5
figma-cli render-batch '["<Frame>...</Frame>", "<Frame>...</Frame>"]' --direction row
```

Avoid:

```bash
figma-cli render '<Frame><Frame>Button 1</Frame><Frame>Button 2</Frame></Frame>'
figma-cli eval --file script-that-creates-a-wrapper.js
```

If repeated children were accidentally wrapped, use `figma-cli unwrap <wrapperId>`.

## Themed vs shadcn Components

Read the user's wording before choosing the creation path.

- "create 3 buttons" or "add a card" can use shadcn primitives:
  `figma-cli shadcn add button --count 3`.
- "using variables", "themed", "in figma style", "using the loaded design
  system", or "with tokens" means create custom rendered components bound to
  variables, usually with `figma-cli render-batch`.

`shadcn add` uses shadcn's own variables and does not automatically use an
imported design system. If the user asks for a named system, pin the collection.

```bash
figma-cli render-batch '["<Frame bg=\"var:primary\"><Text color=\"var:on-primary\">Primary</Text></Frame>"]' --collection figma
```

Do not use `rounded="var:md"` in JSX. `rounded` takes a number; inspect radius
tokens with `figma-cli var list` and use a numeric value like `rounded={8}`.

## Variables and Collections

Use `var:name` to bind variables at creation time:

```jsx
<Frame bg="var:card" stroke="var:border" rounded={12} p={24}>
  <Text color="var:foreground" size={18}>Title</Text>
</Frame>
```

When the user names a collection, pass `--collection <name>` to `render` or
`render-batch`. Examples:

- "use figma variables" -> `--collection figma`
- "airbnb style" -> `--collection airbnb`
- "cursor themed" -> `--collection cursor`

If the user says only "use variables" and there are multiple collections, use
the most recently imported collection if known; otherwise ask which collection
to use.

Per-attribute override is also supported:

```jsx
<Frame bg="var:cursor:primary" />
```

## JSX Rendering Cheatsheet

```jsx
<Frame flex="row" gap={16} p={24} justify="between" items="center" w={800}>
  <Text size={14} weight="semibold" color="var:foreground" w="fill">Label</Text>
  <Icon name="lucide:check" size={16} color="var:primary" />
</Frame>
```

Common props:

- Layout: `flex="row|col"`, `gap={16}`, `p={24}`, `px={16}`, `py={8}`,
  `justify="start|center|end|between"`, `items="start|center|end"`.
- Size: `w={320}`, `h={200}`, `w="fill"`, `h="fill"`, `w="60%"`.
- Appearance: `bg`, `stroke`, `strokeWidth`, `rounded`, `shadow`, `opacity`.
- Text: `size`, `weight`, `font`, `italic`, `lineHeight`, `letterSpacing`,
  `align`, `truncate`, `maxLines`.
- Icons: use Lucide/Iconify names such as `<Icon name="lucide:home" />`.

Do not use emojis for UI icons. Use Lucide icons or simple shapes.

## Text Wrapping

For text to wrap correctly, the parent and every multiline `Text` element need
`w="fill"`, and the parent must use `flex="col"` or `flex="row"`.

```jsx
<Frame flex="col" gap={8} w="fill">
  <Text size={16} weight="semibold" w="fill">Long title wraps correctly</Text>
  <Text size={14} w="fill">Description wraps correctly too.</Text>
</Frame>
```

## Recreating From DESIGN.md

When rebuilding a component from an extracted `DESIGN.md`, do not read huge
structure markdown by hand. Use the CLI spec commands:

```bash
figma-cli spec ButtonGroup
figma-cli spec ButtonGroup --check <nodeId>
```

Build exactly to the reported variant axes. If the spec says
`Variant x Size = 6 variants`, create a component set with those variants, not a
single node. Treat a non-zero `spec --check` result as unfinished work.

## Verification and Context Hygiene

Prefer concise command output. For visual checks, use `--measure`; when output
would be large, use `--save <path>` so the screenshot is written to disk instead
of flooding the conversation.

Useful checks:

```bash
figma-cli verify "<nodeId>" --measure
figma-cli spec <Component> --check <nodeId>
figma-cli daemon status
```

## Useful Commands

```bash
figma-cli connect
figma-cli connect --safe
figma-cli render '<Frame>...</Frame>'
figma-cli render-batch '["<Frame>...</Frame>"]' --direction row
figma-cli shadcn add button --count 3
figma-cli node to-component "<id>"
figma-cli var list
figma-cli var visualize
figma-cli import tailwind.config.js
figma-cli import src/globals.css
figma-cli import tokens.json
figma-cli extract
figma-cli a11y audit
```
