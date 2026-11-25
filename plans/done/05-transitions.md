---
title: Transitions and the cake walk
description: Animates every resolved value on a spring so one cake becomes the next with layers that hang and bounce, walks the loop of cakes by the arrow keys and two arrow buttons, and keeps the camera fitted to the cake.
type: plan
---

## Context

- Delivers the motion between cakes: a damped spring per resolved value,
  a layer's bottom following the stack beneath it so upper layers hang
  and bounce, the topping's footing handed from layer to layer without a
  jump, the drips withdrawn before the layers move and run down once
  they settle, the slice angle easing, the camera fitting the cake, and
  the walk round the loop by Left and Right and by an arrow button at
  each end of the bottom bar, with the location hash kept in step. Right
  lands on the next cake with its narrowest slice and Left on the
  previous cake with its widest. A second change mid transition
  retargets from the current state.
- Implements section 3 of
  [the research's architecture](../todo/01-presentation-mode-research.md#3-presence-and-motion),
  with the spring step from Ryan Juckett's
  [Damped Springs](https://www.ryanjuckett.com/damped-springs/), and
  ports `distanceToFitSphere()` from pureland-simulator's
  `docs/src/camera/fit.js`.
- Depends on [Plan 04](04-topping.md), and on
  [Plan 03](03-frame-budget.md)'s two bounding cylinders, which
  its Decision 3 says this plan derives each frame; feeds
  [Plan 06](../todo/06-decorations.md), which adds the decorations' sink and fall
  to the choreography, and [Plan 07](../todo/07-sliders.md), which puts the
  eaten slider between the arrow buttons.
- Needed because the brief's cakes blend by tweening one recipe shape, and
  nothing animates a uniform yet.

## Decisions

1. **Modules.** `docs/src/motion/spring.js`, pure: a spring is
   `{ target, value, velocity }`, stepped by stepSpring() with a preset
   of damping ratio and frequency and a time step in seconds, by
   Juckett's closed-form step, so any frame interval lands on the same
   curve. `docs/src/motion/cake-motion.js`, pure (it imports nothing from
   `three`, so Node runs it), holds one spring per animated number of the
   resolved cake, the drips' state, and the `values` object the writer
   reads, with createCakeMotion(), retargetCakeMotion(), stepCakeMotion()
   and toppingFooting(). `docs/src/cake/walk.js`, pure, gives the next
   and previous index round the loop. `docs/src/camera/fit.js` is the
   port, taking the aspect, the vertical field of view in degrees, as
   Three.js does, and the radius. `docs/src/ui/keys.js` owns the window's
   arrow keys; `docs/src/ui/cake-arrows.js` the two buttons.
2. **Spring presets**, as frequency in hertz and damping ratio, first
   guesses to tune by eye: `LENGTH_SPRING` 1.6 Hz, 0.85, for every
   length, the coverage and the plate; `STACK_SPRING` 1.1 Hz, 0.35, for a
   layer's bottom; `COLOR_SPRING` 1.6 Hz, 1, for each colour channel,
   each roughness, the plate's metalness and the topping's translucency,
   so none of them overshoots; `CAMERA_SPRING` 1 Hz, 1.
3. **A layer's bottom** springs towards the sum of the current heights of
   the slots beneath it, each clamped at 0, recomputed every frame from
   the springs' values, not from the targets. A shrinking stack
   therefore drops the target under a layer that lags behind on the slow
   underdamped spring, which is the hang; a growing stack pushes it up
   past the target, which is the bounce.
4. **The topping's footing**, its base and its crown radius, is derived
   every frame by toppingFooting() from the written layers, never from
   the target cake and never by a test of height above 0. It folds the
   slots from the bottom up, from a base and radius of 0: each slot
   weighs `w = clamp(height ÷ FOOTING_HEIGHT_METERS, 0, 1) ×
   clamp(topRadius ÷ (FOOTING_RADIUS_RATIO × radius so far), 0, 1)`,
   the second factor 1 for the first slot; the radius moves to the slot's
   top radius by `w`, and the base to the slot's top by `w³`, so a slot
   narrower than the footing takes the radius before it lifts the base.
   `FOOTING_HEIGHT_METERS` is 0.002, half the thinnest layer any recipe
   holds, and `FOOTING_RADIUS_RATIO` is 0.9, unitless. The pile's radius
   follows from the crown radius in the shader, as Plan 04 built it.
   - **At rest it is the resolver's footing**, so a cake at rest renders
     unchanged: every used layer is at least 2 mm tall and its top radius
     at least 0.9 of the one beneath (the least is 0.976, the chocolate
     cake's ganache), so every weight is 1, and unused slots, of height
     0, weigh 0. A recipe that breaks either bound would rest on a
     blended footing; the Agent QA of Step 3 checks all six.
   - **Measured** in a port of the field, the march and these springs,
     over all 30 ordered pairs of cakes: no ray steps through the
     surface; the base moves at most 11.6 mm and the radius 16.2 mm in a
     frame at 60 Hz, each three to four times less at 240 Hz, so the
     motion is continuous; the gradient stays at or below 1; and air
     under the pile lasts at most four frames, 25 mm at worst (fruit cake
     to custard pie, at 0.22 s, as the pile crosses the gap under a
     hanging layer), 11 mm for three frames (cheesecake to Victoria
     sponge), and 3 mm or less elsewhere, against 40 to 49 mm for a
     footing sized to the target cake.
5. **A vanishing part keeps its colour**: when a slot's target height is
   0, its colour and roughness springs are not retargeted, so a layer
   never darkens as it shrinks, and a slot appearing from nothing takes
   its colour and roughness at once. The plate (rim radius 0) and the
   topping (coverage 0) do the same with their colour, roughness,
   metalness and translucency, so no part springs from or to the
   resolver's `#000000`.
6. **The slice angle** is an eased tween, smoothstep over
   `SLICE_SECONDS`, 0.6, restarted from its current value when retargeted,
   so it never overshoots into the plate.
7. **The writer clamps**: every length at 0 and below, each layer's
   bottom at 0 and below, so no layer sinks into the plate, and each
   rounding at the least of its radii and half its height, every frame,
   since an underdamped spring can pass through 0.
8. **The walk.** Right goes to the next cake in walk order with its eaten
   angle at its `minFraction`, Left to the previous with the angle at its
   `maxFraction`, wrapping at both ends, so the slice carries on in the
   direction of the press; Plan 07 refines both to the slider's step.
   The two buttons do the same. `history.replaceState()` writes the new
   cake's id as the hash, and a `hashchange` event, from the viewer
   editing the URL, starts a transition to the cake it names, at its
   `minFraction`. Key repeat is allowed: each press retargets.
9. **The arrow keys** are taken on `window` in the capture phase, with
   `preventDefault()`, so they work whatever has focus and nothing else
   in the page sees them. Up and Down are claimed here and do nothing
   until Plan 07.
10. **The buttons** are two `<button>`s in the `.controls` container,
    each holding an inline SVG chevron and an `aria-label`, "Previous
    cake" and "Next cake", with no visible text; they sit at the left and
    right ends of the bottom bar, with the gap between them for Plan 07's
    slider. Their colours, size and gap are custom properties in
    `docs/styles/main.css`.
11. **The camera** fits the sphere that
    [Plan 03's Decision 3](03-frame-budget.md) sets out: the two
    bounding cylinders are derived every frame from the written layers,
    plate and topping by the resolver's own rules, never sprung as
    resolved numbers, so a layer that overshoots never leaves its
    cylinder; the sphere is centred half way between the lower bottom and
    the higher top, of radius the hypotenuse of the larger radius and
    half that height. The camera's distance springs to
    `distanceToFitSphere()` of that radius times `FIT_MARGIN`, 1.15, with
    the viewer's zoom applied as a multiplier on top, so
    `CAMERA_DISTANCE_METERS` becomes the fit rather than a constant; the
    rig's height springs to the sphere's centre. The zoom's limits bound
    the multiplier, not the distance: they keep today's ratios,
    `MIN_CAMERA_DISTANCE_METERS` and `MAX_CAMERA_DISTANCE_METERS` over
    `CAMERA_DISTANCE_METERS` in `docs/src/main.js`, 0.375 to 3 times the
    fit, renamed as two unitless constants. The stack's cylinder grows at
    the top by the smoothing's bulge, a quarter of the thickness, as it
    already does at the side, in `docs/src/cake/resolve.js` as well, so
    the derived cylinders and the resolver's agree at rest.
12. **Reduced motion** sets every spring and tween straight to its target
    when a transition starts, the drips included, at their target
    amplitude and wave count.
13. **Nothing allocates per frame**: the springs and the `values` object
    are created once per page and retargeted in place. `values` holds
    each colour as sRGB channels from 0 to 1, parsed once from the
    recipe's `#rrggbb`, and the writer sets each uniform's colour by
    `Color.setRGB(r, g, b, SRGBColorSpace)`, which converts into the
    linear working space in place (checked in r187's `math/Color.js` and
    `math/ColorManagement.js`). `values` has the resolved cake's shape,
    with colours as channels:

    ```json
    {
      "eatenAngleRadians": 0.754,
      "layers": [
        {
          "bottomMeters": 0,
          "heightMeters": 0.025,
          "bottomRadiusMeters": 0.085,
          "topRadiusMeters": 0.085,
          "roundingMeters": 0.004,
          "color": { "r": 0.353, "g": 0.227, "b": 0.133 },
          "roughness": 0.9
        }
      ],
      "plate": {
        "baseRadiusMeters": 0.105,
        "color": { "r": 0.969, "g": 0.953, "b": 0.918 },
        "metalness": 0
      },
      "topping": {
        "baseMeters": 0.083,
        "radiusMeters": 0.085,
        "coverage": 0.8,
        "dripMeters": 0.02,
        "dripWaves": 11,
        "translucency": 0
      },
      "bounds": {
        "plate": { "bottomMeters": -0.007, "radiusMeters": 0.1345, "topMeters": 0.018 },
        "stack": { "bottomMeters": -0.002, "radiusMeters": 0.09325, "topMeters": 0.09525 }
      }
    }
    ```

    The example is trimmed: `layers` always holds `LAYER_SLOTS` entries,
    and `plate` and `topping` every field the resolver gives them.
14. **Performance** is measured during a transition against the live site,
    `https://richplastow.com/sdf-cake/`, which runs Plans 02 to 04 and not
    this plan, on the same machine, since Plan 04 recorded no frame time
    and the per-frame path now steps about eighty springs and uploads
    every uniform each frame.
15. **The drips** withdraw when a transition starts and run down once the
    layers settle, so the drip term's step factor, which holds only for
    the radii a recipe has at rest, never meets a stack in motion.
    - On retarget, the drip amplitude falls linearly from what it is to 0
      over `DRIP_WITHDRAW_SECONDS`, 0.2, while every other spring starts
      at once, with no hold. At 0, `dripWaves` switches to the target's
      whole number, so the drips never open a seam at −X.
    - They run down, smoothstep from 0 to the target's amplitude over
      `DRIP_RUN_SECONDS`, 0.6, once the layers settle: every length
      spring (heights, radii, roundings, bottoms, the plate's and the
      topping's lengths) within `SETTLE_METERS`, 0.0005, of its target
      and slower than `SETTLE_METERS_PER_SECOND`, 0.005, the coverage
      within `SETTLE_COVERAGE`, 0.005, and the slice tween done. That is
      1.4 to 1.9 s after a press.
    - A retarget mid-withdrawal carries on withdrawing from where it is;
      one mid-run-down withdraws from the amplitude it has reached; one
      while waiting only takes the new wave count.
    - **Measured** in the port: no ray stepped through the surface while
      the drips withdrew with the layers moving (4.3 million rays a pair,
      each of the six pairs from the chocolate cake and the cheesecake to
      another, the cut at its own angle, 0, 90° and 180°), nor in all 30
      pairs, the 20 retargets mid-withdrawal and mid-run-down, nor while
      they ran down; a 0.4 s withdrawal let one ray through by 2.5 mm,
      and a 2 mm settle tolerance one by 0.12 mm.
16. **The coat's smoothed stack fades thin slots and folds in slot
    order.** A slot near 0 tall is a point at the stack's top centre, yet
    joins the smoothed stack at the full blend, lifting the coat's top by
    up to a quarter of the blend; as heights cross 0 that lift vanishes in
    one frame (3.6 mm on the axis, Black Forest to fruit cake at 1.68 s).
    - In layersField(), each slot joins `stack.z` with the skirt's blend
      times `clamp(height ÷ LAYER_BLEND_FADE_METERS, 0, 1)`, floored at
      `MIN_LAYER_BLEND_METERS`, since smoothMinDistance() divides by its
      blend. `LAYER_BLEND_FADE_METERS` is 0.002, as Decision 4's
      `FOOTING_HEIGHT_METERS`, half the thinnest layer, so every layer at
      rest blends in full; `MIN_LAYER_BLEND_METERS` is 1e-6, a lift of at
      most 0.25 µm. The blend changes with time, not across space, so the
      field keeps its bound and needs no step factor. The skip gate keeps
      the full blend, which only evaluates more.
    - The smoothed stack folds every slot in slot order, since the smooth
      minimum is not associative: cakeFieldOf() seeds only `stack.xy`
      with the least-bound slot, `stack.z` starts at `NO_SURFACE_METERS`,
      and layersField() folds the seed's distance, already computed, into
      `stack.z` at its own slot rather than skipping it. This absorbs
      `plans/todo/backlog/20261125-coat-blend-order.md`, its first
      candidate; the Lead Developer deletes that file.
    - At rest the coat changes only by the old order's step, up to
      0.14 mm on the Victoria sponge; not measured in a port, left to
      Manual QA step 9.

## Steps

### Step 1: The spring [P]

Adds `docs/src/motion/spring.js` per Decisions 1 and 2.

- It should follow the exact damped curve at every damping ratio,
  overdamped, critically damped and underdamped (Agent QA below).
- It should land on the same curve at any time step, letting only an
  underdamped spring overshoot (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { createSpring, stepSpring } from "./docs/src/motion/spring.js"; const w = 2 * Math.PI * 1.6; const exact = { 1.5: (t) => { const r = w * Math.sqrt(1.25), a = -1.5 * w - r, b = -1.5 * w + r; return 1 - (b * Math.exp(a * t) - a * Math.exp(b * t)) / (b - a); }, 1: (t) => 1 - Math.exp(-w * t) * (1 + w * t), 0.35: (t) => { const d = w * Math.sqrt(1 - 0.35 ** 2); return 1 - Math.exp(-0.35 * w * t) * (Math.cos(d * t) + ((0.35 * w) / d) * Math.sin(d * t)); } }; const run = (zeta, dt) => { const s = createSpring(0); s.target = 1; let max = 0, at = 0; for (let i = 1; i <= Math.round(2 / dt); i++) { stepSpring(s, { dampingRatio: zeta, hertz: 1.6 }, dt); max = Math.max(max, s.value); if (i === Math.round(0.5 / dt)) at = s.value; } return { at, max }; }; const ok = [1.5, 1, 0.35].every((z) => [1 / 60, 1 / 20].every((dt) => Math.abs(run(z, dt).at - exact[z](0.5)) < 1e-9)); console.log(ok, run(1.5, 1 / 60).max <= 1, run(1, 1 / 60).max <= 1, run(0.35, 1 / 60).max > 1.2);'`
- Expect: `true true true true`: at 0.5 s, at 60 Hz and 20 Hz, each
  damping ratio is on its closed-form curve to 1e-9; the overdamped and
  critically damped springs never pass the target, and the underdamped
  one overshoots by over 20%. A wrong branch, a dropped sign, hertz
  taken as radians per second or a per-frame integration fails it.

### Step 2: The walk and the camera fit [P]

Adds `docs/src/cake/walk.js` and `docs/src/camera/fit.js` per Decisions
1, 8 and 11.

- It should wrap the walk at both ends (Agent QA below).
- It should give the distance at which a sphere just fills the shorter
  side of the view (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { nextCakeIndex, previousCakeIndex } from "./docs/src/cake/walk.js"; console.log(nextCakeIndex(5, 6), previousCakeIndex(0, 6), nextCakeIndex(2, 6), previousCakeIndex(4, 6));'`
- Expect: `0 5 3 3`
- Do: `node --input-type=module -e 'import { distanceToFitSphere } from "./docs/src/camera/fit.js"; console.log(distanceToFitSphere(2, 30, 0.1).toFixed(4), distanceToFitSphere(0.5, 30, 0.1).toFixed(4));'`
- Expect: `0.3864 0.7531`: the sphere against a 30° vertical field of view
  at a wide aspect, and against the narrower horizontal one at a narrow
  aspect, `0.1 ÷ sin(atan(tan 15° × 0.5))`.

### Step 3: The cake's motion

Adds `docs/src/motion/cake-motion.js` per Decisions 1 to 7, 11 to 13 and
15, changes `docs/src/sdf/cake.js` so writeCakeUniforms() clamps as
Decision 7 says and sets colours without allocating, per Decision 13,
and changes `docs/src/cake/resolve.js` so the bounding cylinders are
worked out by one exported function that the motion also calls, with the
top's bulge of Decision 11. Changes layersField() in
`docs/src/sdf/layers.js` and the seed in cakeFieldOf() in
`docs/src/sdf/cake.js` per Decision 16, with both constants in
`layers.js`.

- It should hang an upper layer and bounce it, as Decision 3 describes
  (Agent QA below; Manual QA steps 2 and 3).
- It should give the resolver's footing at rest and hand it from layer to
  layer without a jump (Agent QA below; Manual QA step 9).
- It should withdraw the drips, switch their waves only at 0 and run them
  down once the layers settle (Agent QA below; Manual QA steps 1 and 2).
- It should keep a shrinking layer's colour and give an appearing layer
  its colour at once (Agent QA below; Manual QA step 4).
- It should retarget from the current state (Manual QA step 5).
- It should fade a thin slot's blend and fold the smoothed stack in slot
  order, so the icing's top never jumps as layers reach nothing (Agent QA
  below; Manual QA step 9).

**Agent QA**

- Do: `node --check docs/src/sdf/layers.js && node --check docs/src/sdf/cake.js && grep -c "LAYER_BLEND_FADE_METERS\|MIN_LAYER_BLEND_METERS" docs/src/sdf/layers.js`
- Expect: no parse error and `3` or more: both constants declared and
  used. The GLSL itself is checked only in the browser's console.

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const m = createCakeMotion(resolveRecipe(RECIPES[5])); retargetCakeMotion(m, resolveRecipe(RECIPES[4]), { reducedMotion: false }); let low = 1, gap = 0; for (let i = 1; i <= 600; i++) { stepCakeMotion(m, 1 / 60); low = Math.min(low, m.values.layers[1].bottomMeters); if (i === 6) gap = m.values.layers[1].bottomMeters - m.values.layers[0].heightMeters; } const rest = m.values.layers[0].heightMeters; console.log(gap > 0.005, low < rest - 0.001, Math.abs(m.values.layers[1].bottomMeters - rest) < 1e-4, m.values.layers[6].heightMeters);'`
- Expect: `true true true 0`: from the fruit cake's single 70 mm layer to
  the Black Forest, the second layer's bottom hung over 5 mm above the
  shrinking layer beneath it at 0.1 s, dipped at least 1 mm below its
  resting place and settled on it, and an empty slot stays at 0. Bottoms
  sprung to the target's sums, or on the length spring, fail it.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, toppingFooting } from "./docs/src/motion/cake-motion.js"; const atRest = RECIPES.every((r) => { const c = resolveRecipe(r); const t = createCakeMotion(c).values.topping; return Math.abs(t.baseMeters - c.topping.baseMeters) < 1e-12 && Math.abs(t.radiusMeters - c.topping.radiusMeters) < 1e-12; }); const slot = (bottomMeters, heightMeters, topRadiusMeters) => ({ bottomMeters, heightMeters, topRadiusMeters }); const ghost = toppingFooting([slot(0, 0.05, 0.09), slot(0.08, 1e-7, 1e-7)], {}); const half = toppingFooting([slot(0, 0.05, 0.09), slot(0.05, 0.002, 0.045)], {}); console.log(atRest, ghost.baseMeters.toFixed(6), ghost.radiusMeters.toFixed(6), half.baseMeters.toFixed(6), half.radiusMeters.toFixed(6));'`
- Expect: `true 0.050000 0.090000 0.050343 0.065000`: all six cakes at rest
  take the resolver's base and crown radius; a slot a tenth of a
  micrometre tall hanging above the stack takes no part of the footing;
  and a slot half as wide as the footing takes about half the radius and
  lifts the base by its weight cubed. A height-above-0 test, or the base
  lifted by the weight alone, fails it.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const m = createCakeMotion(resolveRecipe(RECIPES[1])); retargetCakeMotion(m, resolveRecipe(RECIPES[2]), { reducedMotion: false }); let zeroAt = null, backAt = null, wavesAtZero = true, waves = m.values.topping.dripWaves; for (let i = 1; i <= 360; i++) { stepCakeMotion(m, 1 / 60); const t = m.values.topping; if (t.dripWaves !== waves && t.dripMeters !== 0) wavesAtZero = false; waves = t.dripWaves; if (zeroAt === null && t.dripMeters === 0) zeroAt = i; if (zeroAt !== null && backAt === null && t.dripMeters > 0) backAt = i; } console.log(zeroAt !== null && zeroAt <= 13, wavesAtZero, backAt > 60, m.values.topping.dripMeters, m.values.topping.dripWaves);'`
- Expect: `true true true 0.02 9`: from the chocolate cake to the
  cheesecake, the drips reach 0 within 0.2 s, the wave count changes only
  while they are at 0, they run down again only after a second, once the
  layers settle, and they end at the cheesecake's 20 mm and 9 waves.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const a = createCakeMotion(resolveRecipe(RECIPES[0])); retargetCakeMotion(a, resolveRecipe(RECIPES[5]), { reducedMotion: false }); for (let i = 0; i < 60; i++) stepCakeMotion(a, 1 / 60); const b = createCakeMotion(resolveRecipe(RECIPES[0])); retargetCakeMotion(b, resolveRecipe(RECIPES[1]), { reducedMotion: false }); stepCakeMotion(b, 1 / 60); const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); console.log(hex(a.values.layers[2].color), hex(b.values.layers[3].color));'`
- Expect: `#e9c46a #24140b`: a second after the Victoria sponge turns to
  the fruit cake, its vanishing top sponge is still sponge-coloured, and
  one frame into the chocolate cake, the new fourth slot is already dark
  ganache.

### Step 4: The walk, the keys, the buttons, the hash and the camera

Changes `docs/src/main.js` to create the motion from the hash's cake,
step it each frame before writing the uniforms, and move the camera by
Decision 11; adds `docs/src/ui/keys.js` and `docs/src/ui/cake-arrows.js`;
changes `docs/index.html` and `docs/styles/main.css` for the two buttons
per Decision 10.

- It should walk the loop by Left, Right and the two buttons, wrapping,
  with the hash following and the slice at the end Decision 8 names
  (Manual QA steps 1, 6 and 7).
- It should transition on a hash edited in the URL (Manual QA step 8).
- It should keep the cake framed as it changes size, with the zoom kept
  as a multiplier (Manual QA steps 9 and 11).
- It should complete at once under reduced motion (Agent QA below;
  Manual QA step 10).

**Agent QA**

- Do: `for f in docs/src/main.js docs/src/ui/keys.js docs/src/ui/cake-arrows.js; do node --check "$f"; done; grep -c "<button" docs/index.html; grep -c "aria-label" docs/index.html`
- Expect: no parse error, `2` buttons, and `3` labels: the canvas's and
  the two buttons'.
- Do: `grep -n "capture: true" docs/src/ui/keys.js | wc -l`
- Expect: `1` or more: the listener is in the capture phase.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const to = resolveRecipe(RECIPES[1]); const m = createCakeMotion(resolveRecipe(RECIPES[0])); retargetCakeMotion(m, to, { reducedMotion: true }); stepCakeMotion(m, 1 / 60); const v = m.values; console.log(v.topping.baseMeters === to.topping.baseMeters, v.layers[4].bottomMeters === to.layers[4].bottomMeters, v.topping.dripMeters, v.topping.dripWaves);'`
- Expect: `true true 0.02 11`: under reduced motion the chocolate cake's
  footing, stack and drips are in place one frame after the press.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and in
the browser Right walks from the Victoria sponge round all six cakes and
back, each cake becoming the next with layers that hang and bounce, with
no console error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/` in Chrome on the M4 MacBook, open the dev tools
console, hard-reload, and make sure reduced motion is off in macOS
Accessibility settings.

1. **Do:** Press Right once.
   - **Expect:** Over about two seconds the Victoria sponge becomes the
     chocolate cake: the plate stays, the layers recolour and resize, two
     new layers grow from nothing, the icing turns to ganache and its
     skirt rises; the slice eases to the chocolate cake's narrowest,
     0.12 of a turn; once the layers have stopped moving, about a second
     and a half after the press, the ganache's drips run down; the URL's
     hash reads `#chocolate-drip`; the console is clean.
2. **Do:** Press Right again, to the cheesecake.
   - **Expect:** The ganache's drips draw back up at once; as the three
     upper layers shrink away, the layers above them hang in the air for
     a moment and then fall onto the stack; the plate flattens to paper;
     the ganache thins to a translucent berry glaze over the top and the
     upper sides, with a low dome on top, and once the layers settle its
     own drips run down.
3. **Do:** Press Left, back to the chocolate cake.
   - **Expect:** As the lower layers grow, the layers above them bounce
     up past their resting place and settle back; the cake arrives with
     its widest slice, 0.8 of a turn.
4. **Do:** Press Right twice slowly, watching the vanishing layers each
   time.
   - **Expect:** A layer that shrinks away keeps its colour to the end;
     none darkens or greys as it goes.
5. **Do:** Press Right, and half a second later press Right again.
   - **Expect:** The cake changes course smoothly from wherever it is to
     the second cake, with no jump or snap.
6. **Do:** Keep pressing Right until the hash reads `#victoria-sponge`
   again, then press Left once.
   - **Expect:** Six presses complete the loop, each cake arriving with
     its narrowest slice; Left from the first cake goes to `#fruit-cake`.
7. **Do:** Click the arrow button at the right end of the bottom bar, then
   the one at the left end; Tab to each and press Space; then switch the
   dev tools' device toolbar to 390 × 844 and tap each button.
   - **Expect:** Each click, Space and tap walks one cake, as the keys do;
     each button shows a focus ring when tabbed to; neither shows any
     text; at phone width both buttons sit inside the bar, clear of each
     other, and the cake stays framed.
8. **Do:** Edit the URL's hash to `#black-forest` and press Enter, without
   reloading.
   - **Expect:** The cake transitions to the Black Forest rather than
     snapping, and the page does not reload.
9. **Do:** Walk from the cheesecake to the Black Forest and on to the
   fruit cake.
   - **Expect:** The camera eases out as the cake grows taller and in as
     it shrinks, and the cake stays centred in the viewport throughout;
     the plate's shrink to nothing before the fruit cake leaves the stack
     resting where the plate's top was; the cream on top stays on the
     cake as its upper layers narrow away, sliding down to the fruit
     cake's top rather than jumping, with no hop of its top as the last
     of the vanishing layers reach nothing, about 1.7 s after the press.
10. **Do:** Turn on reduced motion in macOS Accessibility settings, then
    press Right.
    - **Expect:** The next cake appears at once, drips included, with no
      animation, and the console stays clean. Turn reduced motion off
      again.
11. **Do:** Scroll to zoom in, then press Right.
    - **Expect:** The zoom is kept relative to the new fit: the cake
      changes but the viewer's zoom is not reset.
12. **Do:** Record 5 s in the Performance panel while pressing Right every
    second, then the same on `https://richplastow.com/sdf-cake/`, which
    has no transitions, at the same window size.
    - **Expect:** No long frame from the JavaScript side; note both frame
      times in the Audit entry.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: a spring per resolved value,
  the layer bottoms following the stack for the hang and the bounce, the
  topping's base and radius made continuous, the eased slice, the walk
  by keys and buttons with the hash in step, the camera fit, and
  reduced motion.
- **2026-11-25T17:39:17Z** — **reviewed**: stopped on three Major
  findings, not fixed, measured in a port of the field and the march as
  Plans 03 and 04 built them, stepped through all 30 ordered pairs of
  cakes by the Decisions' springs: (1) `dripWaves` has no rule; sprung,
  as Decision 1's "one spring per animated number" reads, it opens a
  seam at −X of up to 4.0 mm (Victoria sponge to chocolate cake), and
  snapped, the drips jump between 11 and 9 waves (chocolate cake and
  cheesecake); (2) Decision 4's topping rides any slot of height above
  0: the pile, a disc of 0.8 of the target crown radius standing on the
  base, floats over narrowing top layers (Black Forest to fruit cake at
  0.25 s, 75 mm across its radius with 10 mm of air beneath from 30 to
  70 mm), the top drops 2.2 mm in one frame as vanishing layers cross
  0 at 0.49 s and a 1.2 to 1.6 mm bump returns at 1.08 s as the
  spring's ringing lifts their heights above 0 by under a micrometre,
  and the base steps 1.3 mm in a frame as such slots leave; (3)
  `DRIP_STEP_FACTOR` fails part-way through transitions, where hanging
  layers open gaps whose coat the drips' cut-off crosses down to the
  axis: cheesecake to chocolate cake at 0.37 s, 205 of 22,878 rays
  step up to 6.3 mm through the surface with a 90° cut and one by
  3.2 mm with none, and none with the drip amplitude at 0. No Minor
  fix applied; the review stopped at the port.
- **2026-11-25T19:45:47Z** — **ruled**: folded in the Lead Developer's
  rulings on the first review's Majors: the drips withdraw over 0.2 s
  when a transition starts, switch their wave count at 0 and run down
  over 0.6 s once every length spring is within 0.5 mm and 5 mm/s of its
  target, with no hold on the other springs (Decision 15); the topping's
  footing is a continuous fold over the written layers, weighted by
  height and by width against the footing so far, exact at rest
  (Decision 4); Right walks to the next cake at its `minFraction` and
  Left to the previous at its `maxFraction` (Decision 8); and the ten
  Minors applied: Decision 11 takes Plan 03's sphere and keeps the zoom
  as a multiplier with relative limits, the stack cylinder's top grows by
  the bulge, bottoms clamp at the plate, translucency and metalness
  spring, the plate and topping keep or take their colours as layers do,
  colours are set by `Color.setRGB()`, Manual QA 2 and 12 rewritten, and
  the spring's Agent QA tests the overdamped branch.
- **2026-11-25T19:45:47Z** — **reviewed**: stopped on one new Major
  finding, not fixed, measured in a port of the field and the march as
  built: a slot of height near 0, growing from nothing or ringing
  micrometres above 0 as it vanishes, sits as a point at the stack's top
  centre and still joins the coat's smooth minimum at the full blend,
  raising the coat's top by up to a quarter of the blend per such slot;
  as heights cross 0 the bump vanishes in one frame: 3.6 mm on the axis
  in one frame, Black Forest to fruit cake at 1.68 s (four slots at
  once), 2.2 mm custard pie to fruit cake, the same at 60 Hz and 240 Hz,
  and 2.7 mm past the stack cylinder less its margin. The footing and
  drip rules above measured clean in the same port; Agent QA lines and
  their mutations checked against reference code; review-plan's
  remaining checks (scene rules, accessibility, Step 4's wiring) not
  completed.
- **2026-11-25T19:55:21Z** — **ruled**: the Lead Developer chose option
  A for the second review's Major: each slot joins the coat's smoothed
  stack with the blend faded by its height over
  `LAYER_BLEND_FADE_METERS`, 0.002, floored at `MIN_LAYER_BLEND_METERS`,
  1e-6, and the smoothed stack folds in fixed slot order, absorbing the
  coat-order backlog item (Decision 16; Step 3 gains `layers.js` and the
  seed in `cake.js`, one criterion and one Agent QA line; Manual QA 9
  extended). Not measured in a port.
- **2026-11-25T19:55:21Z** — **reviewed**: finished by reading the
  remaining checks (scene rules, accessibility, Step 4's anchors in
  `index.html` and `main.js`); one Minor fixed: Manual QA 7 gains the
  phone-sized viewport. 14 criteria, 12 Manual QA steps. Ready to
  implement.
- **2026-11-25T20:04:39Z** — **implemented**: Steps 1 to 4. Added
  `docs/src/motion/spring.js` (Juckett's closed form and the four
  presets), `docs/src/motion/cake-motion.js`, `docs/src/cake/walk.js`,
  `docs/src/camera/fit.js` (the port, plus fitSphereOfBounds()),
  `docs/src/ui/keys.js` and `docs/src/ui/cake-arrows.js`; changed
  `docs/src/cake/resolve.js` (exported writeCakeBounds(), shared with the
  motion, with the top's bulge, and eatenRadiansForFraction(), so Left's
  `maxFraction` uses the resolver's clamp), `docs/src/sdf/cake.js`
  (writeCakeUniforms() clamps and sets colours by `Color.setRGB(r, g, b,
  SRGBColorSpace)`; the seed fills only `stack.xy`), `docs/src/sdf/layers.js`
  (Decision 16's fade and slot-order fold), `docs/src/main.js`,
  `docs/index.html` and `docs/styles/main.css`. Not in the plan: arrow
  presses with Alt, Ctrl or Cmd held are left to the browser. Every
  Agent QA block passes as written, each failing first on a missing
  module or a count of 0; no Agent QA or Manual QA line changed.
- **2026-11-25T20:04:39Z** — **verified**: agent checks pass: every
  module under `docs/src/` parses, no changed line passes 80 columns
  (only the favicon's `data:` URL), `/` and every changed file served 200
  by a server started for the check and stopped, vendored checksums
  match; browser not run, so the GLSL is unchecked.
- **2026-11-25T20:07:32Z** — **quality-checked**: Fixed: none at fix
  tier; one first-run polish, isLengthSettled()'s doc comment in
  `docs/src/motion/cake-motion.js` said "every length spring" of a
  function that takes one. Deferred: writeCakeBounds() would write an
  infinite stack cylinder if every layer height were 0 while the
  topping's thickness is above 0, unreachable since slot 0 is used by
  every recipe and never shrinks to 0; resizing springs the camera to
  the new fit rather than jumping, a bounded glitch the Lead Developer
  accepts. Verified fine: every Agent QA block in Steps 1 to 4 passes as
  written; the per-frame path (stepCakeMotion(), stepPart(),
  stepDrips(), isSettled(), toppingFooting(), writeCakeBounds(),
  writeCakeUniforms() with setColor(), stepCameraFit(),
  fitSphereOfBounds(), placeView()) allocates nothing, with `for…of`,
  map(), spreads and hex parsing only in create, retarget and snap;
  motion scales with the frame's elapsed time by the closed-form spring
  and the time-based slice and drip tweens; no new geometry, material,
  texture or render target, so nothing new to dispose of; resize keeps
  the aspect, projection, size and capped pixel ratio; every resolved
  field of layers, plate and topping is sprung, derived or tweened, none
  left at the first cake's value; `Color.setRGB()` with
  `SRGBColorSpace` as the plan's Decision 13 records for r187; no addon
  or dependency added; the GLSL of Decision 16 read against the plan
  (seed folded at its slot, skip gate at the full blend, blend floored
  above 0), not compiled; the buttons are real `<button>`s with
  `aria-label`s and a focus ring; Manual QA steps 1 to 12 walked against
  the code, none drifted; agent checks pass (every module parses, only
  the favicon's `data:` line passes 80 columns, `/` and each changed file
  served 200 by a server started for the check and stopped, vendored
  checksums match); browser not run.
- **2026-11-25T20:28:15Z** — **done**: Steps 1 to 4 implemented, agent
  checks passing, and the Lead Developer’s manual QA passed in full.
