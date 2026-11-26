---
title: Scorch transition
description: Stops the scorch marks cycling through dozens of patterns during a cake change, by zooming the scorch noise about the cake's axis and switching its seed at once.
type: plan
---

## Context

- Delivers a calm scorch transition: as the Artemis offering becomes the
  honey cake, its scorch patches fade and drift, never flicker through
  pattern after pattern.
- The cause, read in scorchAt() in `docs/src/sdf/crumb.js` on
  2026-11-26 and not yet confirmed in the browser: the noise is sampled
  at `(p + (slot + seed) × SCORCH_SLOT_SHIFT_METERS) / cell`, with the
  shift 1.37 m. `scorchScale` springs from the Artemis offering's 1.5 to
  the flatbread's 1, so the cell springs from 45 mm to 30 mm, and a
  point 1.37 m from the noise's origin slides through 15 cells on the
  way, 46 cells in slot 2, every cell a new pattern. The seed is 0 on
  both cakes, so it is not the cause here; but `scorchSeed` is in
  `LAYER_SURFACE_KEYS` in `docs/src/motion/cake-motion.js`, sprung and
  then rounded by writeCakeUniforms(), so two cakes with different seeds
  would cycle the same way.
- Builds on [Plan 10](../done/10-presentation-prep.md), which added the
  scorch; feeds nothing, and depends on no plan after it.

## Decisions

1. **The shift is in cells, after the division.** The noise is sampled at
   `p / cell + (slot + seed) × SCORCH_SLOT_SHIFT_CELLS`, with
   `SCORCH_SLOT_SHIFT_CELLS` 37, a whole number of cells, so each slot
   and seed still has its own region of the noise, and the variety noise
   shifts the same way. A scale change then zooms the pattern about the
   cake's axis: a point on the pancake's rim, 90 mm out, moves one cell
   as the scale springs from 1.5 to 1, a drift rather than a cycle.
   `SCORCH_SLOT_SHIFT_METERS` goes. The patterns change, since the shift
   changes, and are tuned again by eye only if a cake looks worse.
2. **The seed switches at once.** `scorchSeed` leaves
   `LAYER_SURFACE_KEYS`; retargetParts() copies it in for a present
   layer, as it copies the inclusion weights, so a seed never passes
   through the whole numbers between two cakes'.
3. **No performance step.** No work is added per sample.

## Steps

### Step 1: Shift in cells and switch the seed

- `docs/src/sdf/crumb.js`: `SCORCH_SLOT_SHIFT_CELLS`; scorchAt() shifts
  in cells, and valueNoise() takes its point in cells or a new entry
  does.
- `docs/src/motion/cake-motion.js`: `scorchSeed` out of the surface
  keys and copied in retargetParts().
- It should fade and drift the scorch, never cycle it, from the Artemis
  offering to the honey cake (Manual QA 1).
- It should scorch stacked breads differently (Manual QA 2).
- It should switch a seed at once (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES.find((x) => x.id === "pancake"); const cake = () => ({ ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }); const m = createCakeMotion(cake()); const next = cake(); next.layers[0].scorchSeed = 5; retargetCakeMotion(m, next, { reducedMotion: false }); stepCakeMotion(m, 0.25); console.log(m.values.layers[0].scorchSeed);'`
- Expect: `5`, exactly, 0.25 s after the change.
- Do: `grep -c "SCORCH_SLOT_SHIFT_METERS" docs/src/sdf/crumb.js`
- Expect: `0`.
- Do: `node --check docs/src/sdf/crumb.js && node --check docs/src/motion/cake-motion.js`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

The Agent QA block passes, the CLAUDE.md agent checks pass, and the walk
from `#artemis-offering` to `#pepionkh-honey-cake` shows no cycling
scorch.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#artemis-offering` in Chrome with the dev tools
console open, and hard-reload. Every step also expects no error, warning
or shader log in the console.

1. **Do:** Press Up until the cake is whole, then Left to walk back to
   `#pepionkh-honey-cake`, slowly, and watch the top layer's scorch.
   - **Expect:** The patches fade, drift and regroup over the change;
     at no point does the pattern flicker from one arrangement to
     another.
2. **Do:** On `#pepionkh-honey-cake`, press Up until both breads show,
   and look at the top of the lower bread where the cut exposes it.
   - **Expect:** Its scorch differs from the upper bread's.
3. **Do:** Reload at `#pancake`.
   - **Expect:** Scorch patches gathered in the middle, muted brown and
     grey, as before in character; the exact arrangement may differ.
4. **Do:** Press Right from the last step of `#pancake` to walk to
   `#pepionkh-honey-cake`.
   - **Expect:** As step 1, with no cycling.

## Audit

- **2026-11-26T18:12:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 15. Proposed by the agent: the cause in
  Context, the shift in cells of 37, and copying the seed as the
  inclusion weights are copied.
