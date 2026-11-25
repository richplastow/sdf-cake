---
title: Transitions and the cake walk
description: Animates every resolved value on a spring so one cake becomes the next with layers that hang and bounce, walks the loop of cakes by the arrow keys and two arrow buttons, and keeps the camera fitted to the cake.
type: plan
---

## Context

- Delivers the motion between cakes: a damped spring per resolved value,
  a layer's bottom following the stack beneath it so upper layers hang
  and bounce, the slice angle easing, the camera fitting the cake, and
  the walk round the loop by Left and Right and by an arrow button at
  each end of the bottom bar, with the location hash kept in step. A
  second change mid transition retargets from the current state.
- Implements section 3 of
  [the research's architecture](01-presentation-mode-research.md#3-presence-and-motion),
  with the spring step from Ryan Juckett's
  [Damped Springs](https://www.ryanjuckett.com/damped-springs/), and
  ports `distanceToFitSphere()` from pureland-simulator's
  `docs/src/camera/fit.js`.
- Depends on [Plan 04](04-topping.md); feeds
  [Plan 06](06-decorations.md), which adds the decorations' sink and fall
  to the choreography, and [Plan 07](07-sliders.md), which puts the
  eaten slider between the arrow buttons.
- Needed because the brief's cakes blend by tweening one recipe shape, and
  nothing animates a uniform yet.

## Decisions

1. **Modules.** `docs/src/motion/spring.js`, pure: a spring is
   `{ target, value, velocity }`, stepped by stepSpring() with a preset
   of angular frequency and damping ratio and a time step in seconds, by
   Juckett's closed-form step, so any frame interval lands on the same
   curve. `docs/src/motion/cake-motion.js` holds one spring per animated
   number of the resolved cake and the `values` object the writer reads,
   with createCakeMotion(), retargetCakeMotion() and stepCakeMotion().
   `docs/src/cake/walk.js`, pure, gives the next and previous index round
   the loop. `docs/src/camera/fit.js` is the port, taking the aspect, the
   vertical field of view in degrees, as Three.js does, and the radius.
   `docs/src/ui/keys.js`
   owns the window's arrow keys; `docs/src/ui/cake-arrows.js` the two
   buttons.
2. **Spring presets**, as frequency in hertz and damping ratio, first
   guesses to tune by eye: `LENGTH_SPRING` 1.6 Hz, 0.85, for every
   length, the coverage and the plate; `STACK_SPRING` 1.1 Hz, 0.35, for a
   layer's bottom; `COLOR_SPRING` 1.6 Hz, 1, for each colour channel and
   roughness, so a colour never overshoots; `CAMERA_SPRING` 1 Hz, 1.
3. **A layer's bottom** springs towards the sum of the current heights of
   the slots beneath it, recomputed every frame from the springs' values,
   not from the targets. A shrinking stack therefore drops the target
   under a layer that lags behind on the slow underdamped spring, which
   is the hang; a growing stack pushes it up past the target, which is
   the bounce.
4. **The topping's base** is the greatest of bottom plus height over the
   slots whose height is above 0, computed every frame, which is
   continuous while layers hang and fall; **the topping's radius** is a
   `LENGTH_SPRING` to the target cake's crown radius, so a vanishing top
   layer hands the topping to the one beneath it without a jump.
5. **A vanishing slot keeps its colour**: when a slot's target height is 0,
   its colour and roughness springs are not retargeted, so a layer never
   darkens as it shrinks. A slot appearing from nothing takes its colour
   at once.
6. **The slice angle** is an eased tween, smoothstep over
   `SLICE_SECONDS`, 0.6, restarted from its current value when retargeted,
   so it never overshoots into the plate.
7. **The writer clamps**: every length at 0 and below, and each
   rounding at the least of its radii and half its height, every frame,
   since an underdamped spring can pass through 0.
8. **The walk.** Right goes to the next cake in walk order with its eaten
   angle at its `maxFraction`, Left to the previous with the angle at its
   `minFraction`, wrapping at both ends; Plan 07 refines both to the
   slider's step. The two buttons do the same. `history.replaceState()`
   writes the new cake's id as the hash, and a `hashchange` event, from
   the viewer editing the URL, starts a transition to the cake it names.
   Key repeat is allowed: each press retargets.
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
11. **The camera** springs its distance to `distanceToFitSphere()` of the
    target cake's bound radius times `FIT_MARGIN`, 1.15, with the viewer's
    zoom applied as a multiplier on top, so `CAMERA_DISTANCE_METERS`
    becomes the fit rather than a constant; the rig's height springs to
    the target's bound centre. The zoom's limits stay absolute.
12. **Reduced motion** sets every spring and tween straight to its target
    when a transition starts.
13. **Nothing allocates per frame**: the springs and the `values` object
    are created once per page, retargeted in place, and the writer copies
    colours with `Color.copy()`.
14. **Performance** is measured during a transition against Plan 04's
    numbers, since the per-frame path now steps about eighty springs and
    uploads every uniform each frame.

## Steps

### Step 1: The spring [P]

Adds `docs/src/motion/spring.js` per Decisions 1 and 2.

- It should settle a critically damped spring on its target without
  overshoot, and let an underdamped one overshoot (Agent QA below).
- It should land on the same curve at any time step (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { createSpring, stepSpring } from "./docs/src/motion/spring.js"; const run = (zeta, dt) => { const s = createSpring(0); s.target = 1; let max = 0; for (let t = 0; t < 2; t += dt) { stepSpring(s, { hertz: 1.6, dampingRatio: zeta }, dt); max = Math.max(max, s.value); } return [Math.abs(s.value - 1) < 1e-3, max]; }; const [okC, maxC] = run(1, 1 / 60); const [_okU, maxU] = run(0.35, 1 / 60); const [_okF, maxF] = run(1, 1 / 20); console.log(okC, maxC <= 1 + 1e-6, maxU > 1.2, Math.abs(maxF - maxC) < 1e-3);'`
- Expect: `true true true true`

### Step 2: The walk and the camera fit [P]

Adds `docs/src/cake/walk.js` and `docs/src/camera/fit.js` per Decisions
1, 8 and 11.

- It should wrap the walk at both ends (Agent QA below).
- It should give the distance at which a sphere just fills the shorter
  side of the view (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { nextCakeIndex, previousCakeIndex } from "./docs/src/cake/walk.js"; console.log(nextCakeIndex(5, 6), previousCakeIndex(0, 6), nextCakeIndex(2, 6));'`
- Expect: `0 5 3`
- Do: `node --input-type=module -e 'import { distanceToFitSphere } from "./docs/src/camera/fit.js"; console.log(distanceToFitSphere(2, 30, 0.1).toFixed(4), distanceToFitSphere(0.5, 30, 0.1) > 0.5);'`
- Expect: `0.3864 true`: the sphere against a 30° vertical field of view
  at a wide aspect, and a greater distance at a narrow aspect, where the
  horizontal side is the limit.

### Step 3: The cake's motion

Adds `docs/src/motion/cake-motion.js` per Decisions 1 to 7 and 12 to 13,
and changes `docs/src/sdf/cake.js` so writeCakeUniforms() clamps as
Decision 7 says and copies colours without allocating.

- It should hang an upper layer and bounce it, as Decisions 3 and 4
  describe (Manual QA steps 2 and 3).
- It should keep a shrinking layer's colour (Manual QA step 4).
- It should retarget from the current state (Manual QA step 5).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const m = createCakeMotion(resolveRecipe(RECIPES[5])); retargetCakeMotion(m, resolveRecipe(RECIPES[4]), { reducedMotion: false }); let low = 1; for (let i = 0; i < 600; i++) { stepCakeMotion(m, 1 / 60); low = Math.min(low, m.values.layers[1].bottomMeters); } const rest = m.values.layers[0].heightMeters; console.log(low < rest - 0.001, Math.abs(m.values.layers[1].bottomMeters - rest) < 1e-4, m.values.layers[6].heightMeters);'`
- Expect: `true true 0`: from the fruit cake's single 70 mm layer to the
  Black Forest, the second layer's bottom lagged the shrinking layer
  beneath it, dipped at least 1 mm below its resting place and settled
  on it, and an empty slot stays at 0.

### Step 4: The walk, the keys, the buttons, the hash and the camera

Changes `docs/src/main.js` to create the motion from the hash's cake,
step it each frame before writing the uniforms, and move the camera by
Decision 11; adds `docs/src/ui/keys.js` and `docs/src/ui/cake-arrows.js`;
changes `docs/index.html` and `docs/styles/main.css` for the two buttons
per Decision 10.

- It should walk the loop by Left, Right and the two buttons, wrapping,
  with the hash following (Manual QA steps 1, 6 and 7).
- It should transition on a hash edited in the URL (Manual QA step 8).
- It should keep the cake framed as it changes size (Manual QA step 9).
- It should complete at once under reduced motion (Manual QA step 10).

**Agent QA**

- Do: `for f in docs/src/main.js docs/src/ui/keys.js docs/src/ui/cake-arrows.js; do node --check "$f"; done; grep -c "<button" docs/index.html; grep -c "aria-label" docs/index.html`
- Expect: no parse error, `2` buttons, and `3` labels: the canvas's and
  the two buttons'.
- Do: `grep -n "capture: true" docs/src/ui/keys.js | wc -l`
- Expect: `1` or more: the listener is in the capture phase.

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
     skirt rises to the drip line; the URL's hash reads
     `#chocolate-drip`; the console is clean.
2. **Do:** Press Right again, to the cheesecake.
   - **Expect:** As the three upper layers shrink away, the layers above
     them hang in the air for a moment and then fall onto the stack; the
     plate flattens to paper and the topping withdraws to a dollop and
     vanishes.
3. **Do:** Press Left, back to the chocolate cake.
   - **Expect:** As the lower layers grow, the layers above them bounce
     up past their resting place and settle back.
4. **Do:** Press Right twice slowly, watching the vanishing layers each
   time.
   - **Expect:** A layer that shrinks away keeps its colour to the end;
     none darkens or greys as it goes.
5. **Do:** Press Right, and half a second later press Right again.
   - **Expect:** The cake changes course smoothly from wherever it is to
     the second cake, with no jump or snap.
6. **Do:** Keep pressing Right until the hash reads `#victoria-sponge`
   again, then press Left once.
   - **Expect:** Six presses complete the loop; Left from the first cake
     goes to `#fruit-cake`.
7. **Do:** Click the arrow button at the right end of the bottom bar, then
   the one at the left end; Tab to each and press Space.
   - **Expect:** Each click and each Space walks one cake, as the keys do;
     each button shows a focus ring when tabbed to; neither shows any
     text.
8. **Do:** Edit the URL's hash to `#black-forest` and press Enter, without
   reloading.
   - **Expect:** The cake transitions to the Black Forest rather than
     snapping, and the page does not reload.
9. **Do:** Walk from the cheesecake to the Black Forest and on to the
   fruit cake.
   - **Expect:** The camera eases out as the cake grows taller and in as
     it shrinks, and the cake stays centred in the viewport throughout;
     the plate's shrink to nothing before the fruit cake leaves the stack
     resting where the plate's top was.
10. **Do:** Turn on reduced motion in macOS Accessibility settings, then
    press Right.
    - **Expect:** The next cake appears at once, with no animation, and
      the console stays clean. Turn reduced motion off again.
11. **Do:** Scroll to zoom in, then press Right.
    - **Expect:** The zoom is kept relative to the new fit: the cake
      changes but the viewer's zoom is not reset.
12. **Do:** Record 5 s in the Performance panel while pressing Right every
    second, and compare with Plan 04's numbers.
    - **Expect:** No long frame from the JavaScript side; note the frame
      time in the Audit entry.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: a spring per resolved value,
  the layer bottoms following the stack for the hang and the bounce, the
  topping's base and radius made continuous, the eased slice, the walk
  by keys and buttons with the hash in step, the camera fit, and
  reduced motion.
