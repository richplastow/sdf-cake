---
title: Cast shadows overhaul
description: Replaces the shadow march with Inigo Quilez's clamped-step soft shadow, started off the surface along its normal and skipped on faces turned from the light, to remove the stringy and banded shadow artefacts and cut the frame time they cost.
type: plan
---

## Context

- Delivers clean cast shadows on every cake, at every view, and a cheaper
  frame where shadows cost the most: `lightShareAt()` in
  `docs/src/raymarch/fragment.js` is rewritten, and nothing else in the
  shading changes.
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
- Keeps [Plan 03](../done/03-frame-budget.md)'s bound: the shadow march
  still ends where its ray leaves the cake's two cylinders, grown by a
  margin beyond which nothing can lower the share.
- Rests on r187's `RE_Direct_Physical()` scaling each light by
  `saturate(dot(normal, direction))`
  ([lights_physical_pars_fragment.glsl.js](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js),
  checked 2026-11-26), so a face turned from the light gets none of it
  whatever its shadow share.
- Depends on [Plan 09](../done/09-candle-flames.md), whose candles and
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
   the surface, often just inside it, and the present start, 2 mm along
   the light, still lies inside wherever the light grazes the surface, as
   it does along a candle's side and across a wavy, irregular top. The
   sample then reads `d < SURFACE_EPSILON_METERS` and returns full
   shadow: the terraced bands. `SHADOW_NORMAL_OFFSET_METERS` is 0.001,
   ten times the surface epsilon and the irregularity's amplitude on
   `#artemis-offering`, so the start clears a wavy surface. Consequence: a
   caster thinner than 1 mm beside the point cannot shadow it, which
   nothing in a cake is.
3. **The light size `SHADOW_LIGHT_SIZE` is 0.04, unitless**: the ratio of
   penumbra width to distance from the caster, 1 / 24 of the present
   `SHADOW_SOFTNESS`, so the cheesecake's shadow edge, which the Lead
   Developer judged about right, keeps its width. Consequence: the bound's
   margin becomes `SHADOW_LIGHT_SIZE * SHADOW_MAX_DISTANCE_METERS`, 20 mm,
   by the same argument as the present `SHADOW_BOUND_MARGIN_METERS`
   comment: outside the grown cylinders `h` is at least the margin, so
   `h / (w * t)` is at least 1 and cannot lower the share.
4. **The step clamps are `SHADOW_MIN_STEP_METERS` 0.0005 and
   `SHADOW_MAX_STEP_METERS` 0.025**, the article's 0.005 and 0.5 scaled to
   a scene whose shadows reach 0.5 m. Why: the least step bounds a crawl
   along a face at 48 steps to 24 mm, more than the margin, and is half a
   wick's diameter, so a wick cannot be skipped; the most keeps samples
   dense enough that a penumbra's darkest point is not stepped over.
   Consequence: a flake thinner than 0.5 mm can be stepped over by a
   shadow ray, and its shadow is lost, which no view shows at 1 px per
   CSS px. Both are tuning values, to revisit at Manual QA if a wick's or
   a sprinkle's shadow shows gaps.
5. **A face turned from the light pays no shadow march.** In `shadeAt()`,
   where `dot(normal, directionToLight) <= 0.0`, the share is 0.0 without
   marching. Why: `RE_Direct_Physical()` multiplies the light by
   `saturate(dotNL)`, 0 there, so the output is identical and about half
   the cake's pixels, every side and underside turned from the key,
   drop up to 48 field reads. Consequence: none visible.
6. **`MAX_SHADOW_STEPS` stays 48 and `SHADOW_MAX_DISTANCE_METERS` 0.5.**
   The early break on full shadow and the clamped step make the budget
   spend less, so neither needs raising; a march that runs out returns
   the share it reached, which the smoothstep still maps to 0 to 1.
7. **Performance is measured, not gated**, by
   [Plan 03's frame-time snippet](../done/03-frame-budget.md#manual-qa)
   on `#artemis-offering` at the view at load and at the oblique view from
   above, against the live site at the same window size, and once more
   with the shadow march switched off by a local, reverted edit, so the
   shadows' own cost is known. No toggle ships: a uniform read per pixel
   only to measure would be a lever nobody uses.

## Steps

### Step 1: Rewrite the shadow march

Changes `docs/src/raymarch/fragment.js`: the shadow constants, the margin,
`lightShareAt()` and its comment, and the call in `shadeAt()`, which now
passes the normal. Arguments A-Z: `directionToLight`, `hidden`, `normal`,
`p`. The function's comment cites the article's URL and names the four
Decisions above as the reasons for the form.

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
- It should lower the frame time on `#artemis-offering` or leave it at
  the display's limit (Manual QA 8).

**Agent QA**

- Do: `node --check docs/src/raymarch/fragment.js`
  Expect: nothing printed.
- Do: `grep -c "dot(normal, directionToLight)" docs/src/raymarch/fragment.js`
  Expect: `1`.
- Do: `shasum -a 256 docs/vendor/three/build/*.js`
  Expect: the "as stored" checksums in `docs/vendor/three/README.md`.

## Done when

Every Agent QA block passing, the agent checks in CLAUDE.md passing, and
`#cheesecake` from above and `#artemis-offering` from an oblique view
above both showing smooth shadows with no stray lines, bands or terraces,
in a console with no error, warning or shader log.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#cheesecake` in Chrome on the M4 MacBook with the
dev tools console open, and hard-reload. Keep the live site,
`https://richplastow.com/sdf-cake/`, in a second window of the same size
for the comparisons. The frame-time snippet is
[Plan 03's](../done/03-frame-budget.md#manual-qa).

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
5. **Do:** Reload at `#chocolate-drip`, `#black-forest`, `#victoria-sponge`
   and `#cheesecake` in turn, turning each and looking at the cut.
   - **Expect:** Each as on the live site: the candle's shadow on the
     chocolate cake, the plate whole on the floor of each cut, the jam and
     the coulis still translucent with the part beneath showing through,
     and no new speckle.
6. **Do:** On `#black-forest`, turn to the side away from the light, then
   slowly turn it back into the light.
   - **Expect:** The dark side is as dark as on the live site, and the
     line where light meets dark moves smoothly, with no hard seam, step
     or speckle along it.
   - **Why:** Decision 5's skip must match `saturate(dotNL)` exactly.
7. **Do:** On `#artemis-offering`, double-click to reset the view and run
   the snippet; then at the oblique view of step 3 run it again. Repeat
   both on the live site.
   - **Expect:** Each local figure no higher than the live one at the same
     view, and recorded in the Audit entry.
8. **Do:** In `docs/src/raymarch/fragment.js` set `MAX_SHADOW_STEPS` to 0,
   reload, run the snippet at both views, then restore 48 and reload.
   - **Expect:** Two figures for a frame with no shadow march at all,
     recorded beside step 7's: the gap is what shadows still cost.
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
