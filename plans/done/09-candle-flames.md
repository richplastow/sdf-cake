---
title: Candle flames
description: Gives every candle a black wick and a small emissive flame that lights a moment after the candle lands, puffs out as it sinks, and flickers and gutters on its own timeline.
type: plan
---

## Context

- Delivers lit candles: a black wick on each candle, a flickering flame
  on each wick that is not a light source, lit shortly after the candle
  lands and put out as it sinks, with no two candles in step.
- Extends [Plan 06](./06-decorations.md)'s candle kind, its slots and
  its sink and drop, and shades the flame as an emissive term outside
  Three.js's lighting, as `meshphysical.glsl.js` adds
  `totalEmissiveRadiance` after the lights
  ([r187 source](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/shaders/ShaderLib/meshphysical.glsl.js)).
  The flame is iq's [ellipsoid](https://iquilezles.org/articles/distfunctions/),
  a bound as Plan 06 notes.
- Depends on [Plan 08](./08-crumb.md), done: its inclusions take
  material ids 50 to 52, found from the point hit inside a layer and
  never returned by the field; feeds nothing.
- Needed because the chocolate cake's candles stand unlit, and a
  birthday cake's candles burn.

## Decisions

1. **Modules.** `docs/src/cake/place.js` gives the candle kind its wick
   and flame height and each slot its share of a scatter in time;
   `docs/src/sdf/decorations.js` draws the wick and the flame and gives
   them their materials; `docs/src/sdf/cake.js` packs the flame into the
   offsets and routes the new material ids; `docs/src/raymarch/fragment.js`
   shades a flame hit; `docs/src/motion/cake-motion.js` lights and puts
   out each flame; `docs/src/main.js` runs the flicker clock.
2. **The wick** is a capped cylinder of `WICK_RADIUS_METERS`, 0.5 mm, and
   `WICK_HEIGHT_METERS`, 6 mm, standing from the centre of the candle's
   top in the candle's own frame, so it tilts with the candle. Its
   colour is `WICK_COLOR`, #1a1410, and its roughness `WICK_ROUGHNESS`,
   0.9. Its material id is `MATERIAL_WICK_FIRST`, 64, plus the slot, 64
   to 87, which decorationAlbedoOf() and decorationRoughnessOf() map
   back to the slot; ids 50 to 52 are Plan 08's inclusions, so the wicks
   and flames start above them.
3. **The flame** is an ellipsoid of semi-axes `FLAME_RADIUS_METERS`,
   2.5 mm, by `FLAME_HALF_HEIGHT_METERS`, 6 mm, in the candle's frame,
   its base at the wick's top, every axis scaled by the slot's flame, 0
   out to 1 lit, so a flame at 0 is skipped and costs nothing. Its
   material id is `MATERIAL_FLAME_FIRST`, 96, plus the slot, 96 to 119.
   A flame hit is not shaded by shadeAt() and reads no normal: main()
   writes flameRadianceAt() instead, `FLAME_RADIANCE`, 2.5, in linear
   space before tone mapping, times a mix from `FLAME_BASE_COLOR`,
   #fff3c4, at the flame's base to `FLAME_TIP_COLOR`, #ff8c1a, at its
   tip, by the hit's height in the flame. First guesses, to tune in
   Manual QA. The flame lights nothing, as agreed: no light is added.
4. **The crown.** The candle row of `DECORATION_KINDS` gains
   `crownMeters`, 20 mm, the wick plus the flame at its tallest flicker,
   which greatestHeightMeters() and boundingRadiusMeters() add to the
   candle's height and bounding radius, so the slab, the stack bound and
   the camera's fit of Plan 06's Decision 10 cover the flame, and the
   reach test skips no flame. A kind without the field has a crown of 0.
5. **The flicker** runs in the shader from one uniform, `flameSeconds`,
   which `main.js` advances by the frame's delta, whether or not the
   cake is held, and wraps at `FLAME_CLOCK_WRAP_SECONDS`, 3600, so a float stays
   precise; the wrap is a one-frame phase jump an hour in. Each
   candle's timeline is its own: a phase of a full turn and a rate
   factor between 1 − `FLICKER_RATE_VARY`, 0.15, and 1 + it, both from
   lowbias32() of the slot index. The flame's height factor is 1 +
   `FLICKER_AMPLITUDE`, 0.12, times a sine at `FLICKER_RATE_HERTZ`, 9,
   less `GUTTER_DEPTH`, 0.35, times the eighth power of the positive
   half of a sine at `GUTTER_RATE_HERTZ`, 1.3, so each flame shimmers
   and dips briefly about once a second; its centre sways by
   `FLAME_SWAY_METERS`, 1.2 mm, on a sine at `FLICKER_RATE_HERTZ` in x
   and at `GUTTER_RATE_HERTZ` in z. Under reduced motion `main.js` does
   not advance the clock, so a lit flame stands still, as the cake does.
6. **Uniforms.** `decorationOffsets` becomes a `vec4` per slot: x, the
   animated height offset, z and the flame, 0 to 1, so the flame adds no
   uniform vector; `flameSeconds` adds one. The writer's array grows to
   four numbers per slot. Plan 06's deferred uniform budget is otherwise
   unchanged.
7. **The choreography.** Each slot gains `cueFraction`, 0 to 1 from the
   placement hash, its share of `FLAME_SCATTER_SECONDS`, 0.5. A candle's
   sink starts at its cue, cueFraction times the scatter, in place of
   Plan 06's slot stagger, and its flame goes out from the sink's start
   over `FLAME_OUT_SECONDS`, 0.08: from the sink's curve, 2.5 heights
   eased out over 0.4 s with the scale shrinking, a 50 mm candle's flame
   tip at full height would pass the topping's surface 0.106 s into the
   sink (computed, not measured in the browser), so the flame is out
   first. A candle lights `FLAME_IN_SECONDS`, 0.15, from its cue after
   its landing, the end of its drop, so the five candles light over half
   a second; one placed at rest, at load or under reduced motion, is lit
   at once. Any other kind sinks and drops as before. A change during a
   lighting puts the flame out from where it is, as the sink takes the
   offset from where it is. Plan 07's reveal uses the same sink and drop,
   so hiding the decorations puts the flames out and showing them lights
   them.
8. **The item** in the motion gains `flame`, `fromFlame` and
   `flameCueSeconds`, the slot's cue fraction times
   `FLAME_SCATTER_SECONDS`, and the writer copies `flame` into the
   offsets' fourth number. A candle a moment after landing:

   ```json
   {
     "flame": 0.4,
     "flameCueSeconds": 0.16,
     "fromFlame": 0,
     "kindId": 2,
     "offsetMeters": 0,
     "phase": "resting",
     "scale": 1
   }
   ```

9. **Accepted quirks.** The flame is in the field, so it casts a faint
   soft shadow on its candle, is cut by the slice on the cut's edge, and
   keeps the candle's tilt rather than standing upright. Each would cost
   a second field flag or a world-space branch in the march's innermost
   loop, and none reads as wrong at the view at load.
10. **Performance** is measured on the chocolate cake, the only cake with
    candles, by [Plan 03's frame-time snippet](./03-frame-budget.md#manual-qa)
    against the live site, `https://richplastow.com/sdf-cake/#chocolate-drip`,
    at the same window size.

## Steps

### Step 1: The crown and the cue [P]

Changes `docs/src/cake/place.js`: the candle row gains `crownMeters` per
Decision 4, greatestHeightMeters() and boundingRadiusMeters() add it,
and placeItem() gives every slot its `cueFraction` per Decision 7.

- It should raise the candle's height and bounding radius by the crown,
  and no other kind's (Agent QA below).
- It should give each slot a cue fraction from 0 to 1, the same on every
  run (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { boundingRadiusMeters, greatestHeightMeters, kindNamed } from "./docs/src/cake/place.js"; const c = kindNamed("candle"); const h = kindNamed("cherry"); console.log(greatestHeightMeters(c).toFixed(4), boundingRadiusMeters(c).toFixed(4), greatestHeightMeters(h).toFixed(4), boundingRadiusMeters(h).toFixed(4));'`
- Expect: `0.0706 0.0450 0.0198 0.0090` (before this step,
  `0.0506 0.0250 0.0198 0.0090`).
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations } from "./docs/src/cake/place.js"; const cues = placeDecorations(RECIPES[1]).map((s) => s.cueFraction); console.log(cues.length, cues.every((c) => c >= 0 && c < 1), new Set(cues).size, JSON.stringify(cues) === JSON.stringify(placeDecorations(RECIPES[1]).map((s) => s.cueFraction)));'`
- Expect: `5 true 5 true`

### Step 2: The wick, the flame and the flicker

Changes `docs/src/sdf/decorations.js` per Decisions 2, 3 and 5: the
candle's distance returns the nearest of body, wick and flame with its
part, decorationsField() maps the part to the slot's, the wick's or the
flame's id, the albedo and roughness lookups take the new ranges, and
flameRadianceAt() and the `flameSeconds` uniform are added;
`docs/src/sdf/cake.js` per Decision 6, with `flameSeconds` added to
createCakeUniforms() (cakeAlbedoOf(), cakeRoughnessOf() and
cakeMetalnessOf() already send every id above the topping's to the
decorations, so only decorations.js's lookups learn the new ranges); `docs/src/raymarch/fragment.js` so a
flame hit takes flameRadianceAt() per Decision 3; `docs/src/main.js` to
advance and write `flameSeconds` per Decision 5. The flame is at 1 for
every resting candle until Step 3 animates it.

- It should show a black wick on every candle and a flame on every wick
  (Manual QA step 1).
- It should flicker and gutter each flame on its own timeline (Manual
  QA steps 2 and 3).
- It should keep the flame inside the bound at every view (Manual QA
  step 4).

**Agent QA**

- Do: `node --check docs/src/sdf/decorations.js && node --check docs/src/sdf/cake.js && node --check docs/src/raymarch/fragment.js && node --check docs/src/main.js && grep -c "^ *uniform " docs/src/sdf/decorations.js`
- Expect: no parse error, and `14`: Plan 06's 13 and `flameSeconds`.
- Do: `grep -c "MATERIAL_WICK_FIRST\|MATERIAL_FLAME_FIRST" docs/src/sdf/decorations.js docs/src/raymarch/fragment.js && grep -c "4 \* DECORATION_SLOTS" docs/src/sdf/cake.js`
- Expect: at least `4` in decorations.js, at least `1` in fragment.js, and `1`.

### Step 3: Lighting and putting out

Changes `docs/src/motion/cake-motion.js` per Decisions 7 and 8: a
candle's sink delay from its cue, its flame put out over
`FLAME_OUT_SECONDS`, lit over `FLAME_IN_SECONDS` from its cue after
landing, and `flame` written by `docs/src/sdf/cake.js`'s writer.

- It should put the flames out one by one over half a second, each
  before its candle's top passes the topping (Manual QA step 5).
- It should light the candles one by one over half a second after they
  land (Manual QA step 6).
- It should put a lighting flame out from where it is when interrupted
  (Manual QA step 7).
- It should light a candle at once under reduced motion (Manual QA step
  11).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const cake = (i) => { const c = resolveRecipe(RECIPES[i]); c.decorations = { scatter: placeScatter(RECIPES[i]), slots: placeDecorations(RECIPES[i]) }; return c; }; const m = createCakeMotion(cake(1)); const items = () => m.values.decorations.items.slice(0, 5); const flames = () => items().map((i) => i.flame).join(","); const at = flames(); retargetCakeMotion(m, cake(3), { reducedMotion: false }); const delays = items().map((i) => i.delaySeconds); const cues = placeDecorations(RECIPES[1]).map((s) => 0.5 * s.cueFraction); stepCakeMotion(m, 0.6); const out = flames(); retargetCakeMotion(m, cake(1), { reducedMotion: false }); stepCakeMotion(m, 1.2); stepCakeMotion(m, 1.3); console.log(at, "|", new Set(delays).size, delays.every((d, i) => d >= 0 && d < 0.5 && Math.abs(d - cues[i]) < 1e-9), "|", out, "|", flames());'`
- Expect: `1,1,1,1,1 | 5 true | 0,0,0,0,0 | 1,1,1,1,1`: lit at load, five
  distinct sink cues within the scatter, each its slot's cue fraction
  times `FLAME_SCATTER_SECONDS` rather than the slot stagger, all out
  0.6 s into a change, and all lit 2.5 s into the change back, past the last landing plus the
  scatter and `FLAME_IN_SECONDS`.
- Do: `node --check docs/src/motion/cake-motion.js && grep -c "FLAME_SCATTER_SECONDS\|FLAME_OUT_SECONDS\|FLAME_IN_SECONDS" docs/src/motion/cake-motion.js`
- Expect: no parse error, and at least `3`.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and in
the browser the chocolate cake's candles carry black wicks and flames
that flicker out of step with one another, go out one by one as the
candles sink, and light one by one after they land, with no console
error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#chocolate-drip` in Chrome on the M4 MacBook,
open the dev tools console, hard-reload, and make sure reduced motion is
off in macOS Accessibility settings. Plan 03's frame-time snippet, to
paste into the console for step 9, prints the mean over 300 animation
frames:

```js
{ let n = 0; const t0 = performance.now(); const f = () => ++n < 300 ? requestAnimationFrame(f) : console.log(((performance.now() - t0) / n).toFixed(1), "ms per frame"); requestAnimationFrame(f); }
```

1. **Do:** Let the cake settle and look at its top.
   - **Expect:** Five pale blue candles, each with a short black wick
     and a small flame on it, lit from the moment the page shows them;
     the console is clean.
2. **Do:** Zoom in on one flame from a low angle.
   - **Expect:** A teardrop, yellow-white at the base shading to orange
     at the tip, that shimmers in height, sways a little, and every
     second or so dips briefly and recovers; the wick is matt black and
     leans with its candle.
3. **Do:** Zoom out so all five flames are in view and watch for ten
   seconds.
   - **Expect:** No two flames rise, sway or dip together, and none goes
     out.
   - **Why:** A shared timeline, or a flame clipped by the bound, shows
     only when several are watched at once.
4. **Do:** Drag to look at the candles from directly above, then from
   the side at the cake's rim, then zoom in until the zoom stops.
   - **Expect:** Each flame is whole at every view, never cut flat at
     its tip or sides.
   - **Why:** The crown must reach the slab and the bound.
5. **Do:** Press Right, to the cheesecake, watching the candles.
   - **Expect:** The flames puff out one after another over about half a
     second, each gone before its candle's top reaches the ganache, and
     the candles sink after them; nothing lit shows inside the cake.
6. **Do:** Press Left, back to the chocolate cake, and watch the candles
   land.
   - **Expect:** The candles drop in unlit, and each lights a moment
     after it lands, catching from small to full over a beat, so the
     five light over about half a second in no fixed order.
7. **Do:** Press Right, then Left, and while the candles are still
   lighting press Right again.
   - **Expect:** Every flame goes out from however far it had lit, and
     the candles sink; nothing snaps or stays lit.
8. **Do:** Back on the chocolate cake, press Down once, wait, then Up
   once.
   - **Expect:** The flames go out and the candles sink into the cake;
     then the candles drop back and light as in step 6.
9. **Do:** Double-click to reset the view and run the snippet; zoom in
   on a flame until the zoom stops and run it again. Do the same on
   `https://richplastow.com/sdf-cake/#chocolate-drip` at the same window
   size.
   - **Expect:** About 16.7 ms, the display's limit, at both views on
     both sites; note all four figures in the Audit entry.
10. **Do:** In the dev tools device toolbar, pick a phone-sized viewport
    (iPhone 14, 390 × 844), reload `#chocolate-drip`, and tap the right
    arrow button, then the left.
    - **Expect:** The flames show, go out and relight as on the desktop,
      and the console stays clean.
11. **Do:** Turn on reduced motion in macOS Accessibility settings,
    reload `#cheesecake` at the desktop size, press Left, then turn
    reduced motion off again.
    - **Expect:** The chocolate cake appears at once with every candle
      lit, and the flames stand still.
12. **Do:** Open `http://localhost:2222/#black-forest`, press Left, wait,
    then Right.
    - **Expect:** The cherries and flakes sink and drop as before, with
      no change to their timing or shape.
    - **Why:** The offsets uniform changed shape for every kind.

Looks wrong, but isn't: a flame throws a faint soft shadow on its own
candle; a candle on the cut's edge has its flame cut along the same face;
a flame leans with its candle's tilt (Decision 9).

## Audit

- **2026-11-25T22:36:55Z** — **drafted**: a black wick and an emissive
  ellipsoid flame per candle, the crown in the bound, the flicker from
  one clock with a hashed phase and rate per slot, the flame packed into
  the offsets, and the sink and the landing cued by a hashed share of
  half a second, the flame out before the candle passes the topping.
- **2026-11-25T23:26:44Z** — **reviewed**: claims checked against Plan 08's code (offsets a vec3 of x, height offset, z; 13 decoration uniforms; ids 50 to 52 never returned by the field) and Step 1's baseline run; Context's Plan 08 line updated, Step 2 names `flameSeconds` in createCakeUniforms() and notes the id routing already exists, Decision 5's clock runs while the cake is held, Step 3's Agent QA checks each sink delay equals its cue.
- **2026-11-25T23:32:37Z** — **implemented**: Steps 1 to 3; touched `docs/src/cake/place.js`, `docs/src/sdf/decorations.js`, `docs/src/sdf/cake.js`, `docs/src/raymarch/fragment.js`, `docs/src/motion/cake-motion.js` and `docs/src/main.js`; every Agent QA block fails first as expected and passes after (`0.0706 0.0450 0.0198 0.0090`, `5 true 5 true`, `14`, `12`/`1`/`1`, `1,1,1,1,1 | 5 true | 0,0,0,0,0 | 1,1,1,1,1`, `10`); the wick and flame are drawn by candleCrownDistance() in decorationsField()'s slot loop rather than by the kind's distance; a candle's drop keeps the slot stagger and only its sink and its lighting take the cue; Decision 8's `flameCueSeconds` is the relative cue, so its example now reads 0.16, not 1.87; Manual QA unchanged.
- **2026-11-25T23:32:37Z** — **verified**: agent checks pass: every module under `docs/src/` parses, no line over 80 columns in the six changed files, `/` and the six changed files served 200 by a server started and stopped for the check, vendored checksums match; browser not run.
- **2026-11-25T23:35:33Z** — **quality-checked**: Fixed: `decorationCentreOf()` and its local `centre` in flameRadianceAt() renamed to `decorationCenterOf()` and `center`, since identifiers use American spelling (`docs/src/sdf/decorations.js`); no fix-tier bug found. Deferred: the flame's ellipsoid at a flame value within about 1e-10 of 0 can underflow to a distance of 0 for one frame, too rare a value of the linear fade to guard; `FLAME_RADIANCE` 2.5 and the flicker's per-step cost are for the browser QA (steps 2 and 9); boundingRadiusMeters() adds the crown only to non-box kinds, harmless while only the candle has one. Verified fine: GLSL names, declaration order, vec4 swizzles, the `CANDLE_HALF_HEIGHT_METERS` template (hoisted helpers), the flame branch's two `#include`s before `return`, material-id routing of 64 to 87 and 96 to 119 through cakeAlbedoOf(), cakeRoughnessOf() and cakeMetalnessOf(), the per-frame path (no allocation; `flameSeconds` wraps at 3600), sink and lighting timing in stepItem(), the crown in the reach and slab; every Agent QA block re-run and passing; agent checks pass; browser not run.
- **2026-11-25T23:41:00Z** — **done**: the Lead Developer’s manual QA passed for the
  flames; frame times for step 9 not reported.
