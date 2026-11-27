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
  the shift alone slides through 15 cells on the way in slot 1, and 30
  cells in slot 2, the honey cake's top bread, every cell a new pattern.
  Slot 0, with no shift, only zooms, by under 1 cell. The seed is 0 on
  both cakes, so it is not the cause here; but `scorchSeed` is in
  `LAYER_SURFACE_KEYS` in `docs/src/motion/cake-motion.js`, sprung and
  then rounded by writeCakeUniforms(), so two cakes with different seeds
  would cycle the same way.
- Builds on [Plan 10](./10-presentation-prep.md), which added the
  scorch; feeds nothing, and depends on no plan after it.

## Decisions

1. **The shift is in cells, after the division.** The noise is sampled at
   `p / cell + (slot + seed) × SCORCH_SLOT_SHIFT_CELLS`, with
   `SCORCH_SLOT_SHIFT_CELLS` 37, a whole number of cells, so each slot
   and seed still has its own region of the noise, and the variety noise
   shifts the same way. A scale change then zooms the pattern about the
   cake's axis: a point on the Artemis offering's rim, 85 mm out, moves
   0.9 cells as the scale springs from 1.5 to 1, and one on the
   pancake's, 90 mm out, 1.5 cells as it springs from 2 to 1, a drift
   rather than a cycle. `SCORCH_SLOT_SHIFT_METERS` goes. Slot 0 with seed
   0, where the shift was and stays 0, keeps its pattern; every other
   slot's pattern changes, and is tuned again by eye only if a cake looks
   worse.
2. **The seed switches at once.** `scorchSeed` leaves
   `LAYER_SURFACE_KEYS`; retargetParts() copies it in for a present
   layer, as it copies the inclusion weights, so a seed never passes
   through the whole numbers between two cakes'.
3. **No performance step.** No work is added per sample.

## Steps

### Step 1: Shift in cells and switch the seed

- `docs/src/sdf/crumb.js`: `SCORCH_SLOT_SHIFT_CELLS`; scorchAt() shifts
  in cells, through a new entry that takes its point in cells, which
  valueNoise(p, cellMeters) calls too, so its signature stays for
  [Plan 19](19-plate-textures.md). The header comment of the scorch
  constants and scorchAt()'s comment name the new shift.
- `docs/src/motion/cake-motion.js`: `scorchSeed` out of the surface
  keys and copied in retargetParts(), for a present layer only; the
  comments on the surface keys and in retargetParts() name the seed
  beside the inclusion weights.
- It should fade and drift the scorch, never cycle it, from the Artemis
  offering to the honey cake (Manual QA 1).
- It should scorch stacked breads differently (Manual QA 2).
- It should switch a present layer's seed at once, and leave a vanishing
  layer's alone (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES.find((x) => x.id === "pancake"); const cake = () => ({ ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }); const m = createCakeMotion(cake()); const next = cake(); next.layers[0].scorchSeed = 5; retargetCakeMotion(m, next, { reducedMotion: false }); stepCakeMotion(m, 0.25); console.log(m.values.layers[0].scorchSeed);'`
- Expect: `5`, exactly, 0.25 s after the change.
- Do: the same command with `next.layers[0].scorchSeed = 5;` followed by
  `next.layers[0].heightMeters = 0;` in its place.
- Expect: `0`, a vanishing layer keeping its seed.
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
     grey, as before: the pancake is in slot 0, whose pattern does not
     change.
4. **Do:** Press Right from the last step of `#pancake` to walk to
   `#pepionkh-honey-cake`.
   - **Expect:** As step 1, with no cycling.

## Audit

- **2026-11-26T18:12:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 15. Proposed by the agent: the cause in
  Context, the shift in cells of 37, and copying the seed as the
  inclusion weights are copied.
- **2026-11-27T09:46:55Z** — **reviewed**: Minor fixes applied. Context's
  "46 cells in slot 2" corrected to 30, and slot 0 named as zoom-only.
  Decision 1's rim figure restated per recipe and slot 0 named
  unchanged. Step 1 keeps valueNoise(p, cellMeters) for Plan 19 through
  a new in-cells entry, and lists the comments to update. Agent QA gained
  a vanishing-layer line, which the mutation test showed was missing.
  Manual QA 3's Expect reworded. Agent QA line 1 prints 3.577 against
  today's code. No Major finding.
- **2026-11-27T14:27:52Z** — **implemented**: Step 1 done. crumb.js: SCORCH_SLOT_SHIFT_CELLS 37 replaces SCORCH_SLOT_SHIFT_METERS (JS and GLSL const); new valueNoiseInCells(x), which valueNoise(p, cellMeters) calls with p / cellMeters; scorchAt() samples at p / cell + (slot + seed) × shift, octave 2 at 2 × shifted, variety at shifted.zxy / 0.7; header and scorchAt() comments name the shift in cells. cake-motion.js: scorchSeed out of LAYER_SURFACE_KEYS, copied in retargetParts() for a present layer only; both comments name it. Agent QA: seed line printed 3.577 before the work, 5 after; vanishing-layer line 0; SCORCH_SLOT_SHIFT_METERS count 0; node --check silent. Manual QA unchanged: each line still matches the build.
- **2026-11-27T14:27:52Z** — **verified**: agent checks pass: 2 changed modules parse, no line over 80 columns, `/`, crumb.js, cake-motion.js and main.js served 200, vendored checksums match the README; browser not run.
- **2026-11-27T14:30:00Z** — **quality-checked**: Fixed: none; Deferred: `Math.round(layer.scorchSeed)` at cake.js line 508 is now redundant, since the seed is copied whole and never sprung, left on purpose as a guard on a non-integer recipe value; Verified fine: GLSL order (cellHash, unitOfHash before valueNoiseInCells, then valueNoise(), then scorchAt()), the unused valueNoise() is legal GLSL and kept for Plan 19, octave 2 and variety scales equal the old cell/0.5 and cell×0.7 divisions; seed path (retargetCakeMotion reduced via retargetBody, non-reduced via pendingBody then retargetBody, retargetPresence both branches, all reach retargetParts(), reduced-motion seed 7 lands at once; scorchSeed no longer a spring so step never overwrites it); float range (slot 2, scale 1: cells up to about 74 plus 5 at octave 1, 148 plus 10 at octave 2, against about 91 and 183 under the old metres shift, so ulp stays at or below 2^-14 cell and cell + 4096 stays a positive exact integer); no per-frame, disposal, resize or input change; agent checks 1 to 4 and Agent QA re-run pass; browser not run.
- **2026-11-27T14:40:18Z** — **done**: the Lead Developer’s manual QA passed (groups A to D of the orchestrated walk), with no rulings.
