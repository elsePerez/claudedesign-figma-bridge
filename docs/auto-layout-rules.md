# The Silent Rules of Figma Auto-Layout

> A reference of the 13 rules the bridge codifies so they cease being tribal
> knowledge.

Every rule below is a real bug from the vertical slice (Lista Fase 2 →
ScreenEmpty) — a place where the agent, despite having full context, broke
the layout in a way that produces no error message and no obvious symptom.

The source of truth lives in
[`packages/figma-script/src/auto-layout-rules.ts`](../packages/figma-script/src/auto-layout-rules.ts).

---

## 1. `FILL_AFTER_APPEND`

`layoutSizingHorizontal = 'FILL'` (and the vertical variant) must be set
**after** the child has been appended to its parent. Set it before, and
Figma throws *"node must be an auto-layout frame or have an auto-layout
parent"*.

```js
// ❌ throws
const child = figma.createFrame();
child.layoutSizingHorizontal = "FILL";
parent.appendChild(child);

// ✅ correct
const child = figma.createFrame();
parent.appendChild(child);
child.layoutSizingHorizontal = "FILL";
```

**Symptom from slice:** SuggestionLine middle column ended up clipped at
the top — the FILL was applied before the parent had auto-layout context,
silently doing nothing.

---

## 2. `LOAD_FONT_PER_CALL`

Font context resets between `use_figma` calls. Every script must load all
fonts it intends to use:

```js
for (const style of ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold"]) {
  await figma.loadFontAsync({ family: "Urbanist", style });
}
```

**Symptom from slice:** "Cannot use unloaded font 'Urbanist Bold'" on the
2nd `use_figma` call even though the 1st loaded it.

---

## 3. `SWITCH_PAGE_ASYNC`

`figma.currentPage` resets to the first page at the start of every call.
Switching pages requires the async method — the sync setter throws:

```js
// ❌ throws
figma.currentPage = targetPage;

// ✅ correct
await figma.setCurrentPageAsync(targetPage);
```

---

## 4. `POSITION_AWAY_FROM_ZERO`

New top-level nodes appended directly to the page default to (0,0). On a
page that already has content, this causes overlap. Always set explicit x/y
on root frames.

---

## 5. `COLOR_0_TO_1`

Figma color channels are floats in `[0..1]`, not integers in `[0..255]`.

```js
// ❌ silently wrong (channels clamp to 1)
fills = [{ type: "SOLID", color: { r: 245, g: 72, b: 68 } }];

// ✅ correct
fills = [{ type: "SOLID", color: { r: 0.96, g: 0.28, b: 0.27 } }];
```

The bridge's `colorExpr()` helper handles this conversion.

---

## 6. `FILLS_READONLY`

`node.fills` is a read-only array. Mutating in place does nothing.

```js
// ❌ no effect
node.fills[0].color = { r: 1, g: 0, b: 0 };

// ✅ correct
node.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }];
```

Same for `node.strokes` and `node.effects`.

---

## 7. `NO_NOTIFY`

`figma.notify()` throws `"not implemented"` in the `use_figma` context.
Use `return` for any output.

---

## 8. `RESIZE_BEFORE_SIZING`

`resize()` resets `primaryAxisSizingMode` and `counterAxisSizingMode` to
`FIXED`. If you want HUG or FILL, set them after the resize call.

---

## 9. `SVG_VIA_CREATE_NODE`

For inline SVG content (icons, illustrations), use
`figma.createNodeFromSvg(svgString)`. It returns a Frame containing Vector
children that you append like any other node.

---

## 10. `EFFECT_REQUIRES_VISIBLE`

Each entry in the `effects` array must have `visible: true` and
`blendMode: "NORMAL"` (or another mode). Without them, the effect is
silently disabled.

---

## 11. `PARENT_LAYOUT_BEFORE_CHILDREN`

Set `parent.layoutMode = "VERTICAL"` (or HORIZONTAL) **before** appending
children that need `layoutSizingHorizontal = "FILL"`. Changing layoutMode
after children are present makes sizing recalculation unreliable.

---

## 12. `TEXT_NEEDS_OWN_FONT`

Text nodes do **not** inherit font from their parent Frame in Figma.
Every `figma.createText()` must explicitly set `fontName` and `fontSize`.

---

## 13. `RETURN_IDS`

Every `use_figma` script must `return { createdNodeIds: [...] }`. The agent
that invoked it needs the IDs to reference, validate, or clean up the
created nodes in subsequent calls.

---

## Why these aren't documentation, they're code

The whole reason this file exists alongside `auto-layout-rules.ts` (and not
just inside a CLAUDE.md or a README) is that **rules in prose drift, rules
in code drift less**. The `emit-use-figma.ts` emitter respects every rule
above by construction — and its tests verify the script string contains
the right patterns (font load order, FILL after appendChild, etc).

If the bridge ever generates a script that violates one of these rules,
either:
- The rule is wrong (Figma API changed) — update the rule + emitter + tests
- The emitter has a bug — fix the emitter, re-run tests

There is no third option of "the agent forgot this time."
