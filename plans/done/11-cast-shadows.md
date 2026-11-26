---
title: Cast shadows overhaul
description: Replaces the shadow march with Inigo Quilez's clamped-step soft shadow, started off the surface along its normal and skipped on faces turned from the light, to remove the stringy and banded shadow artefacts and, as expected, cut the frame time they cost.
type: plan
---

## Context

- Delivers clean cast shadows on every cake, at every view, and is
  expected to cheapen the frame where shadows cost the most, which
  [Decision 7](#decisions) measures without gating: `lightShareAt()` in
  `docs/src/raymarch/fragment.js` is rewritten, and shadow rays read
  their own form of the field ([Decision 8](#decisions)); nothing else in
  the shading changes.
- Needed because shadows now show artefacts everywhere: stray contour
  lines in the cheesecake's penumbra on its plate, seen from above, and
  stringy, terraced bands across the top of `#artemis-offering` and along
  its candles at an oblique view from above, where the frame rate also
  drops. Each has a cause in the present march (see
  [Decisions](#decisions)), and all four are inferred from the code, not
  yet proven in the browser, so the Manual QA checks each view the Lead
  Developer reported.
- Rests on Inigo Quilez's
  [soft shadows in raymarched SDFs](https://iquilezles.org/articles/rmshadows/),
  whose newest formulation (checked 2026-11-26) takes a light size `w`,
  lets the ray carry on through the inside of a caster, clamps each step
  between a least and a most, ends once the shadow is full, and remaps
  the result through a smoothstep. The cake's field is signed inside every
  part, which that formulation needs.
- Keeps [Plan 03](./03-frame-budget.md)'s bound: the shadow march
  still ends where its ray leaves the cake's two cylinders, grown by a
  margin beyond which nothing can lower the share.
- Rests on r187's `RE_Direct_Physical()` scaling each light by
  `saturate(dot(normal, direction))`
  ([lights_physical_pars_fragment.glsl.js](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js),
  checked 2026-11-26), so a face turned from the light gets none of it
  whatever its shadow share.
- Depends on [Plan 09](./09-candle-flames.md), whose candles and
  flakes make `#artemis-offering` the dearest cake to shadow. Feeds no
  plan.

## Decisions

1. **The shadow is iq's clamped-step soft shadow.** Each step reads
   `h = cakeFieldOf(...)`, takes `share = min(share, h / (w * t))`, then
   advances `t += clamp(h, SHADOW_MIN_STEP_METERS, SHADOW_MAX_STEP_METERS)`,
   and breaks once `share < -1.0` or `t` passes the end. After the loop
   `share = max(share, -1.0)` and the return is
   `0.25 * (1 + share)^2 * (2 - share)`, the article's smoothstep over
   -1 to 1. Why: the present `min(k * d / t)` with `t += d` bands in the
   penumbra because its samples miss the darkest point between steps,
   "light leaking in patterns that match the marching steps"; the signed
   form shades the inner penumbra continuously, and the clamped step
   stops the march crawling or skipping. Consequence: there is no hit
   test and no early `return 0.0`, so the march never needs the main
   march's `IRREGULARITY_STEP_FACTOR` or the drips' factor, which it
   never applied anyway: stepping through a surface no longer matters.
2. **The ray starts off the surface along the normal.** The march runs
   from `p + normal * SHADOW_NORMAL_OFFSET_METERS`, with `t` from
   `SHADOW_MIN_STEP_METERS`, and `lightShareAt()` takes the normal as a
   parameter. Why: the hit point lies within `SURFACE_EPSILON_METERS` of
   the surface, and the present start, 2 mm along the light, still lies
   within it wherever the light grazes the surface, as it does along a
   candle's side. The sample then reads `d < SURFACE_EPSILON_METERS` and
   returns full shadow: the terraced bands. In a stand-in port of the
   march, the present start wrongly shadows 1.5 % of a candle's lit side
   at the oblique view from above, and the new one none; across the top,
   which the key light never grazes from above, the port found almost no
   such cases, so the top's bands may have a second cause, which Manual
   QA 3 shows. `SHADOW_NORMAL_OFFSET_METERS` is 0.001, ten times the
   surface epsilon: the irregularity's lumps are about 8 cm across, so a
   1 mm step along the normal clears a wavy surface at any amplitude a
   recipe may give. Consequence: a caster standing less than about 1 mm
   proud of the surface casts no shadow right beside it, as the ray starts
   above it: an untilted flake, 0.5 mm thick and a fifth embedded, loses
   its contact shadow, as it mostly does already under the present start.
3. **The light size `SHADOW_LIGHT_SIZE` is 0.027, unitless**: the ratio
   of penumbra width to distance from the caster, chosen so the
   cheesecake's shadow edge, which the Lead Developer judged about right,
   keeps its width. Why: the present linear form, `SHADOW_SOFTNESS` 24,
   spans its 10 to 90 % edge over 0.8 / 24 = 0.0333 of `d / t`; the new
   form's smoothstep over -1 to 1 spans it over 1.2168 w, so
   w = 0.8 / (24 × 1.2168) ≈ 0.027, which keeps the edge at 99 % of its
   present width. In a stand-in port on the cheesecake's plate, 0.027
   held the outer edge within ±3 % of today's, where 0.04 made it 1.43 to
   1.50 times as wide. Consequence: the bound's margin becomes
   `SHADOW_LIGHT_SIZE * SHADOW_MAX_DISTANCE_METERS`, 13.5 mm, by the same
   argument as the present `SHADOW_BOUND_MARGIN_METERS` comment: outside
   the grown cylinders `h` is at least the margin, and `t` is at most
   `SHADOW_MAX_DISTANCE_METERS`, so `h / (w * t)` is at least 1 and cannot
   lower the share.
4. **The step clamps are `SHADOW_MIN_STEP_METERS` 0.0005 and
   `SHADOW_MAX_STEP_METERS` 0.025**, the article's 0.005 and 0.5 scaled to
   a scene whose shadows reach 0.5 m. Why: the least step bounds a crawl
   along a face at 48 steps to 24 mm, more than the 13.5 mm margin, and
   is half a wick's diameter, so a wick cannot be skipped; the most keeps
   samples dense enough that a penumbra's darkest point is not stepped
   over. Consequence: a flake thinner than 0.5 mm can be stepped over by
   a shadow ray, and its shadow is lost, which no view shows at 1 px per
   CSS px. Both are tuning values, to revisit at Manual QA if a wick's or
   a sprinkle's shadow shows gaps.
5. **A face turned from the light pays no shadow march.** In `shadeAt()`,
   where `dot(normal, directionToLight) <= 0.0`, the share is 0.0 without
   marching. Why: `RE_Direct_Physical()` multiplies the light by
   `saturate(dotNL)`, 0 there, so the output is identical. Few hits face
   away, as the light rides the rig with the camera:
   [Plan 03](./03-frame-budget.md#decisions) measured 1.8 % on the
   Black Forest, and declined this skip under the old march, which ended
   such a ray at its first sample. The new march does not end on touching
   a surface: a ray started off a face turned from the light runs at the
   least step until it lies deep enough inside, about 20 steps, so in a
   stand-in port the skip saves about 4 % of the shadow steps at the view
   at load and 8 % at the oblique view from above. Consequence: none
   visible.
6. **`MAX_SHADOW_STEPS` stays 48 and `SHADOW_MAX_DISTANCE_METERS` 0.5.**
   The clamped step makes a ray that passes close to a face run out of
   its budget more often than the old march, which ended at its first
   sample within the surface epsilon: in a stand-in port, 0.4 % of hits
   at the view at load against 0.1 %, and about 10 % of the cheesecake's
   plate from above against 3 %. A march that runs out returns the share
   it reached, which the smoothstep still maps to 0 to 1, and in that
   port it differs from a 5000-step march by at most 0.05 of the light,
   against the old march's 0.21, so neither needs raising.
7. **Performance is measured, not gated**, by
   [Plan 03's frame-time snippet](./03-frame-budget.md#manual-qa)
   on `#artemis-offering` at the view at load and at the oblique view from
   above, against the live site at the same window size, and once more
   with the shadow march switched off by a local, reverted edit, so the
   shadows' own cost is known. No toggle ships: a uniform read per pixel
   only to measure would be a lever nobody uses.
8. **A shadow ray reads its own form of the field**, through a
   `bool isShadowRay` passed down cakeFieldOf(), layersField(),
   layerDistance() and decorationsField(): each layer without its
   fractal holes, every candle's flame as out, and the decorations
   without the slab shortcut that returns the distance to the slab's
   faces outside it. Why: holes 3 to 4 mm apart keep a sponge's inside
   within about 2 mm of 0, so the march never reached full shadow and let
   15 to 50 % of the light through, crawling at the least step; a flame
   casts no shadow; and the slab's faces read as near misses of a real
   caster, shading lit plate and topping in contours that moved as a
   decoration fell. Ruled by the Lead Developer at Manual QA.
   Consequence: hole pits on a lit face read as buried and go dark, which
   the Lead Developer judged fine; a shadow ray outside the slab
   evaluates every decoration, which the frame times still favour.

## Steps

### Step 1: Rewrite the shadow march

Changes `docs/src/raymarch/fragment.js`: the shadow constants, the margin,
`lightShareAt()` and its comment, and the call in `shadeAt()`, which now
passes the normal. Arguments A-Z: `directionToLight`, `hidden`, `normal`,
`p`. The bound's span is taken from the march's own origin, the offset
start, so `t` and its end are measured from one point. The function's
comment cites the article's URL and gives, in its own words, the reasons
Decisions 1 to 4 set out for the form, never naming this plan.

- It should shade the cheesecake's shadow on its plate as a smooth
  penumbra with no stray lines (Manual QA 2).
- It should show `#artemis-offering`'s top and candles clean of stringy
  or terraced bands at the oblique view (Manual QA 3).
- It should keep the shadow edge about as wide as before (Manual QA 2).
- It should keep every other cake's shadows, cut faces and translucent
  parts as they were (Manual QA 5, 6).

**Agent QA**

- Do: `node --check docs/src/raymarch/fragment.js`
  Expect: nothing printed.
- Do: `grep -c "SHADOW_SOFTNESS\|SHADOW_START_METERS" docs/src/raymarch/fragment.js`
  Expect: `0`, both constants gone with the old form.
- Do: `grep -c "SHADOW_LIGHT_SIZE\|SHADOW_MIN_STEP_METERS\|SHADOW_MAX_STEP_METERS\|SHADOW_NORMAL_OFFSET_METERS" docs/src/raymarch/fragment.js`
  Expect: at least `8`, each new constant declared and read.
- Do: `awk 'length > 80 { print FILENAME ":" FNR }' docs/src/raymarch/fragment.js`
  Expect: nothing printed.

### Step 2: Skip the march on faces turned from the light

Changes `shadeAt()` in `docs/src/raymarch/fragment.js`: inside the
directional-light loop, the share is `0.0` where
`dot(normal, directionToLight) <= 0.0`, else `lightShareAt()`'s, with a
comment naming `RE_Direct_Physical()`'s `saturate(dotNL)` as the reason
the output is unchanged.

- It should leave the side of every cake turned from the light shaded as
  before, with no bright speckle or hard seam at the terminator (Manual
  QA 6).
- It should have its frame time on `#artemis-offering` measured beside
  the live site's and recorded, as Decision 7 measures rather than gates
  it (Manual QA 7).

**Agent QA**

- Do: `node --check docs/src/raymarch/fragment.js`
  Expect: nothing printed.
- Do: `grep -c "dot(normal, directionToLight)" docs/src/raymarch/fragment.js`
  Expect: `1`.
- Do: `shasum -a 256 docs/vendor/three/build/*.js`
  Expect: the "as stored" checksums in `docs/vendor/three/README.md`.

### Step 3: Give shadow rays their own field

Added at Manual QA, by the Lead Developer's ruling ([Decision 8](#decisions)).
Changes `docs/src/sdf/cake.js`, `docs/src/sdf/layers.js` and
`docs/src/sdf/decorations.js`, and the calls to cakeFieldOf() in
`docs/src/raymarch/fragment.js`, which pass `true` from lightShareAt()
alone.

- It should cast a solid shadow from every sponge layer, with the same
  soft edge as the topping's (Manual QA 5).
- It should cast no shadow from a flame (Manual QA 4).
- It should leave lit plate and topping free of contours, while a
  decoration falls too (Manual QA 2, 3, 5).

**Agent QA**

- Do: `grep -c "isShadowRay" docs/src/sdf/cake.js docs/src/sdf/layers.js docs/src/sdf/decorations.js`
  Expect: `4`, `4` and `3`.
- Do: `grep -c "hidden, true)" docs/src/raymarch/fragment.js`
  Expect: `1`, the shadow march's read alone.

## Done when

Every Agent QA block passing, the agent checks in CLAUDE.md passing, and
`#2` (the cheesecake) from above and `#artemis-offering` from an oblique
view above both showing smooth shadows with no stray lines, bands or terraces,
in a console with no error, warning or shader log.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#2`, the cheesecake, in Chrome on the M4 MacBook
with the dev tools console open, and hard-reload. A cake's hash is its
recipe's `id` in `docs/src/cake/recipes.js`: `#1` the Black Forest, `#2`
the cheesecake, `#3` the Victoria sponge, `#4` the chocolate drip cake.
Keep the live site, `https://richplastow.com/sdf-cake/`, in a second
window of the same size for the comparisons. The frame-time snippet is
[Plan 03's](./03-frame-budget.md#manual-qa).

1. **Do:** Look at the page after the reload.
   - **Expect:** The cheesecake on its plate; no error, warning or shader
     log in the console.
2. **Do:** Drag to look straight down on the cheesecake, so its shadow
   lies on the plate beside it.
   - **Expect:** One smooth shadow with a soft edge about as wide as on
     the live site, and no stray lines, rings or contours inside the
     penumbra or across the plate.
   - **Why:** The banding of the old `min(k * d / t)` form.
3. **Do:** Reload at `#artemis-offering` and drag to an oblique view from
   above, looking down past the candles at the top of the cake.
   - **Expect:** The top is an even, lightly wavy surface with the
     candles' shadows lying across it; no stringy lines, terraces or
     contour patterns on the top or along the candles' sides.
   - **Why:** Self-shadowing from a start inside the surface.
4. **Do:** Still on `#artemis-offering`, zoom in on one candle's base and
   wick.
   - **Expect:** The candle casts a shadow on the cake, and the wick a
     thin one on the candle's top; neither shadow has gaps.
   - **Why:** Decision 4's least step must not skip a wick.
5. **Do:** Reload at `#4`, `#1`, `#3` and `#2` in turn, turning each and
   looking at the cut.
   - **Expect:** Each as on the live site: the candle's shadow on the
     chocolate cake, the plate whole on the floor of each cut, the jam and
     the coulis still translucent with the part beneath showing through,
     and no new speckle.
6. **Do:** On `#1`, the Black Forest, turn to the side away from the
   light, then slowly turn it back into the light.
   - **Expect:** The dark side is as dark as on the live site, and the
     line where light meets dark moves smoothly, with no hard seam, step
     or speckle along it.
   - **Why:** Decision 5's skip must match `saturate(dotNL)` exactly.
7. **Do:** On `#artemis-offering`, double-click to reset the view and run
   the snippet; then at the oblique view of step 3 run it again. Repeat
   both on the live site.
   - **Expect:** Four figures, each local one recorded in the Audit entry
     beside the live one at the same view. A local figure above the live
     one is reported to the Lead Developer, not a failure (Decision 7).
8. **Do:** In `docs/src/raymarch/fragment.js` set `MAX_SHADOW_STEPS` to 0,
   reload, run the snippet at both views, then restore 48 and reload.
   - **Expect:** Every lit face fully lit, and two figures for a frame
     with no shadow march, only its bound test, recorded beside step 7's:
     the gap is what shadows still cost.
9. **Do:** In the dev tools' device mode, pick a phone-sized viewport,
   portrait then landscape, on `#artemis-offering`.
   - **Expect:** The same clean shadows, and the canvas follows the
     viewport.
10. **Do:** Read the console after steps 2 to 9.
    - **Expect:** No error, warning or shader log.

## Audit

- **2026-11-26T11:25:00Z** — **drafted**: rewrite the shadow march as iq's
  clamped-step soft shadow, started along the normal, with faces turned
  from the light skipped, to fix the stray lines and terraced bands and to
  cut the frame time on `#artemis-offering`.
- **2026-11-26T13:25:20Z** — **reviewed**: Major open, not edited: Decision 3's
  `SHADOW_LIGHT_SIZE` 0.04 widens the cheesecake's plate penumbra about
  1.45 times (10 to 90 %, stand-in port), and 0.027 keeps it; fixed hash
  ids (`#2`, `#1`, `#3`, `#4`), Decision 2's offset wording and
  flake consequence, Decisions 5 and 6's reasons to measured figures,
  Step 1's bound origin and comment rule, Step 2's frame-time criterion
  and Manual QA 7 to Decision 7.
- **2026-11-26T13:26:52Z** — **ruled**: the orchestrator ruled by default,
  and the Lead Developer can overturn it: `SHADOW_LIGHT_SIZE` is 0.027,
  not 0.04, so the edge keeps its width (w = 0.8 / (24 × 1.2168)), and
  the margin is 13.5 mm; folded into Decision 3, Decision 4's crawl bound
  and the Context's frame-time expectation, which Decision 7 measures
  ungated. Set aside: 0.04 with a wider edge.
- **2026-11-26T13:30:28Z** — **implemented**: Steps 1 and 2 in
  `docs/src/raymarch/fragment.js`: new shadow constants and 13.5 mm
  margin, `lightShareAt(directionToLight, hidden, normal, p)` as iq's
  clamped-step soft shadow from the normal-offset start, bound measured
  from that start, and the skip in `shadeAt()` as a ternary, so the
  `unroll_loop` body holds no braces; Agent QA all pass (0, 10, 1, no
  long lines, checksums match), each count check failing first as
  expected (6, 0, 0); Manual QA 8 now says lit faces go fully lit and
  the bound test remains, others unchanged.
- **2026-11-26T13:30:28Z** — **verified**: agent checks pass: every
  module under `docs/src/` parses, no long lines in the changed file,
  `/` and `/src/raymarch/fragment.js` served 200 by a server started
  and stopped for the check, vendored checksums match; browser not run,
  so the GLSL is not compiled.
- **2026-11-26T13:34:16Z** — **quality-checked**: Fixed: no fix-tier
  finding; two comments in `docs/src/raymarch/fragment.js` made exact, no
  behaviour change: `SHADOW_NORMAL_OFFSET_METERS` now gives why 1 mm
  clears a wavy surface (lumps of `IRREGULARITY_WAVES_PER_METER` 40, about
  8 cm, curve it no tighter than about 10 cm at resolve.js's 2 mm cap),
  and `MIN_SPAN_DIRECTION`'s "2 mm margin" names resolve.js's
  `BOUND_MARGIN_METERS`, which the cylinder uniforms carry, so it was not
  stale; Deferred: the implemented entry's reason for the ternary is
  wrong, as r187's `unrollLoopPattern` ends only at a `}` followed by
  `#pragma unroll_loop_end`, so braces were safe, but the ternary stands;
  Verified fine: GLSL by eye (ternary float operands and precedence,
  float literals, A-Z signature and call order), the remap (1 at 1, 0 at
  -1), the bound with negative shares (samples never pass `endMeters` or
  0.5 m), `MAX_SHADOW_STEPS` 0 returning 1, the skip against r187's
  `RE_Direct_Physical()` (all direct light scaled by `dotNL`), wick
  radius 0.5 mm, no JavaScript, resource or per-frame change, Agent QA
  (0, 10, 1, no long lines, checksums), agent checks; browser not run.
- **2026-11-26T15:29:15Z** — **ruled**: at Manual QA the Lead Developer
  found `#2`'s penumbra free of contours and the candles' shadows much
  better, but sponge layers letting light through (holes keep their
  inside near 0), contours on lit plates, worse while a decoration falls,
  and `#artemis-offering` at 39.1 ms per frame against the live 31.3 ms;
  ruled, tried by eye one at a time: shadow rays read layers without
  holes (28.0 ms, sponge shadows solid), flames as out, then decorations
  without the slab shortcut (23.0 ms, every contour gone); folded in as
  Decision 8 and Step 3, Context's first line updated; `#2` 16.6 ms
  before and after, at the display's limit; Manual QA 8's figures not
  recorded.
- **2026-11-26T15:29:15Z** — **done**: the Lead Developer's manual QA
  passed: smooth, contour-free shadows on every cake, `#artemis-offering`
  at 23.0 ms per frame against the live site's 31.3 ms.
