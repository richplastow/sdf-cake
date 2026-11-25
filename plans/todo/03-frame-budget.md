---
title: The frame budget
description: Holds the heaviest cake at a steady 60 fps on the M4 by drawing a pixel per CSS pixel, bounding the cake with two cylinders, skipping parts a sample cannot reach, and ending each march where nothing is left to hit.
type: plan
---

## Context

- Delivers a frame budget with room in it: the Black Forest, the heaviest
  cake so far, at a steady 60 fps on the M4 MacBook with a canvas about
  1000 CSS px square, and headroom for the topping, the decorations and
  the crumb that [Plan 04](04-topping.md),
  [Plan 06](06-decorations.md) and [Plan 08](08-crumb.md) add to the
  same field.
- Measured at [Plan 02](../done/02-plate-and-layers.md)'s Manual QA
  (Chrome on the M4, `#black-forest`, view reset, mean of 300 animation
  frames): 24.0 ms per frame at a device pixel ratio of 2, and 16.6 ms,
  every frame green in a 5 s Performance recording, at 1. A quarter of
  the pixels brought the frame to the display's limit, so the shader is
  fragment-bound.
- Rests on the levers the research measured,
  [the march's budget](01-presentation-mode-research.md#the-marchs-budget),
  [a cheap bound per part](01-presentation-mode-research.md#6-the-crumb-and-the-budget)
  and [the levers, cheapest first](01-presentation-mode-research.md#8-uniform-arrays-and-the-budget),
  and on the counts of [Decision 5](#decisions), taken in a port of the
  field as Plan 02 built it, which settle each lever here.
- The shape is what makes the levers pay: every part is a solid of
  revolution about the Y axis, a stack of near-flat discs of similar
  radius on a wide thin plate, so the field is really two-dimensional,
  stacked parts separate by height, and two flat cylinders hold the
  whole cake far more tightly than one sphere. Inigo Quilez's
  [intersectors](https://iquilezles.org/articles/intersectors/) give the
  exact ray-cylinder span.
- Depends on [Plan 02](../done/02-plate-and-layers.md); feeds
  [Plan 04](04-topping.md) and every plan after, each of which adds its
  parts to the field this plan makes cheaper, and
  [Plan 05](05-transitions.md), whose camera fit reads the bound this
  plan reshapes.
- Needed because every part of the field costs every pixel on every step,
  and each later plan adds parts, so the frame only gets dearer from here.

## Decisions

1. **The pixel-ratio cap is 1.** `MAX_PIXEL_RATIO` in `docs/src/main.js`
   goes from 2 to 1, so the canvas draws one device pixel per CSS pixel
   and the browser scales it to the screen. **Measured:** 24.0 ms to
   16.6 ms on the Black Forest, the display's own limit. **Derived:** the
   shader's cost at 1 is about a quarter of its cost at 2, 6 ms or less,
   which leaves about 10 ms of the 16.7 ms frame for Plans 04 to 08.
   The trade-off: on a Retina screen the silhouette, the cut's edges and
   the plate's rim show slight steps, since nothing antialiases them
   ([the research](01-presentation-mode-research.md#7-lighting-shading-and-the-silhouette));
   on the M4 they are very slight. A phone, whose ratio is 3, gains the
   most and is the most likely to need it. **A first guess:** Decisions
   2 to 4 cut the field's work per pixel about nine times (Decision 5's
   counts, 74.2 to 8.0 part evaluations), so ratio 2 may well hold 60 fps
   once they are in; Manual QA 7 measures it, for open question 1. The
   cap still drops here, since 1 is the only setting measured at 60 fps.
2. **The field is evaluated in the plane of revolution, and each part is
   skipped where a cheap bound shows it cannot be the nearest.**
   - **One `vec2 q = vec2(length(p.xz), p.y)` per sample.** Every part is
     a solid of revolution about the Y axis, so cakeField() computes q
     once and layersField() and plateField() take q, not p; the wedge
     alone takes `p.xz`. The cone and the segment already work in that
     plane, so this moves one `length()` out of each part into the
     caller (derived: one square root fewer per part evaluated). Plan 08's
     irregularity and holes are three-dimensional, so that plan passes p
     to the layers as well.
   - **A lower bound per part, a handful of operations.** A layer's, in
     `layerBoundDistance()` in `docs/src/sdf/layers.js`, is the greater
     of its slab's distance, `abs(q.y − centre) − halfHeight`, and its
     cylinder's, `q.x − max(bottomRadius, topRadius)`; a rounded cone
     lies wholly inside both, so neither overestimates. The plate's, in
     `plateBoundDistance()` in `docs/src/sdf/plate.js`, is the greater of
     `q.x − (rim + halfThickness)`, the distance below its underside at
     `−thickness`, and the distance above its top at `sweep + lip`, the
     extent of its stroked profile.
   - **The nearest bound goes first, then the rest in slot order.**
     cakeField() takes every used part's bound, evaluates in full the
     part whose bound is least, then walks the layers in slot order and
     the plate last, skipping each whose bound is no nearer than the best
     distance so far. The field's value is unchanged at every point, so
     nothing on screen changes and no step factor is needed: a part whose
     bound is no nearer cannot be nearer. The one part evaluated first
     indexes the layer uniform arrays by a computed `int`: GLSL ES 3.00
     allows that for a `float` array, as ANGLE, the compiler behind
     Chrome's WebGL, refuses a non-constant index only for sampler,
     image, block and fragment-output arrays (its
     [ParseContext.cpp](https://raw.githubusercontent.com/google/angle/main/src/compiler/translator/ParseContext.cpp),
     read 2026-11-25, citing the spec's section 12.30; the spec's own PDF
     could not be read here, so its wording is unverified).
   - **Measured** in the port of Decision 5, part evaluations per pixel
     with the cylinders of Decision 3 and the shadow of Decision 4, mean
     over the six cakes: no skip 58.7; the skip in slot order, plate
     after the stack, 18.3; the sample's own slot first, then outwards,
     10.7; the least layer bound first 10.6; the layers sorted by bound,
     the most any order can give, 10.6; the least bound of all eight
     parts first, the plate included, 8.0. Order matters only for the
     first part, which is why the walk after it stays in slot order. A
     whole-stack cylinder bound tried before the layers changed nothing
     (38.0 to 38.0, on the sphere): the per-layer bounds already catch
     what it would.
   - **Consequence for later plans:** each part they add takes the same
     bound and joins the same order. Plan 08's irregularity displaces a
     layer by up to its amplitude, so that plan widens
     `layerBoundDistance()` by the slot's amplitude; its holes only add
     distance and need nothing.
3. **Two bounding cylinders replace the bounding sphere.** The resolver
   gives the stack's cylinder, radius the widest layer radius, from the
   lowest layer bottom to the stack's top, and the plate's, radius the
   rim plus half the thickness, from the underside at `−thickness` to
   `sweep + lip`, each grown by `BOUND_MARGIN_METERS`, now 2 mm, which
   covers the march's own slop and nothing else; a cake without a plate
   has a plate cylinder of all zeros, no margin added, whose zero radius
   the shader treats as a miss. In `docs/src/raymarch/fragment.js`,
   `sphereEntry()` becomes
   `cylinderSpan()`, the exact entry and exit of a ray through a cylinder
   on the Y axis, the slab in y intersected with the quadratic in xz,
   after iq's capped-cylinder intersector; `boundSpan()` unions the two
   spans, the earlier entry to the later exit, and misses where both
   miss. The march starts at the entry and stops past the exit, so
   `MAX_MARCH_DISTANCE_METERS` goes as redundant. Exact: every part lies
   inside its cylinder, so no hit is lost.
   - **Measured**, per pixel, mean over the six cakes, with the skip in
     slot order: the sphere, 88% of rays marched, 7.9 march steps, 38.0
     part evaluations; one cylinder round the whole cake with a 1 cm
     margin, 67%, 6.1, 30.7; the same with a 2 mm margin, 59%, 4.9, 25.2;
     the two cylinders, 53%, 3.9, 18.3. The sphere's slack above a short
     wide cake is what the march was stepping through.
   - **The resolved cake** replaces `boundCenterYMeters` and
     `boundRadiusMeters` with `bounds`, and the uniforms follow, six
     floats named `plateBoundBottomMeters`, `plateBoundRadiusMeters`,
     `plateBoundTopMeters`, `stackBoundBottomMeters`,
     `stackBoundRadiusMeters` and `stackBoundTopMeters`, declared in
     `docs/src/sdf/cake.js`. The Black Forest's:

     ```json
     {
       "bounds": {
         "plate": {
           "bottomMeters": -0.007,
           "radiusMeters": 0.1445,
           "topMeters": 0.018
         },
         "stack": {
           "bottomMeters": -0.002,
           "radiusMeters": 0.097,
           "topMeters": 0.102
         }
       }
     }
     ```

   - **Consequence for later plans:** Plans 04, 06 and 08 grow the
     stack's cylinder by their own extents, the topping's thickness and
     pile, a candle's height, the irregularity's amplitude, where they
     now say the bound grows. Plan 05's Decision 11 fits the camera to
     the sphere's radius and springs the rig to its centre, both of which
     go: it takes instead the sphere the two cylinders imply, centred half
     way between the lower bottom and the higher top, of radius the
     hypotenuse of the larger radius and half that height, and derives
     the cylinders from the sprung values each frame, as it derives the
     sphere today.
4. **The shadow march ends where its ray leaves the bound.** Where the
   shadow ray from the hit point leaves `boundSpan()`'s union, nothing
   is left to shadow it, so lightShareAt() stops there and
   `SHADOW_MAX_DISTANCE_METERS` goes as redundant. Exact: no pixel's
   shading changes. **Measured**, shadow steps per pixel: 5.5 as built,
   4.0 at the sphere's exit, 1.6 at the two cylinders' exit, since a ray
   from the top of the stack leaves its cylinder within a step or two. A
   skip of the shadow where the surface faces away from the light is
   also exact, but the light rides the rig with the camera, so only 1.8%
   of hits face away and the skip saved 0.04 steps a pixel: not built.
5. **Measuring.** Each frame-time measurement is the mean over 300
   animation frames, by the console snippet in [Manual QA](#manual-qa),
   on the Black Forest. The display runs at 60 Hz, so at ratio 1 the
   snippet reads 16.7 ms whatever the true cost. The levers are therefore
   also measured at ratio 2, set for the measurement only, against Plan
   02's 24.0 ms; the cost at ratio 1 is about a quarter of that figure
   (derived, as the shader is fragment-bound). Measurements inform and
   never gate.
   - **The counts** quoted in Decisions 1 to 4 and 6 were measured on
     2026-11-25 in a throwaway JavaScript port of the field and the two
     marches as Plan 02 built them: the view at load (0.4 m from the
     stack's middle, 22° above it, a 35° vertical field of view, the key
     light at its rig position), a 1000 px square frame sampled at every
     seventh pixel in each direction, every count per frame pixel, the
     mean over the six recipes. The same frame turned 60° round the cake
     gave every count within 2%. The port is not kept; the method is
     here so it can be redone.
   - **The whole chain**, as built to as planned, per pixel: rays
     marched 88% to 53%; march steps 10.3 to 3.9; shadow steps 5.5 to
     1.6; part evaluations 74.2 to 8.0, with about four bound checks per
     sample in their place; the 95th percentile of march steps on a hit
     21 to 14. The Black Forest alone: 136.5 to 11.6 part evaluations.
   - **A GPU runs pixels in groups**, so a group pays its slowest pixel's
     steps and evaluates a part if any of its pixels does. Sampled as
     8 × 4 tiles of 32 pixels, a first guess at the M4's group shape, the
     mean of each tile's worst pixel is 9.2 part evaluations against the
     per-pixel 8.0, and 79.2 against 74.2 as built: the gain survives
     grouping. Manual QA 7's frame time is the measurement that counts.
6. **Levers not taken, and why.**
   - The normal from the nearest part alone, four evaluations of the part
     the hit's material id names instead of four of the field: measured
     8.0 to 7.9 part evaluations, since the skip already makes a field
     read cost about one part, and it changes the normal within 0.5 mm of
     every seam, 2.0% of hits.
   - A forward-difference normal, three field reads and the hit's own
     distance: one read fewer per hit, with a one-sided bias; not worth
     the change at this size.
   - A stop within half a pixel's footprint: the research measured 14%
     fewer steps on 240-pixel-high frames, but at 1000 px and 0.4 m half
     a pixel is 0.13 mm, barely above the 0.1 mm floor, so little of it
     carries over.
   - A step cap of 64: Plan 08's two octaves of holes raise the 95th
     percentile of steps to 44 (measured), too close, though the
     cylinders' exit brings today's from 21 to 14.
   - Over-relaxation (9% fewer steps, measured), `mediump` colour maths,
     a looser shadow epsilon and an analytic hit on the plate's flat top:
     smaller or unmeasured payoffs, each worth a measurement only if the
     frame needs it later.
   - A pixel ratio that falls from 2 to 1 only while the frame runs long:
     keeps Retina quality where the machine affords it, at the cost of a
     measurement loop and a visible switch; the fallback if open question
     1 is answered "sometimes".
   - A 30 fps cap: the fallback if later plans exhaust the budget, frame-
     rate independent motion already allowing it; not built.

## Steps

### Step 1: The field in the plane of revolution, with the skip [P]

Changes `docs/src/sdf/layers.js`: layersField() takes `vec2 q`, adds
`layerBoundDistance()`, and takes the best distance so far and the slot
to leave out, so cakeField() can evaluate the nearest-bound part first
and skip the rest, per Decision 2. Changes `docs/src/sdf/plate.js`:
plateField() takes q, `revolvedPoint()` goes, and `plateBoundDistance()`
is added. Changes `docs/src/sdf/cake.js`: cakeField() computes q,
takes every used part's bound, evaluates the least first, then the
layers and the plate with the skip, and cuts the stack as before. The
skip of an empty slot and of a plate of zero rim radius stays.

- It should leave every cake looking exactly as it did, from every side
  and through the cut (Manual QA 5 and 6).
- It should still draw no plate for the fruit cake (Manual QA 5).
- It should lower the frame time at ratio 2 (Manual QA 7).

**Agent QA**

- Do: `for f in docs/src/sdf/layers.js docs/src/sdf/plate.js docs/src/sdf/cake.js; do node --check "$f"; done; grep -c "layerBoundDistance(" docs/src/sdf/layers.js; grep -c "plateBoundDistance(" docs/src/sdf/plate.js docs/src/sdf/cake.js; grep -c "revolvedPoint" docs/src/sdf/plate.js docs/src/sdf/primitives.js`
- Expect: no parse error; at least 1 for `layers.js` (declared); at least
  1 each for `plate.js` (declared) and `cake.js` (called); `0` for
  `revolvedPoint` in both.
- Do: `grep -c "vec2 layersField(vec2\|vec2 plateField(vec2" docs/src/sdf/layers.js docs/src/sdf/plate.js`
- Expect: `1` for each file.

### Step 2: Two cylinders, and each march ended at their exit

Changes `docs/src/cake/resolve.js`: `BOUND_MARGIN_METERS` becomes
0.002, and the resolved cake carries `bounds` in place of the sphere,
per Decision 3. Changes `docs/src/sdf/cake.js`: the six bound uniforms
replace the two, in createCakeUniforms() and writeCakeUniforms().
Changes `docs/src/raymarch/fragment.js`: `sphereEntry()` becomes
`cylinderSpan()` and `boundSpan()`; march() takes the exit and stops
past it; lightShareAt() stops where its ray leaves the bound, per
Decision 4; `MAX_MARCH_DISTANCE_METERS` and
`SHADOW_MAX_DISTANCE_METERS` go.

- It should resolve the Black Forest's cylinders as Decision 3's example
  gives them, and a cake without a plate to a plate cylinder of zero
  radius (Agent QA below).
- It should lose no hit: the silhouette stays whole from every side,
  straight above and below, and with the camera inside the bound
  (Manual QA 6, 8 and 9).
- It should leave the shading unchanged: the plate keeps the cake's
  shadow and the side away from the light stays dark (Manual QA 6).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const b = resolveRecipe(RECIPES[4]).bounds; console.log([b.plate.bottomMeters, b.plate.radiusMeters, b.plate.topMeters, b.stack.bottomMeters, b.stack.radiusMeters, b.stack.topMeters].map((v) => v.toFixed(4)).join(" "), resolveRecipe(RECIPES[5]).bounds.plate.radiusMeters);'`
- Expect: `-0.0070 0.1445 0.0180 -0.0020 0.0970 0.1020 0`.
- Do: `node --check docs/src/raymarch/fragment.js && grep -c "MAX_MARCH_DISTANCE_METERS\|SHADOW_MAX_DISTANCE_METERS\|sphereEntry\|boundCenterYMeters\|boundRadiusMeters" docs/src/raymarch/fragment.js docs/src/sdf/cake.js docs/src/cake/resolve.js docs/src/main.js; grep -c "boundSpan(" docs/src/raymarch/fragment.js`
- Expect: no parse error; `0` for every file for the old names; at
  least 3 for `boundSpan(` (declared, and called by the march and the
  shadow).
- Do: `grep -c "BoundBottomMeters\|BoundRadiusMeters\|BoundTopMeters" docs/src/sdf/cake.js`
- Expect: at least `12`: six declared, six written.

### Step 3: One device pixel per CSS pixel [P]

Changes `docs/src/main.js`: `MAX_PIXEL_RATIO` becomes 1, per Decision 1,
and its comment says why. Last, so Manual QA 7's measurement at ratio 2
reads the levers' full effect.

- It should draw one device pixel per CSS pixel on a Retina screen
  (Agent QA below; Manual QA 2).
- It should hold the Black Forest at 60 fps, at the reset view and at the
  closest zoom (Manual QA 3 and 4).

**Agent QA**

- Do: `node --check docs/src/main.js && grep -c "const MAX_PIXEL_RATIO = 1;" docs/src/main.js`
- Expect: no parse error, and `1`.
- Do: `awk 'length > 80 { print FILENAME ":" FNR }' docs/src/main.js docs/src/cake/resolve.js docs/src/sdf/*.js docs/src/raymarch/fragment.js`
- Expect: nothing.

## Open questions

1. **Owner:** the Lead Developer. **Date:** 2026-11-25. Should the
   pixel-ratio cap rise again, to 1.5 or 2, if Manual QA 7 shows the
   levers holding 60 fps at ratio 2? Decision 5's counts make that
   likely. Until ruled, the cap stays at 1, the only setting measured at
   60 fps.
2. **Ruled** by the Lead Developer on 2026-11-25: no antialiasing work.
   At ratio 1 on the M4's screen the cake shows no jagged edges.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and the
Black Forest turns at a steady 60 fps on the M4, looking as it did after
Plan 02.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#black-forest` in Chrome on the M4 MacBook, with
the dev tools console open, and hard-reload. The frame-time snippet, to
paste into the console, prints the mean over 300 animation frames:

```js
{ let n = 0; const t0 = performance.now(); const f = () => ++n < 300 ? requestAnimationFrame(f) : console.log(((performance.now() - t0) / n).toFixed(1), "ms per frame"); requestAnimationFrame(f); }
```

1. **Do:** Look at the page after the reload.
   - **Expect:** The Black Forest, five layers on a china plate with a
     tenth cut out; no error, warning or shader log in the console.
2. **Do:** In the console, run
   `(c => c.width / c.clientWidth)(document.querySelector("canvas.scene"))`.
   - **Expect:** `1`, on the Retina screen, whose own ratio is 2.
3. **Do:** Double-click to reset the view, then run the snippet.
   - **Expect:** About 16.7 ms, the display's limit.
4. **Do:** Scroll in until the zoom stops, so the cake fills the canvas,
   and run the snippet again.
   - **Expect:** About 16.7 ms.
   - **Why:** The closest zoom marches the most pixels.
5. **Do:** Reload at `#victoria-sponge`, `#chocolate-drip`,
   `#cheesecake`, `#custard-pie` and `#fruit-cake` in turn, turning each.
   - **Expect:** Each looks as it did after Plan 02: every layer and seam
     present, the plate whole, no plate under the fruit cake, no speckle
     or missing pixel anywhere.
6. **Do:** On `#black-forest`, drag to look at the cut, then tilt to see
   the plate from below and from just above its rim, then look at the
   side turned away from the light, then at the ring of plate between
   the stack and the rim.
   - **Expect:** The silhouette is whole from every side; the cut shows
     its seams; the plate carries the cake's shadow, and the ring between
     the stack and the rim is lit and shaded as before; the side away
     from the light is as dark as before, with no bright speckles.
   - **Why:** A wrong bound drops a part or a hit; the ring is where the
     two cylinders meet; a wrong shadow exit lights a surface the light
     cannot reach.
7. **Do:** Set `MAX_PIXEL_RATIO` in `docs/src/main.js` to `2`,
   hard-reload `#black-forest`, double-click to reset the view, and run
   the snippet; then zoom in fully and run it again. Restore the value to
   `1` and hard-reload.
   - **Expect:** Both below Plan 02's 24.0 ms. Note both in the plan's
     Audit entry: the reset figure ÷ 4 is about the cost at ratio 1,
     and the figures answer open question 1.
8. **Do:** On `#black-forest`, zoom in until the zoom stops, then out and
   back across the last centimetre several times.
   - **Expect:** The cake keeps rendering where the camera looks; nothing
     vanishes or pops as the camera crosses into the bound.
9. **Do:** Drag downwards until the tilt stops, so the view looks
   straight down the cake's axis, then upwards until it stops, looking
   straight up from under the plate.
   - **Expect:** The cake's top and the plate's underside each fill the
     view as a whole disc, with no missing wedge or ring and no flicker
     as the view passes through level.
   - **Why:** Rays along the axis and rays level with the plate take the
     cylinder intersection's special cases.
10. **Do:** Turn on the device toolbar at 390 × 844 and reload.
    - **Expect:** The cake renders, a little softer than on the desktop,
      with no console error or warning.
11. **Do:** Turn the device toolbar off and resize the window while the
    cake turns.
    - **Expect:** The cake neither stretches nor blurs beyond the slight
      softness of ratio 1.

Looks wrong, but isn't: at ratio 1 the silhouette, the cut's edges and
the plate's rim show slight steps on a Retina screen, and a phone renders
a little softer; Decision 1 trades this for the frame time.

## Audit

- **2026-11-25T10:17:11Z** — **drafted**: the pixel-ratio cap at 1, an
  exact skip of each layer and the plate by a cheap lower bound, the march
  and the shadow march ended at the bounding sphere's exit, the shadow
  skipped where the surface faces away from the light, and measurements
  at ratio 2 against Plan 02's 24.0 ms.
- **2026-11-25T11:58:00Z** — **ruled**: the Lead Developer asked for the
  bounding sphere, the layer loop's order and every other loose bound to
  be settled by counts from a port of the field. Measured per pixel over
  the six cakes: two bounding cylinders cut rays marched from 88% to 53%
  and march steps 10.3 to 3.9; the nearest bound first, then slot order,
  cuts part evaluations 74.2 to 8.0 with the cylinders, the sample's own
  slot first measuring the same; the shadow at the cylinders' exit 5.5 to
  1.6 steps. Dropped the facing-away shadow skip (1.8% of hits) and the
  nearest-part normal (0.1 evaluation, 2% of hits changed). Added the
  field in the plane of revolution, a 2 mm margin, the six bound uniforms
  with a JSON example, a resolver Agent QA line and a straight-down and
  straight-up Manual QA step; moved the cap to the last step.
