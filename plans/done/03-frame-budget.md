---
title: The frame budget
description: Holds the heaviest cake at a steady 60 fps on the M4 by drawing a pixel per CSS pixel, bounding the cake with two cylinders, skipping parts a sample cannot reach, ending each march where nothing is left to hit, and giving a march that crawls along a face the steps to reach the cake.
type: plan
---

## Context

- Delivers a frame budget with room in it: the Black Forest, the heaviest
  cake so far, at a steady 60 fps on the M4 MacBook with a canvas about
  1000 CSS px square, and headroom for the topping, the decorations and
  the crumb that [Plan 04](../todo/04-topping.md),
  [Plan 06](../todo/06-decorations.md) and
  [Plan 08](../todo/08-crumb.md) add to the same field.
- Measured at [Plan 02](./02-plate-and-layers.md)'s Manual QA
  (Chrome on the M4, `#black-forest`, view reset, mean of 300 animation
  frames): 24.0 ms per frame at a device pixel ratio of 2, and 16.6 ms,
  every frame green in a 5 s Performance recording, at 1. A quarter of
  the pixels brought the frame to the display's limit, so the shader is
  fragment-bound.
- Rests on the levers the research measured,
  [the march's budget](../todo/01-presentation-mode-research.md#the-marchs-budget),
  [a cheap bound per part](../todo/01-presentation-mode-research.md#6-the-crumb-and-the-budget)
  and [the levers, cheapest first](../todo/01-presentation-mode-research.md#8-uniform-arrays-and-the-budget),
  and on the counts of [Decision 5](#decisions), taken in a port of the
  field as Plan 02 built it, which settle each lever here.
- The shape is what makes the levers pay: every part is a solid of
  revolution about the Y axis, a stack of near-flat discs of similar
  radius on a wide thin plate, so the field is really two-dimensional,
  stacked parts separate by height, and two flat cylinders hold the
  whole cake far more tightly than one sphere. Inigo Quilez's
  [intersectors](https://iquilezles.org/articles/intersectors/) give the
  exact ray-cylinder span.
- Depends on [Plan 02](./02-plate-and-layers.md); feeds
  [Plan 04](../todo/04-topping.md) and every plan after, each of which adds its
  parts to the field this plan makes cheaper, and
  [Plan 05](../todo/05-transitions.md), whose camera fit reads the bound this
  plan reshapes.
- Needed because every part of the field costs every pixel on every step,
  and each later plan adds parts, so the frame only gets dearer from here.
- Also fixes the grazing misses the Lead Developer found at this plan's
  manual QA: at very glancing angles the page showed through the cake, as
  a thin vertical stripe along `#victoria-sponge`'s cut and a few pixels
  along `#cheesecake`'s silhouette. They are not this plan's doing — the
  live site shows them at commit `57cd916`, before Plans 02 and 03 — but
  the Lead Developer ruled on 2026-11-25 that this plan fixes them, since
  the march's step budget is this plan's own subject
  ([Decision 7](#decisions)).

## Decisions

1. **The pixel-ratio cap is 1.** `MAX_PIXEL_RATIO` in `docs/src/main.js`
   goes from 2 to 1, so the canvas draws one device pixel per CSS pixel
   and the browser scales it to the screen. **Measured:** 24.0 ms to
   16.6 ms on the Black Forest, the display's own limit. **Derived:** the
   shader's cost at 1 is about a quarter of its cost at 2, 6 ms or less,
   which leaves about 10 ms of the 16.7 ms frame for Plans 04 to 08.
   The trade-off: on a Retina screen the silhouette, the cut's edges and
   the plate's rim show slight steps, since nothing antialiases them
   ([the research](../todo/01-presentation-mode-research.md#7-lighting-shading-and-the-silhouette));
   on the M4 they are too slight to read as jagged edges, so no
   antialiasing is built. A phone, whose ratio is 3, gains the
   most and is the most likely to need it. **A first guess:** Decisions
   2 to 4 cut the field's work per pixel about seven times (Decision 5's
   counts, 74.2 to 10.2 part evaluations), so ratio 2 may well hold 60 fps
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
     cakeField() takes every used part's bound and evaluates in full the
     part whose bound is least. It then walks the layers in slot order,
     skipping each whose bound is no nearer than the best distance so
     far, the plate's included where the plate went first; cuts the
     eaten slice from the layers' minimum, as eatenStackDistance() does
     today; and last, unless it went first, evaluates the plate, skipping
     it where its bound is no nearer than the cut stack's distance. The
     plate's gate reads the cut distance, never the best uncut one: the
     cut only raises the stack's distance, so a sample inside the cut,
     and so inside an uncut layer, would skip the plate beneath it, and a
     ray down the cut would pass through the plate. The field's value is
     then unchanged at every point (checked on 2026-11-25 in a port, at
     200,000 points a cake and cuts from 0° to 359°), so nothing on
     screen changes and no step factor is needed: a part whose bound is
     no nearer cannot be nearer. The one part evaluated first
     indexes the layer uniform arrays by a computed `int`: GLSL ES 3.00
     allows that for a `float` array, as ANGLE, the compiler behind
     Chrome's WebGL, refuses a non-constant index only for sampler,
     image, block and fragment-output arrays (its
     [ParseContext.cpp](https://raw.githubusercontent.com/google/angle/main/src/compiler/translator/ParseContext.cpp),
     read 2026-11-25, citing the spec's section 12.30), and the
     [GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)
     agrees: its issue 12.30 mandates dynamic indexing of every array but
     sampler, fragment-output and uniform-block arrays, and its section
     4.1.9 leaves only an index outside the array undefined (read
     2026-11-25).
   - **Measured** in the port of Decision 5, part evaluations per pixel
     with the cylinders of Decision 3 and the shadow ended at their
     ungrown exit (see Decision 5's part evaluations), mean over the six
     cakes: no skip 58.7; the skip in slot order, plate after the stack,
     18.3; the sample's own slot first, then outwards, 10.7; the least
     layer bound first 10.6; the layers sorted by bound,
     the most any order can give, 10.6; the least bound of all eight
     parts first, the plate included, 8.0. Order matters only for the
     first part, which is why the walk after it stays in slot order. A
     whole-stack cylinder bound tried before the layers changed nothing
     (38.0 to 38.0, on the sphere): the per-layer bounds already catch
     what it would.
   - **Consequence for later plans:** each part they add takes the same
     bound and joins the same order; a part cut with the stack, as
     [Plan 04](../todo/04-topping.md)'s topping is, joins the walk before the
     cut, so the plate's gate reads it too. Plan 08's irregularity
     displaces a layer by up to its amplitude, so that plan widens
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
   miss. A ray parallel to the axis takes the slab's test alone, and one
   level with the slab the quadratic's alone, so neither divides by
   zero; a span that ends behind the ray's origin is a miss, and one
   that starts behind it starts at 0, as for a camera inside a cylinder.
   The march starts at the entry and stops past the exit, so
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
     hypotenuse of the larger radius and half that height. It derives
     the cylinders each frame from the sprung layers and plate rather
     than springing them as resolved numbers, so a layer that overshoots
     never leaves its cylinder.
4. **The shadow march ends where its ray leaves the bound, grown by the
   shadow's reach.** lightShareAt() stops where the shadow ray from the
   hit point leaves the union of the two bounding cylinders, each grown
   in radius and at both ends by `SHADOW_BOUND_MARGIN_METERS`, or at
   `SHADOW_MAX_DISTANCE_METERS`, whichever comes first. The margin is
   defined in the shader as
   `SHADOW_MAX_DISTANCE_METERS / SHADOW_SOFTNESS`, 0.5 m ÷ 24, about
   20.8 mm, so `SHADOW_MAX_DISTANCE_METERS` stays.
   - **Exact, and why.** iq's soft shadow takes the least of
     `SHADOW_SOFTNESS * d / t` along the ray, so a ray that passes near
     the cake darkens a pixel even outside both cylinders. Every part
     lies inside its ungrown cylinder, and the cut only raises the
     stack's distance, so outside the grown cylinders the field reads at
     least the margin; with `t` at most `SHADOW_MAX_DISTANCE_METERS` the
     term is then at least 1 and cannot lower the share. No pixel's
     shading changes, and the shader's comment beside the margin gives
     this reasoning.
   - **Measured.** The ungrown cylinders' exit was not exact: in a port
     over six cakes, four views, three turns and cuts from 0° to 359°, it
     changed 0.02% to 0.3% of hit pixels by more than 1/255, by up to
     0.65 of the key light, at the thin edges of soft shadows, mostly on
     the plate beside the stack. With the margin no sampled pixel
     changed: 8,271,388 hit pixels over the six cakes, five views and
     four cuts each, from none to three quarters, the largest difference
     in light share 0 (checked in a port on 2026-11-25). Shadow steps
     per pixel, in that first mix: 8.7 as built, 1.5 at the ungrown
     exit, 4.8 at the grown one. In Decision 5's mix, the view at load:
     5.5 as built, 4.0 at the sphere's exit, 1.6 at the ungrown exit,
     3.5 at the grown one. The two mixes differ because the first adds
     views below and close to the cake, and every cut.
   - **A trap: the cake without a plate.** Its plate cylinder is all
     zeros, which the shader treats as a miss by its zero radius
     (Decision 3). The margin must not grow it into a real cylinder
     41.6 mm across: test the radius for zero before growing. The
     preferred shape is for `boundSpan()` to take the margin as a
     parameter, adding it only to a cylinder whose radius is above zero,
     with the march passing 0.0 and the shadow the margin, so one
     function builds both spans and the zero test lives in one place.
   - A skip of the shadow where the surface faces away from the light is
     also exact, but the light rides the rig with the camera, so only
     1.8% of hits face away and the skip saved 0.04 steps a pixel: not
     built.
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
   - **The part evaluations** in Decisions 2, 3 and 6 were taken with the
     shadow ended at an ungrown bound's exit, which Decision 4 rules out.
     They compare orders and bounds with like shadows, so their
     comparisons stand; the grown exit adds about 2.2 a pixel to
     the plan's chain (measured again in a port on 2026-11-25, which
     reproduced 74.2 as 74.1 and 8.0 as 8.0).
   - **The whole chain**, as built to as planned, per pixel: rays
     marched 88% to 53%; march steps 10.3 to 3.9; shadow steps 5.5 to
     3.5 (the 1.6 first measured here was at the ungrown exit, now ruled
     out); part evaluations 74.2 to 10.2, with about four bound checks
     per sample in their place; the 95th percentile of march steps on a
     hit 21 to 14. The Black Forest alone: 136.5 to 15.0 part
     evaluations.
   - **Re-measured on 2026-11-25** in a second throwaway port, written
     line for line from the GLSL as Steps 1 and 2 built it, for the
     grazing hunt of [Decision 7](#decisions): the same chain gives 10.23
     part evaluations a pixel, mean over the six cakes at the view at
     load, against the 10.2 above, so that port reproduces this plan's own
     counts. It also found the skip's value and material identical to the
     field with every part evaluated, at 840,000 points over the six cakes
     and seven cuts, and no gradient above 1.0, so no part of the field
     overestimates.
   - **A GPU runs pixels in groups**, so a group pays its slowest pixel's
     steps and evaluates a part if any of its pixels does. Sampled as
     8 × 4 tiles of 32 pixels, a first guess at the M4's group shape, the
     mean of each tile's worst pixel is 9.2 part evaluations against the
     per-pixel 8.0, and 79.2 against 74.2 as built, both with the
     ungrown shadow exit: the gain survives grouping. Manual QA 7's
     frame time is the measurement that counts.
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
     carries over. **Weighed again on 2026-11-25**, since the grazing
     misses of [Decision 7](#decisions) are a correctness reason to take
     it, and still not taken: it clears 273 of the 1,227 rays that run out
     of steps at `#victoria-sponge`'s cut seen edge-on and none at all at
     the closest zoom, where half a footprint drops back under the 0.1 mm
     floor, so Decision 7's step cap is needed either way, and with that
     cap in place it clears nothing the cap has not. Its price is real: it
     stops 22% of hits one step short, about 0.13 mm back along the ray,
     which turns the normal by 0.19° on average and changes the key
     light's share by more than 1/255 on 820 to 2,068 hit pixels a frame,
     by more than half the share on 338 to 465 of them, at soft-shadow
     edges and seams. A quarter of a footprint moves no hit at all, since
     it stays under the 0.1 mm floor out to 0.63 m of travel, which covers
     the view at load and every closer zoom, so it does nothing the cap
     does not. Worth taking only if the frame later
     needs the steps it saves, or if antialiasing is built on it. The
     trick is iq's, in
     [terrain marching](https://iquilezles.org/articles/terrainmarching/)
     — "details decay inverse-linearly with the distance, so we can make
     our error or accuracy dt linear to the distance" — and the footprint
     it would use is the one his
     [ray differentials](https://iquilezles.org/articles/filteringrm/)
     grow "proportional to the traveled distance, quite like in a cone
     tracer" (both read 2026-11-25).
   - An exhausted march counted as a hit where it stopped, when its last
     distance is under half a pixel's footprint: measured on 2026-11-25
     over both reported views and both of them at the closest zoom, with
     the footprint epsilon above in place and the cap still at 96, 0 of
     53,422 exhausted rays qualify. Their last distance is 2.0 to 41.6
     times half a footprint, because such a ray crawls at its offset from
     a face instead of closing on it, so the test would fire only if it
     were loosened until it painted a surface the march had not found.
   - A step cap of 64: Plan 08's two octaves of holes raise the 95th
     percentile of steps to 44 (measured), too close, though the
     cylinders' exit brings today's from 21 to 14. The cap in fact rises,
     to 768, for [Decision 7](#decisions)'s grazing misses; that leaves
     Plan 08's percentile where it is, since only a ray crawling along a
     face reaches past 96.
   - Over-relaxation (9% fewer steps, measured), `mediump` colour maths,
     a looser shadow epsilon and an analytic hit on the plate's flat top:
     smaller or unmeasured payoffs, each worth a measurement only if the
     frame needs it later. Over-relaxation is the one to reach for if
     [Decision 7](#decisions)'s steps ever cost too much at a grazing
     view: a ray crawling at a constant offset has every relaxed step
     accepted, so it covers the same ground in fewer of them.
   - A pixel ratio that falls from 2 to 1 only while the frame runs long:
     keeps Retina quality where the machine affords it, at the cost of a
     measurement loop and a visible switch; the fallback if open question
     1 is answered "sometimes".
   - A 30 fps cap: the fallback if later plans exhaust the budget, frame-
     rate independent motion already allowing it; not built.
7. **A march that crawls along a face gets the steps to reach the cake.**
   `MAX_MARCH_STEPS` in `docs/src/raymarch/fragment.js` goes from 96 to
   768, and nothing else about the march changes: the hit test keeps
   `SURFACE_EPSILON_METERS`, and the shadow march keeps its own 48 steps.
   This is the fix for the grazing misses the Lead Developer found at this
   plan's manual QA, which predate it (see [Context](#context)).
   - **The cause, confirmed in a port, not inferred.** A ray that runs
     almost parallel to a flat face steps by its own offset from that
     face, and that offset does not shrink, because the ray is moving
     along the face rather than towards it. It therefore needs one step
     per offset along the whole cake. Traced, the pixel at the middle of
     the frame with `#victoria-sponge`'s cut face edge-on: it enters the
     bound 2.0 mm from the top sponge, closes to 0.49 mm in three steps,
     then takes 93 steps of 0.49 to 0.57 mm, covering 53 mm in all, and
     runs out of steps 0.141 m short of its span's end; the surface it
     would have hit is 37 mm further on. The march was not converging
     slowly. It was crawling, and 96 steps bought it 53 mm of a 90 mm
     corridor.
   - **Which pixels, and where.** The cut's two faces lie 18° either side
     of +X, half of `#victoria-sponge`'s 36° cut, so the camera sits in a
     face's own plane at a turn of 252° or 288° from the view at load. At
     252°, at 1000 × 1000, 1,227 rays run out of steps and 1,207 of them
     show the page with cake on all four sides, in a stripe about five
     pixels wide down the middle of the frame, some 540 rows tall: the
     Lead Developer's "thin vertical stripe of background along the cut".
     At `#cheesecake`'s view at load, 94 rays run out of steps and 44 are
     enclosed, in short runs down each edge of the silhouette, the fullest
     columns at 92 to 94 and 905 to 907: the "few pixels along the
     silhouette". Each of the six cakes shows 25 to 94 at its standard
     view, 0 to 57 of them enclosed, 1,496 enclosed over the sixteen views
     measured.
     The worst found is the cheesecake's top seen nearly edge-on at the
     closest zoom, a 28-row band across the whole frame, 33,594 rays.
   - **What it is not.** Not the bound's exit: every one of those rays
     ends on the step limit with span left, and raising the cap alone,
     with the bound untouched, clears them. Not the cut's field either:
     the port found cakeField()'s value and material identical to the
     field with every part evaluated, at 840,000 points over the six cakes
     and seven cuts from 0° to 359.6°, and no gradient above 1.0, so
     neither wedgeDistance() nor eatenStackDistance() overestimates and
     Plan 02's 11 mm fin has not come back.
   - **Why 768.** It is where the last ray lands. On the worst view found,
     the cut edge-on at the closest zoom tilted 10° down, rays out of
     steps fall 18,810 at 96, 2,893 at 256, 871 at 384, 13 at 512, 1 at
     640 and 0 at 768. Over 720 frames of 1000 × 1000 — the six cakes,
     the turn in 30° steps, five tilts and both ends of the zoom — not one
     ray runs out of steps at 768.
   - **What it costs.** Only a crawling ray takes the steps, so the mean
     barely moves. Over the six cakes at the view at load: march steps a
     pixel 3.874 to 3.875, part evaluations over the whole chain 10.23 to
     10.23 (Decision 5's 10.2), and the mean of each 8 × 4 tile's worst
     pixel up by at most 0.04 steps. At the closest zoom with no tilt,
     identical to three decimals. The views that were broken do pay: the
     cut edge-on at the view at load, 5.084 to 5.219 march steps a pixel
     and a tile worst of 6.34 to 7.22; the same at the closest zoom tilted
     10° down, 10.348 to 11.912 and 11.50 to 16.53; the cheesecake's top
     edge-on there, 7.838 to 9.999 and 8.10 to 10.74. Manual QA 12
     measures the frame at those views, which no terminal can.
   - **Nothing else moves, by construction.** The march is step for step
     what it was for its first 96 steps, so a ray that hit still hits at
     the same distance on the same material and only a discarded ray can
     become a hit: measured over all sixteen views above, no hit moved and
     no material changed. No normal, light share or colour can therefore
     change anywhere.
   - **Consequence: the cap scales with the frame's height in pixels.** A
     crawling ray's step is about a pixel's footprint and the corridor it
     crosses is a length of the cake, so twice the pixels needs about
     twice the steps. 768 is measured at the pixel-ratio cap of 1 on a
     canvas about 1000 CSS px tall. If open question 1 raises the ratio to
     2, the cap roughly doubles with it, and Manual QA 12 must be walked
     again at that ratio before the ratio rises.
   - **Consequence for later plans.** Plan 08's holes and irregularity add
     detail, not corridors, so they leave the cap alone; a part that adds
     a flat face, such as Plan 04's topping where it is cut, adds one more
     face a ray can crawl along, which Manual QA 12 covers.
   - **A risk only the browser can settle.** 768 is a loop the shader
     compiler must handle, and this shader is GLSL ES 1.00 — it uses
     `gl_FragColor`, `texture2D` and `varying`, and `docs/src/scene/quad.js`
     sets no `glslVersion` — where a loop of constant bounds may be
     unrolled. Nothing on this machine compiles GLSL, as CLAUDE.md's agent
     checks say, so Manual QA 1 and 12 are the only check of it. If the
     compile turns slow or the log complains, 512 leaves 13
     pixels of the worst view and 640 leaves 1, at the same cost.

## Steps

### Step 1: The field in the plane of revolution, with the skip [P]

Changes `docs/src/sdf/primitives.js`: cappedConeDistance() and
roundedCappedConeDistance() take the point in the plane of revolution,
`vec2 q`, in place of p, and `revolvedPoint()` goes, with its mention in
the file's overview. Changes `docs/src/sdf/layers.js`: layersField()
takes `vec2 q`, adds `layerBoundDistance()`, and takes the best distance
so far and the slot to leave out, so cakeField() can evaluate the
nearest-bound part first and skip the rest, per Decision 2. Changes
`docs/src/sdf/plate.js`: plateField() takes q in place of its call to
`revolvedPoint()`, and `plateBoundDistance()` is added. Changes
`docs/src/sdf/cake.js`: cakeField() computes q, takes every used part's
bound, evaluates the least first, walks the layers with the skip, cuts
the stack as before, then tests the plate against the cut stack's
distance, per Decision 2. The skip of an empty slot and of a plate of
zero rim radius stays.

- It should leave every cake looking exactly as it did, from every side
  and through the cut, with the plate whole beneath the cut (Manual QA 5
  and 6).
- It should still draw no plate for the fruit cake (Manual QA 5).
- It should lower the frame time at ratio 2 (Manual QA 7).

**Agent QA**

- Do: `for f in docs/src/sdf/primitives.js docs/src/sdf/layers.js docs/src/sdf/plate.js docs/src/sdf/cake.js; do node --check "$f"; done; grep -c "layerBoundDistance(" docs/src/sdf/layers.js; grep -c "plateBoundDistance(" docs/src/sdf/plate.js docs/src/sdf/cake.js; grep -c "revolvedPoint" docs/src/sdf/plate.js docs/src/sdf/primitives.js`
- Expect: no parse error; at least 1 for `layers.js` (declared); at least
  1 each for `plate.js` (declared) and `cake.js` (called); `0` for
  `revolvedPoint` in both.
- Do: `grep -c "vec2 layersField(vec2\|vec2 plateField(vec2" docs/src/sdf/layers.js docs/src/sdf/plate.js`
- Expect: `1` for each file.

### Step 2: Two cylinders, each march's exit, and its step budget

Changes `docs/src/cake/resolve.js`: `BOUND_MARGIN_METERS` becomes
0.002, and the resolved cake carries `bounds` in place of the sphere,
per Decision 3. Changes `docs/src/sdf/cake.js`: the six bound uniforms
replace the two, in createCakeUniforms() and writeCakeUniforms().
Changes `docs/src/raymarch/fragment.js`: `sphereEntry()` becomes
`cylinderSpan()` and `boundSpan()`; march() takes the exit and stops
past it; lightShareAt() stops where its ray leaves the bound grown by
the new `SHADOW_BOUND_MARGIN_METERS`, or at
`SHADOW_MAX_DISTANCE_METERS`, which stays, per Decision 4, with the
plate's zero cylinder never grown (Decision 4's trap);
`MAX_MARCH_DISTANCE_METERS` goes. `MAX_MARCH_STEPS` goes from 96 to 768,
per Decision 7, with the comment beside it giving the crawling ray it is
for, the measurement that set it and the frame height it scales with;
`SURFACE_EPSILON_METERS` and `MAX_SHADOW_STEPS` stay as they are, so the
march's hit test and the whole shadow march are untouched.

- It should resolve the Black Forest's cylinders as Decision 3's example
  gives them, the stack's radius from the wider of each layer's two
  radii, and a cake without a plate to a plate cylinder of all zeros
  (Agent QA below).
- It should lose no hit: the silhouette stays whole from every side,
  straight above and below, and with the camera inside the bound
  (Manual QA 6, 8 and 9).
- It should leave the shading unchanged: the plate keeps the cake's
  shadow, its soft edge beside the stack as wide as before, and the side
  away from the light stays dark (Manual QA 6; Agent QA below for the
  margin).
- It should show no page background enclosed by the cake, at the cut seen
  edge-on, along a silhouette, or anywhere else, at any turn, tilt or zoom
  (Manual QA 12).
- It should change no hit the march already found: a ray that hit within
  96 steps still hits at the same distance on the same material, so no
  normal, light share or colour can move, and only a ray that was
  discarded can become a hit (Agent QA below; Manual QA 5 and 6).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const flipped = structuredClone(RECIPES[3]); flipped.layers[0].bottomRadiusMeters = 0.1; flipped.layers[0].topRadiusMeters = 0.085; const f = (c) => [c.bottomMeters, c.radiusMeters, c.topMeters].map((v) => v.toFixed(4)).join(" "); const b = (r) => resolveRecipe(r).bounds; console.log(f(b(RECIPES[4]).plate), f(b(RECIPES[4]).stack), "|", f(b(RECIPES[3]).stack), f(b(flipped).stack), "|", f(b(RECIPES[5]).plate));'`
- Expect: `-0.0070 0.1445 0.0180 -0.0020 0.0970 0.1020 | -0.0020 0.1020 0.0320 -0.0020 0.1020 0.0320 | 0.0000 0.0000 0.0000`:
  the Black Forest's plate and stack, the custard pie's stack as built
  and with its pastry's radii swapped, so the widest radius is a top
  and then a bottom, and the fruit cake's plate.
- Do: `node --check docs/src/raymarch/fragment.js && grep -c "MAX_MARCH_DISTANCE_METERS\|sphereEntry\|boundCenterYMeters\|boundRadiusMeters" docs/src/raymarch/fragment.js docs/src/sdf/cake.js docs/src/cake/resolve.js docs/src/main.js; grep -c "boundSpan(" docs/src/raymarch/fragment.js`
- Expect: no parse error; `0` for every file for the old names; at
  least 3 for `boundSpan(` (declared, and called by the march and the
  shadow).
- Do: `grep -c "SHADOW_BOUND_MARGIN_METERS" docs/src/raymarch/fragment.js; grep -c "SHADOW_MAX_DISTANCE_METERS / SHADOW_SOFTNESS" docs/src/raymarch/fragment.js`
- Expect: at least `2` (declared and used), then `1` (the margin's
  definition).
- Do: `grep -c "BoundBottomMeters\|BoundRadiusMeters\|BoundTopMeters" docs/src/sdf/cake.js`
- Expect: at least `18`: six declared in the chunk, six created and six
  written.
- Do: `grep -c "const int MAX_MARCH_STEPS = 768;" docs/src/raymarch/fragment.js; grep -c "const float SURFACE_EPSILON_METERS = 0.0001;" docs/src/raymarch/fragment.js; grep -c "const int MAX_SHADOW_STEPS = 48;" docs/src/raymarch/fragment.js`
- Expect: `1`, `1`, `1`: the step budget raised, the hit test and the
  shadow march's own budget untouched.
- Do: `grep -c "if (field.x < SURFACE_EPSILON_METERS)" docs/src/raymarch/fragment.js`
- Expect: `1`: the march's hit test is the fixed epsilon alone, since
  Decision 6 weighed a surface distance that grows with a pixel's
  footprint and did not take it, so no uniform and no new code for it
  exists.

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

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, the
Black Forest turns at a steady 60 fps on the M4, looking as it did after
Plan 02, and no page shows through any cake at any turn, tilt or zoom
(Manual QA 12).

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
     its seams, and the plate shows whole on the floor of the cut; the
     plate carries the cake's shadow, its soft edge beside the stack as
     wide as before, and the ring between the stack and the rim is lit
     and shaded as before; the side away from the light is as dark as
     before, with no bright speckles.
   - **Why:** A wrong bound drops a part or a hit; a plate tested
     against the uncut stack vanishes under the cut; the ring is where
     the two cylinders meet; a shadow ended at the ungrown cylinders
     trims the soft edge of the shadow on the plate, and a wrong shadow
     exit lights a surface the light cannot reach.
7. **Do:** Set `MAX_PIXEL_RATIO` in `docs/src/main.js` to `2`,
   hard-reload `#black-forest`, double-click to reset the view, and run
   the snippet; then zoom in fully and run it again. Restore the value to
   `1` and hard-reload.
   - **Expect:** Both below Plan 02's 24.0 ms. Note both in the plan's
     Audit entry: the reset figure ÷ 4 is about the cost at ratio 1,
     and the figures answer open question 1.
8. **Do:** On `#black-forest`, scroll in until the zoom stops, then drag
   upwards slowly, past level, until the plate's rim sits just above the
   camera and its underside starts to show; keep dragging a little up
   and down there.
   - **Expect:** The plate and the cake keep rendering whole; nothing
     vanishes or pops as the view tilts.
   - **Why:** At the closest zoom and about 16° to 22° below level, the
     camera sits inside the plate's bounding cylinder, a few millimetres
     from the plate, beside its rim and then just under it, so its rays
     start at 0; at the reset tilt it never enters either cylinder.
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

12. **Do:** In the console run
    `document.body.style.background = "cyan"`, so any gap shows as cyan
    rather than as the page's own colour. Reload at `#victoria-sponge`
    and drag slowly round until one face of the cut points straight at
    the camera, so the cut narrows to a line down the middle of the cake;
    keep the pointer held there, since a press pauses the turn, and look
    along that line from the top of the stack to the plate. Then zoom in
    fully and drag a little up and down through level, still along the
    cut, and run the frame-time snippet there. Last, reload at
    `#cheesecake`, drag round slowly and watch each edge of the
    silhouette from the plate's shadow up to the top; then zoom in fully,
    tilt until the cheesecake's top is nearly edge-on, and drag up and
    down through that angle.
    - **Expect:** No cyan anywhere inside the cake: no stripe down the
      cut, no gap along the silhouette, no band across the cake as it
      tilts. The frame-time snippet still reads about 16.7 ms. Set the
      background back with
      `document.body.style.background = ""`.
    - **Why:** These are the two views the Lead Developer found the page
      showing through, and the tilted close zoom is where the march
      crawls worst: in a port, the cut seen edge-on at the view at load
      had 1,207 pixels of background enclosed by the cake and the
      cheesecake's silhouette 44, all of which Decision 7's step budget
      clears. The frame-time reading is the one measurement of what those
      steps cost, which the terminal cannot take: the port puts the march
      at 15% to 28% more steps a pixel at those grazing views, and
      unchanged at every reset view and at the closest zoom without a
      tilt.

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
- **2026-11-25T11:29:31Z** — **reviewed**: one Major finding open, not
  fixed: Decision 4's shadow exit is not exact, since the soft shadow's
  penumbra reaches past the cylinders (measured in a port: 0.02% to 0.3%
  of hit pixels lose up to 0.65 of the key light; cylinders grown by
  5 mm for the shadow alone changed none). Minor fixes applied: the
  plate's gate reads the cut stack's distance (Decision 2, Step 1);
  the cylinder span's parallel, level and behind-origin cases
  (Decision 3); Plan 04's topping joins the walk before the cut and
  Plan 05 derives the cylinders rather than springing them; open
  question 2 folded into Decision 1; `primitives.js` added to Step 1;
  Step 1 criterion 1, Step 2 criterion 1 and both of its count and
  resolver Agent QA lines tightened; Manual QA 6 checks the plate under
  the cut and Manual QA 8 puts the camera inside the plate's cylinder.
- **2026-11-25T11:36:54Z** — **ruled**: the orchestrator ruled option
  (c) by default, in the Lead Developer's absence, on the shadow exit
  found not exact (the ungrown cylinders' exit changed up to 0.3% of hit
  pixels by up to 0.65 of the key light). Options: (a) keep the ungrown
  exit and accept the trim, 1.5 shadow steps a pixel against 8.7 as
  built; (b) grow the cylinders by 5 mm for the shadow, 3.2 steps, no
  sampled pixel changed; (c) grow them by
  `SHADOW_MAX_DISTANCE_METERS / SHADOW_SOFTNESS`, 20.8 mm, provably
  exact, 4.8 steps. Decision 4 now ends the shadow at the grown exit or
  at `SHADOW_MAX_DISTANCE_METERS`, which stays.
- **2026-11-25T11:37:41Z** — **reviewed**: folded the ruling into
  Decision 4 (the margin, its proof, the measurements and the trap of
  the plate's zero cylinder), Decision 5 (shadow steps 5.5 to 3.5, part
  evaluations 74.2 to 10.2, the Black Forest 136.5 to 15.0, re-measured
  with the grown exit) and Decision 1 (about seven times, not nine);
  checked in a port that the grown exit changes no light share on
  8,271,388 hit pixels; Step 2's text, criterion 3 and Agent QA keep
  `SHADOW_MAX_DISTANCE_METERS` and check the margin; Manual QA 6 checks
  the shadow's soft edge; no new Major finding.
- **2026-11-25T11:47:21Z** — **implemented**: Steps 1 to 3, in
  `docs/src/sdf/primitives.js`, `layers.js`, `plate.js` and `cake.js`,
  `docs/src/cake/resolve.js`, `docs/src/raymarch/fragment.js` and
  `docs/src/main.js`; every Agent QA block failed before the work and
  passes after it, the resolver line printing the expected bounds. Beyond
  the steps' text: a `layerDistance()` helper and a `stack` argument to
  layersField(), a `boundingCylinder()` helper that also zeroes the
  stack's cylinder for a cake with no layers, and the constants
  `MIN_SPAN_DIRECTION` and `NO_SPAN_METERS`; wedgeDistance() still takes
  p. In a port of the GLSL, line for line, over the six cakes and seven
  cuts: 63,000 points gave the old field's value and material exactly,
  and 96,600 rays (down and up the axis, level with the plate and the
  stack, from inside each cylinder, and from the camera's orbit) kept
  all 77,182 old hits inside the new span, with no shadow share changed;
  three grazing rays that ran out of steps from the sphere now hit.
  Manual QA 8's "Why" corrected (the camera passes under the rim); the
  rest unchanged.
- **2026-11-25T11:47:21Z** — **verified**: agent checks pass: 7 modules
  parse, no long lines, `/` and all 7 changed files served (status 200,
  by a server started for the check and stopped), vendored checksums
  match; browser not run.
- **2026-11-25T11:54:44Z** — **quality-checked**: Fixed: none at fix
  tier; first-run polish: wedgeDistance() in
  `docs/src/sdf/primitives.js` takes `vec2 xz`, with `p.xz` and
  `vec2(-p.x, p.z)` passed from eatenStackDistance() in `cake.js`, the
  same q inside it as before, so Decision 2's "the wedge alone takes
  `p.xz`" now holds; layerDistance()'s comment in `layers.js` cites the
  GLSL ES 3.00 specification (issue 12.30, section 4.1.9) and the
  index range; Decision 2's note that the spec was unverified replaced
  by what it says. Deferred: unused cappedCylinderDistance() and
  roundedCylinderDistance() in `primitives.js`, older than this plan,
  still taking a `vec3`, left for the Lead Developer to keep or remove;
  the GLSL's skip and spans have no agent check, as no tool on the
  machine runs GLSL, so Manual QA 1, 5, 6, 8 and 9 alone prove them;
  ANGLE compilation and frame times need the browser. Verified fine:
  every Agent QA block passes; the resolver line kills 9 of 10 mutants
  (margin, either radius alone, zero test, half thickness, underside,
  sweep, bottom sign, bottom not lowered), the tenth, counting unused
  slots, equivalent, as they hold no height or radius; the skip's value
  and plate gate traced exact in both orders; every dynamically indexed
  array is a `float` or `vec3` uniform, indexed only by a loop's slot or
  by `firstSlot` once it is 0 or more; a `const` from two `const`s and
  `vec2(-1.0)` are constant expressions (specification section 4.3.3);
  no identifier is a GLSL ES 3.00 reserved word but Three.js's own
  `varying`; the plate's zero cylinder is never grown; the spans'
  parallel, level, behind-origin and miss cases; Manual QA 2, 8 and 9
  against `main.js` (camera in the plate's cylinder from 15.6° to 22.3°
  below level at the closest zoom); Three.js sweep: no resource added,
  the per-frame path, motion and resize unchanged but the cap, no new
  Three.js API; agent checks: 17 modules parse, no long lines, `/` and
  the 7 changed files served (status 200, a server started and
  stopped), vendored checksums match. Browser not run.
- **2026-11-25T13:27:56Z** — **ruled**: the Lead Developer ruled during
  manual QA that Plan 03 fixes the grazing misses, a thin stripe of page
  along `#victoria-sponge`'s cut seen edge-on and a few pixels along
  `#cheesecake`'s silhouette, though they predate the plan (the live site
  shows them at `57cd916`). Confirmed in a port of the field and the
  march, line for line from the GLSL as Steps 1 and 2 built it: the cause
  is a march crawling along a flat face at its own offset from it, which
  ran out of its 96 steps 0.141 m short of the surface, and neither the
  bound's exit nor the cut's field. Added Decision 7, `MAX_MARCH_STEPS`
  from 96 to 768, measured as the step budget at which no ray runs out
  over 720 frames of 1000 × 1000; revised Decision 6's footprint-stop
  bullet with the measurements that keep it rejected, added a bullet
  rejecting an exhausted march counted as a hit (0 of 54,422 qualify),
  and noted the cap's rise beside the rejected cap of 64 and
  over-relaxation as the lever if its steps ever cost too much; added the
  re-measurement to Decision 5; extended Step 2 with the cap, two
  criteria and three Agent QA lines; added Manual QA 12 and the
  `## Done when` clause.
- **2026-11-25T13:46:46Z** — **done**: the Lead Developer's manual QA
  passed, the grazing-miss fix included; open question 1, the cap
  rising again, stays open, with the cap at 1.
