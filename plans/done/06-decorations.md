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
  [the research's architecture, sections 2 and 5](../todo/01-presentation-mode-research.md#2-the-parts-as-fields),
  with Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/)
  for the shapes and
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/) for
  the scattered kind.
- Depends on [Plan 05](./05-transitions.md) for the motion and the
  choreography, on [Plan 04](./04-topping.md)'s
  toppingSurfaceHeight() in `docs/src/sdf/topping.js`, and on
  [Plan 03](./03-frame-budget.md)'s bounding cylinders; feeds
  [Plan 07](../todo/07-sliders.md), whose reveal slider removes the decorations
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
   sRGB colours: #e63946, #f4a261, #2a9d8f, #4361ee, #ffd166. Each kind's
   id, for `decorationKinds` and `scatterKind`, is its row in the table,
   from 1: cherry 1, candle 2, orangeSlice 3, almond 4, sprinkle 5 and
   flake 6:

   | Kind | Primitive | Size | Vary | Tilt | Embed | Roughness |
   | --- | --- | --- | --- | --- | --- | --- |
   | cherry | sphere | radius 9 mm | 10% | 0 | 0.35 | 0.2 |
   | candle | capped cylinder | radius 4 mm, height 50 mm | 0 | 4° | 0.15 | 0.5 |
   | orangeSlice | capped cylinder, flat | radius 20 mm, height 4 mm | 10% | 8° | 0.3 | 0.5 |
   | almond | ellipsoid | 11 by 4 by 7 mm | 25% | 15° | 0.4 | 0.7 |
   | sprinkle | capsule, scattered | radius 0.8 mm, length 6 mm | 15% | 10° | 0.3 | 0.4 |
   | flake | box, scattered | 4 by 0.5 by 3 mm | 30% | 20° | 0.2 | 0.3 |

3. **The decorations per cake**, as `docs/src/cake/recipes.js` already
   holds them, which this plan does not change:

   | Cake | Decorations |
   | --- | --- |
   | chocolate-drip | 5 candles #9ecbf0; 80 sprinkles |
   | custard-pie | 1 cherry #b3121f |
   | black-forest | 8 cherries #b3121f; 120 flakes #24140b |
   | fruit-cake | 12 almonds #c89a68; 3 orange slices #f28c28 |

   The Victoria sponge and the cheesecake have none. A recipe may hold
   one scattered kind at most.
4. **Placement.** Countable kinds are placed largest nominal footprint
   first, ties in recipe order, so the smaller kinds take the gaps the
   larger leave: in recipe order, the fruit cake's twelve almonds leave
   no room for its three orange slices. A count of 1 goes at the centre.
   Each further item is placed by rejection: up to `PLACEMENT_TRIES`, 64,
   candidate points from the hash in the disc of `TOP_INSET_FRACTION`,
   0.8, of the crown's top radius less the item's footprint, and the
   candidate whose footprint lies farthest from every footprint already
   placed, across kinds, wins. The footprint is the radius, in metres, of
   the item's greatest horizontal extent from its centre; two footprints
   must not overlap. The hash is seeded by the cake's id, the kind's name,
   the item's index and the try, so a cake always places the same way.
5. **A slot** carries `kindId`, the kind's id; its position on the top,
   `xMeters` and `zMeters`; `footprintMeters`; `rotation`, a `mat3` the
   hash makes from the yaw and tilts, as nine numbers in column-major
   order, as Three.js's Matrix3 `elements` and GLSL hold them; `scale`,
   the hash's size variation, unitless; `color`, an sRGB `#rrggbb`
   string; `roughness`; and `embedMeters`, the embed depth. Its rest
   height is found in the shader by toppingSurfaceHeight() at its radius,
   less the embed depth, so it rides the topping as layers hang and fall,
   and its animated offset is added to that. The custard pie's cherry,
   with illustrative hash values:

   ```json
   {
     "color": "#b3121f",
     "embedMeters": 0.00655,
     "footprintMeters": 0.00936,
     "kindId": 1,
     "rotation": [0.8253, 0, -0.5646, 0, 1, 0, 0.5646, 0, 0.8253],
     "roughness": 0.2,
     "scale": 1.04,
     "xMeters": 0,
     "zMeters": 0
   }
   ```

6. **The scattered kind** is a 2D grid over the top, of cell size the
   square root of the cap's area over the count, each cell holding one
   item jittered by up to `SCATTER_JITTER`, 0.4 of a cell, found by
   checking the nearest neighbour on each axis, four cells per sample,
   and drawn only where the cell's centre lies within the cap's flat,
   toppingCapRadius() less toppingCapRounding(), where
   toppingSurfaceHeight() is exact. The items share one animated offset,
   so they fall and sink together.
7. **Uniforms**: for the slots, `decorationCount` and arrays of
   `DECORATION_SLOTS`: `decorationKinds`, `decorationOffsets` as a `vec3`
   of x, the animated height offset, and z, `decorationRotations` as
   `mat3`, `decorationScales`, `decorationColors`, `decorationRoughnesses`
   and `decorationEmbedsMeters`; for the scattered kind, `scatterKind`, 0
   for none, `scatterCellMeters`, `scatterColor`, `scatterOffsetMeters`
   and `scatterScale`. Material ids: a slot is 16 plus its index,
   sprinkles are 48 and flakes 49. A `mat3` array uniform takes either an
   array of Matrix3, which r187's
   [`WebGLUniforms.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLUniforms.js)
   flattens by each one's toArray() in setValueM3Array(), or a
   Float32Array of nine numbers per slot, column-major, which it passes
   to `uniformMatrix3fv` unchanged.
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
   from where it is. Under reduced motion, as Plan 05's springs do,
   nothing sinks, waits or drops: the new cake's decorations stand at
   rest at once.
9. **Reveal** in Plan 07 uses the same sink and drop: hiding the
   decorations sinks them, showing them drops them.
10. **The bound.** Plan 03's stack cylinder, as writeCakeBounds() in
    `docs/src/cake/resolve.js` writes it for the resolved cake and for
    the motion's values every frame, grows at the top by the height of
    the tallest kind the cake holds, at its greatest size, so the
    camera's fit, which reads the same cylinders, frames the
    decorations at rest. The march's copy, the `stackBoundTopMeters`
    uniform that writeCakeUniforms() writes, also rises by the greatest
    current drop offset above rest, so the bound never clips a falling
    item, while the camera's fit ignores the drop. The decorations are
    evaluated only within a slab from 1 cm below the topping's base up
    to `stackBoundTopMeters`.
11. **Performance** is measured on the Black Forest, the cake with the
    most slots and a scattered kind, by Plan 03's frame-time snippet at
    the view at load and fully zoomed in, against the live site,
    `https://richplastow.com/sdf-cake/#black-forest`, which runs Plan 05
    without decorations, at the same window size. Plan 05 recorded no
    frame time.

## Steps

### Step 1: Placement [P]

Adds `docs/src/cake/place.js` per Decisions 1, 4 and 5, and the
`DECORATION_SLOTS` check to `docs/src/cake/resolve.js`.

- It should place a count of 1 at the centre, and 2 or more without
  overlapping footprints (Agent QA below).
- It should place the same cake the same way every time (Agent QA
  below).
- It should flag a recipe whose countable total passes
  `DECORATION_SLOTS`, and pass every recipe in `recipes.js` (Agent QA
  below).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations } from "./docs/src/cake/place.js"; const all = RECIPES.map(placeDecorations); const pie = all[3][0]; const clear = all.every((slots) => slots.every((a, i) => slots.every((b, j) => i === j || Math.hypot(a.xMeters - b.xMeters, a.zMeters - b.zMeters) >= a.footprintMeters + b.footprintMeters))); console.log(all.map((s) => s.length).join(","), pie.xMeters, pie.zMeters, clear, JSON.stringify(all) === JSON.stringify(RECIPES.map(placeDecorations)));'`
- Expect: `0,5,0,1,8,15 0 0 true true`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; const many = { ...RECIPES[4], decorations: [{ kind: "cherry", count: 25, color: "#b3121f" }] }; console.log(validateRecipe(many).length, RECIPES.every((recipe) => validateRecipe(recipe).length === 0));'`
- Expect: `1 true` (before this step, `0 true`).

### Step 2: The primitives [P]

Changes `docs/src/sdf/primitives.js`: adds the sphere, the vertical
capsule, the box and the ellipsoid, each citing its article. iq's
sdEllipsoid is a bound, not exact, so its comment says so; the capped
cylinder the candle and the orange slice need is already there.

- _(no observable behaviour)_ until Step 3 draws with them.

**Agent QA**

- Do: `node --check docs/src/sdf/primitives.js && grep -ci "sphere\|capsule\|box\|ellipsoid" docs/src/sdf/primitives.js`
- Expect: no parse error, and a count of at least 4.

### Step 3: The decorations chunk

Adds `docs/src/sdf/decorations.js` per Decisions 2, 5, 6, 7 and 10, and
changes `docs/src/sdf/cake.js` to union the decorations with the stack
and the topping before the slice is cut, add the uniforms and the
material lookups, and write the slots and the raised march bound;
writeCakeBounds() in `docs/src/cake/resolve.js` to grow the stack's
cylinder per Decision 10; `docs/src/raymarch/fragment.js` so only the
topping's own id, 8, takes the translucent path, since every decoration
id is above it; and `docs/src/main.js` to place the loaded cake's slots,
at rest.

- It should sit each item on or in the topping, never floating (Manual
  QA steps 1, 2 and 6).
- It should cut the slice through decorations (Manual QA step 3).
- It should draw sprinkles only over the cap (Manual QA step 4).

**Agent QA**

- Do: `node --check docs/src/sdf/decorations.js && node --check docs/src/sdf/cake.js && node --check docs/src/raymarch/fragment.js && node --check docs/src/main.js && grep -c "^ *uniform " docs/src/sdf/decorations.js`
- Expect: no parse error, and `13` uniform declarations as Decision 7
  lists.

### Step 4: The sink and the fall

Changes `docs/src/motion/cake-motion.js` per Decisions 8 and 9, and
`docs/src/main.js` to place the new cake's slots on each change.

- It should sink the old decorations first and drop the new ones last
  (Manual QA step 5).
- It should cancel pending drops and sink what is present when
  interrupted (Manual QA step 7).
- It should show the new cake's decorations at rest at once under
  reduced motion (Manual QA step 11).

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
the dev tools console, and hard-reload. Plan 03's frame-time snippet,
to paste into the console, prints the mean over 300 animation frames:

```js
{ let n = 0; const t0 = performance.now(); const f = () => ++n < 300 ? requestAnimationFrame(f) : console.log(((performance.now() - t0) / n).toFixed(1), "ms per frame"); requestAnimationFrame(f); }
```

1. **Do:** Let the cake turn a full lap and look at its top.
   - **Expect:** Eight red cherries spread over the cream, none
     touching, each a little sunk into the cream, and dark flakes
     scattered across the top only; the console is clean.
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
   - **Expect:** The cherry starts sinking into the cream and shrinking
     a moment before the cake begins to change, and is gone within half a
     second; about a second after the press, as the Black Forest nears
     its shape, its cherries drop in from above one after another and
     land in the cream, the flakes last, all at once. A sinking item on
     the cut's edge may show briefly in the cut face.
6. **Do:** Press Right to the fruit cake, then Right twice, past the
   Victoria sponge, to the chocolate cake, waiting for each to settle.
   - **Expect:** Twelve almonds and three orange slices scattered over the
     marzipan, none touching, each almond turned and tilted a little
     differently and varying in size; then five pale blue candles
     standing on the ganache, slightly tilted, with sprinkles of five
     colours over the cap and none on the bare lower sides.
7. **Do:** Press Right twice, to the custard pie, waiting for it to
   settle; then press Right, and while the Black Forest's cherries are
   still falling press Right again.
   - **Expect:** The falling cherries sink away from where they are, and
     the fruit cake's decorations arrive at the end as usual; nothing
     snaps or is left floating.
8. **Do:** Press Right to the Victoria sponge.
   - **Expect:** No decorations at all, and nothing drops.
9. **Do:** Reload `#black-forest`, double-click to reset the view, and
   run the snippet; zoom in until the zoom stops and run it again. Do the
   same on `https://richplastow.com/sdf-cake/#black-forest`, which has no
   decorations, at the same window size.
   - **Expect:** About 16.7 ms, the display's limit, at both views on
     both sites; note all four figures in the Audit entry.
10. **Do:** In the dev tools device toolbar, pick a phone-sized viewport
    (iPhone 14, 390 × 844), reload `#black-forest`, and tap the right
    arrow button.
    - **Expect:** The whole cake fits the view with its cherries and
      flakes; they sink and the fruit cake's decorations drop in as on
      the desktop; the console stays clean.
11. **Do:** Turn on reduced motion in macOS Accessibility settings,
    reload `#custard-pie` at the desktop size, press Right, then turn
    reduced motion off again.
    - **Expect:** The Black Forest appears at once with its cherries and
      flakes at rest on its top, and nothing sinks or drops.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: the six kinds, the four cakes'
  decorations, deterministic placement by rejection, slots with rest
  heights from the topping's surface, the scattered cell, the sink and
  the fall with their timings, and the bound's slab.
- **2026-11-25T20:39:56Z** — **reviewed**: no Major; reconciled with
  Plans 03 to 05's code. Placement now largest footprint first (a sketch
  in recipe order overlapped the fruit cake's slices and almonds),
  footprint defined as a radius; kind ids, slot JSON, flake colour
  #24140b from recipes.js; scatter held to the cap's flat; mat3 arrays
  verified in r187; reduced motion; Decision 10 on Plan 03's cylinders
  with the drop's lift in the march's copy only; Decision 11 against the
  live site. Step 1 gains a validator criterion and line, Step 2 the
  ellipsoid, Step 3 resolve.js, fragment.js and main.js and a stricter
  uniform count, Step 4 a reduced-motion criterion; Manual QA 6, 7 and
  9 fixed, 10 (phone) and 11 (reduced motion) added.
- **2026-11-25T20:52:51Z** — **implemented**: Steps 1 to 4. New
  `docs/src/cake/place.js` (the one kind table, `SPRINKLE_PALETTE`,
  placeDecorations(), placeScatter()) and `docs/src/sdf/decorations.js`
  (13 uniforms, kind tables and sprinkle colours templated in, slots and
  a 2 x 2 scatter clamped to a bound); `slots.js` gains
  `DECORATION_SLOTS`; `resolve.js` the validator check and a
  `decorationHeightMeters` argument to writeCakeBounds();
  `primitives.js` box, ellipsoid, sphere and vertical capsule; `cake.js`
  the union before the cut (with and without the topping), material
  lookups, uniforms, writer and lifted march bound; `fragment.js` the
  translucent path for id 8 alone and the point passed to
  cakeAlbedoOf(); `cake-motion.js` the sink, the drop and
  `BODY_DELAY_SECONDS`; `main.js` resolveCake(). Agent QA: Step 1
  `0,5,0,1,8,15 0 0 true true` and `1 true`; Step 2 count 14; Step 3
  13 uniforms; Step 4 count 24, all parsing. Manual QA 1 (no "none at
  the centre": one Black Forest cherry lies 10 mm off it) and 5 (timing
  and the cut face) changed.
- **2026-11-25T20:52:51Z** — **verified**: agent checks pass: 9 changed
  modules parse, no line over 80 columns, `/` and every changed file
  served 200 by a server started and stopped for the check, vendored
  checksums match; browser not run, so no shader compile, render or
  frame time was checked.
- **2026-11-25T20:56:15Z** — **quality-checked**: Fixed: none.
  Deferred: fragment uniform budget, about 216 vectors for the
  decorations alone before packing, over WebGL 2's floor of 224 with the
  layers, scalars and lights, so a link failure is possible on a GPU at
  that floor (pack the four float arrays into one `vec4` array, and the
  rotations as quaternions, if a phone fails); `ellipsoidDistance()`
  called "needs no step factor" from the article's word "bound", not
  measured; per-kind tuning and the candle's sink in the cut face, the
  bug-fix round after Plan 08. Verified fine: the decorations' GLSL as
  templated by node (kind tables, sprinkle colours, kind distance lines),
  lowbias32's uint and int shifts, `uvec2` keys, int uniform loop break,
  const and uniform array indexing, `vec3 * mat3`, declaration order
  across the primitives, topping, cake and decorations chunks, every
  caller of cakeAlbedoOf() and the material id ranges; stepDecorations(),
  stepItem() and writeDecorationUniforms() allocate nothing; Agent QA
  steps 1 to 4 and the agent checks pass.
- **2026-11-25T21:20:48Z** — **done**: the Lead Developer’s manual QA
  passed, every group of the run’s walk; moved to `plans/done/`.
