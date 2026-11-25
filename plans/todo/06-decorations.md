---
title: Decorations
description: Scatters cherries, candles, orange slices, almonds, sprinkles and flakes over each cake deterministically, sits them in the topping, and makes them sink away first and fall into place last in a transition.
type: plan
---

## Context

- Delivers the fourth part of the cake: countable decorations placed
  once per cake by a seeded hash, a scattered kind drawn by a repeated
  cell, each resting on or embedded in the topping's surface, cut by the
  slice, sinking into the cake at the start of a transition and dropping
  from above at its end.
- Implements the decorations of
  [the research's architecture, sections 2 and 5](01-presentation-mode-research.md#2-the-parts-as-fields),
  with Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/)
  for the shapes and
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/) for
  the scattered kind.
- Depends on [Plan 05](../done/05-transitions.md) for the motion and the
  choreography, and on Plan 04's toppingSurfaceHeight(); feeds
  [Plan 07](07-sliders.md), whose reveal slider removes the decorations
  first.
- Needed because the recipes already list their decorations, and the
  brief's transitions end with them.

## Decisions

1. **Modules.** `docs/src/cake/place.js`, pure: placeDecorations()
   returns a recipe's countable slots, and a small integer hash seeds
   every variation. `docs/src/sdf/decorations.js` exports
   `decorationsChunk`, with decorationsField() for the slots and
   scatterField() for the repeated cell. `docs/src/cake/slots.js` gains
   `DECORATION_SLOTS`, 24, which no recipe's countable total may exceed,
   checked by the validator. The motion of the decorations lives in
   `docs/src/motion/cake-motion.js`.
2. **The kinds**, with their primitive, their nominal size, how much a
   hash varies the size either way, the greatest tilt about X and Z, and
   how deep the item sits below the surface as a fraction of its height.
   Yaw is free for every kind. Countable kinds take their colour from the
   recipe; sprinkles take theirs by hash from `SPRINKLE_PALETTE`, five
   sRGB colours: #e63946, #f4a261, #2a9d8f, #4361ee, #ffd166:

   | Kind | Primitive | Size | Vary | Tilt | Embed | Roughness |
   | --- | --- | --- | --- | --- | --- | --- |
   | cherry | sphere | radius 9 mm | 10% | 0 | 0.35 | 0.2 |
   | candle | capped cylinder | radius 4 mm, height 50 mm | 0 | 4° | 0.15 | 0.5 |
   | orangeSlice | capped cylinder, flat | radius 20 mm, height 4 mm | 10% | 8° | 0.3 | 0.5 |
   | almond | ellipsoid | 11 by 4 by 7 mm | 25% | 15° | 0.4 | 0.7 |
   | sprinkle | capsule, scattered | radius 0.8 mm, length 6 mm | 15% | 10° | 0.3 | 0.4 |
   | flake | box, scattered | 4 by 0.5 by 3 mm | 30% | 20° | 0.2 | 0.3 |

3. **The decorations per cake**, first guesses:

   | Cake | Decorations |
   | --- | --- |
   | chocolate-drip | 5 candles #9ecbf0; 80 sprinkles |
   | custard-pie | 1 cherry #b3121f |
   | black-forest | 8 cherries #b3121f; 120 flakes #3b2314 |
   | fruit-cake | 12 almonds #c89a68; 3 orange slices #f28c28 |

   The Victoria sponge and the cheesecake have none. A recipe may hold
   one scattered kind at most.
4. **Placement.** Countable kinds are placed in recipe order. A count of
   1 goes at the centre. Each further item is placed by rejection: up to
   `PLACEMENT_TRIES`, 64, candidate points from the hash in the disc of
   `TOP_INSET_FRACTION`, 0.8, of the crown's top radius less the item's
   footprint, and the candidate farthest from every item already placed,
   across kinds, wins, so later kinds take the spots that remain. The
   footprint is the item's greatest horizontal extent; two footprints
   must not overlap. The hash is seeded by the cake's id, the kind's name,
   the item's index and the try, so a cake always places the same way.
5. **A slot** carries the kind's id, its position on the top as
   `xMeters` and `zMeters`, its `footprintMeters`, a rotation as a `mat3`
   the hash makes from the yaw and tilts, a scale, a colour, a roughness
   and an embed depth. Its rest height is found in
   the shader by toppingSurfaceHeight() at its radius, less the embed
   depth, so it rides the topping as layers hang and fall, and its
   animated offset is added to that.
6. **The scattered kind** is a 2D grid over the top, of cell size the
   square root of the cap's area over the count, each cell holding one
   item jittered by up to `SCATTER_JITTER`, 0.4 of a cell, found by
   checking the nearest neighbour on each axis, four cells per sample,
   and drawn only where the cell's centre lies within the cap's radius.
   The items share one animated offset, so they fall and sink together.
7. **Uniforms**: for the slots, `decorationCount` and arrays of
   `DECORATION_SLOTS`: `decorationKinds`, `decorationOffsets` as a `vec3`
   of x, the animated height offset, and z, `decorationRotations` as
   `mat3`, `decorationScales`, `decorationColors`, `decorationRoughnesses`
   and `decorationEmbedsMeters`; for the scattered kind, `scatterKind`, 0
   for none, `scatterCellMeters`, `scatterColor`, `scatterOffsetMeters`
   and `scatterScale`. Material ids: a slot is 16 plus its index,
   sprinkles are 48 and flakes 49. A `mat3` array is flattened from
   `Matrix3` objects by r187's `WebGLUniforms.js`, which the implementer
   verifies in
   [the pinned source](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLUniforms.js)
   before relying on it.
8. **The choreography**, from the moment a cake change starts: every
   present slot sinks by `SINK_DEPTH_FACTOR`, 2.5, of its height over
   `SINK_SECONDS`, 0.4, eased out, each slot starting
   `SLOT_STAGGER_SECONDS`, 0.03, after the last, and its scale goes to 0
   as it ends; the body of the cake retargets `BODY_DELAY_SECONDS`, 0.2,
   after the start; the new cake's slots are placed and drop from
   `DROP_HEIGHT_METERS`, 0.12, above their rest, starting
   `DROP_DELAY_SECONDS`, 1.1, after the start, eased in as a fall under
   gravity, over `DROP_SECONDS`, 0.45, each slot staggered as above. The
   scattered kind sinks and drops as one, last. A change during any of
   this cancels the drops still pending and sinks whatever is present
   from where it is.
9. **Reveal** in Plan 07 uses the same sink and drop: hiding the
   decorations sinks them, showing them drops them.
10. **The bound** grows by the tallest kind present, a candle's height,
    above the topping, and the decorations are evaluated only within a
    slab from 1 cm below the topping's base to that height above it.
11. **Performance** is measured on the Black Forest, the cake with the
    most slots and a scattered kind, against Plan 05's numbers.

## Steps

### Step 1: Placement [P]

Adds `docs/src/cake/place.js` per Decisions 1, 4 and 5, and the
`DECORATION_SLOTS` check to `docs/src/cake/resolve.js`.

- It should place a count of 1 at the centre, and 2 or more without
  overlapping footprints (Agent QA below).
- It should place the same cake the same way every time (Agent QA
  below).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations } from "./docs/src/cake/place.js"; const all = RECIPES.map(placeDecorations); const pie = all[3][0]; const clear = all.every((slots) => slots.every((a, i) => slots.every((b, j) => i === j || Math.hypot(a.xMeters - b.xMeters, a.zMeters - b.zMeters) >= a.footprintMeters + b.footprintMeters))); console.log(all.map((s) => s.length).join(","), pie.xMeters, pie.zMeters, clear, JSON.stringify(all) === JSON.stringify(RECIPES.map(placeDecorations)));'`
- Expect: `0,5,0,1,8,15 0 0 true true`

### Step 2: The primitives [P]

Changes `docs/src/sdf/primitives.js`: adds the sphere, the vertical
capsule and the box, each citing its article.

- _(no observable behaviour)_ until Step 3 draws with them.

**Agent QA**

- Do: `node --check docs/src/sdf/primitives.js && grep -c "sphere\|capsule\|box" docs/src/sdf/primitives.js`
- Expect: no parse error, and a count of at least 3.

### Step 3: The decorations chunk

Adds `docs/src/sdf/decorations.js` per Decisions 2, 5, 6, 7 and 10, and
changes `docs/src/sdf/cake.js` to union the decorations with the stack
and the topping before the slice is cut, add the uniforms and the
material lookups, and write the slots.

- It should sit each item on or in the topping, never floating (Manual
  QA steps 1, 2 and 6).
- It should cut the slice through decorations (Manual QA step 3).
- It should draw sprinkles only over the cap (Manual QA step 4).

**Agent QA**

- Do: `node --check docs/src/sdf/decorations.js && node --check docs/src/sdf/cake.js && grep -c "uniform" docs/src/sdf/decorations.js`
- Expect: no parse error, and `13` uniforms as Decision 7 lists.

### Step 4: The sink and the fall

Changes `docs/src/motion/cake-motion.js` per Decisions 8 and 9, and
`docs/src/main.js` to place the new cake's slots on each change.

- It should sink the old decorations first and drop the new ones last
  (Manual QA step 5).
- It should cancel pending drops and sink what is present when
  interrupted (Manual QA step 7).

**Agent QA**

- Do: `node --check docs/src/motion/cake-motion.js && grep -c "SINK_SECONDS\|DROP_DELAY_SECONDS\|DROP_HEIGHT_METERS\|SLOT_STAGGER_SECONDS\|BODY_DELAY_SECONDS" docs/src/motion/cake-motion.js`
- Expect: no parse error, and at least `5`.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and in
the browser each decorated cake shows its decorations resting in the
topping, which sink away when the cake changes and fall into place on
the next cake, with no console error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#black-forest` in Chrome on the M4 MacBook, open
the dev tools console, and hard-reload.

1. **Do:** Let the cake turn a full lap and look at its top.
   - **Expect:** Eight red cherries spread over the cream, none at the
     centre, none touching, each a little sunk into the cream, and dark
     flakes scattered across the top only; the console is clean.
2. **Do:** Zoom in on a cherry and on a flake, from a low angle.
   - **Expect:** Each sits in the cream, with cream meeting its sides;
     none floats above the surface or is buried out of sight; the flakes
     are tilted and turned differently from one another.
3. **Do:** Drag the cut to face the camera.
   - **Expect:** A cherry or flake on the cut's edge is cut clean along
     the same face as the cake.
4. **Do:** Press Left, to the custard pie, and wait for it to settle.
   - **Expect:** One cherry sits at the centre of the piled cream.
5. **Do:** Press Right, back to the Black Forest, watching closely.
   - **Expect:** The cherry sinks into the cream and vanishes before the
     cake begins to change; once the Black Forest has nearly settled, its
     cherries drop in from above one after another and land in the cream,
     the flakes last.
6. **Do:** Press Right to the fruit cake, then Left twice to the chocolate
   cake, waiting for each to settle.
   - **Expect:** Twelve almonds and three orange slices scattered over the
     marzipan, each almond turned and tilted a little differently and
     varying in size; then five pale blue candles standing on the
     ganache, slightly tilted, with sprinkles of five colours over the
     cap and none on the bare lower sides.
7. **Do:** Press Right, and while the cherries are still falling press
   Right again.
   - **Expect:** The falling cherries sink away from where they are, and
     the next cake's decorations arrive at the end as usual; nothing
     snaps or is left floating.
8. **Do:** Press Right to the Victoria sponge.
   - **Expect:** No decorations at all, and nothing drops.
9. **Do:** With `#black-forest`, record 5 s in the Performance panel and
   compare with Plan 05's numbers.
   - **Expect:** A steady frame time; note its value in the Audit entry.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: the six kinds, the four cakes'
  decorations, deterministic placement by rejection, slots with rest
  heights from the topping's surface, the scattered cell, the sink and
  the fall with their timings, and the bound's slab.
