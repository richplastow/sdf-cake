---
title: The eaten and reveal sliders
description: Adds a stepped horizontal slider that eats the cake slice by slice and a vertical slider that takes it apart stop by stop, walked by the four arrow keys whatever has focus, with Escape hiding the UI.
type: plan
---

## Context

- Delivers the two sliders of the brief: the eaten slider along the
  bottom, stepped per cake, whose ends hand over to the previous and next
  cake, and the reveal slider up the right side, whose stops are the
  parts the cake has, from the plate alone to everything. The four arrow
  keys walk them wherever focus is, and Escape hides and shows the UI.
- Implements section 4 of
  [the research's architecture](../todo/01-presentation-mode-research.md#4-the-sliders-the-keys-and-the-ui),
  with MDN's
  [Creating vertical form controls](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_writing_modes/Vertical_controls)
  for the vertical range input, and ports
  pureland-simulator's `docs/src/ui/controls-toggle.js`.
- Depends on [Plan 06](./06-decorations.md), so that the reveal has every
  part to remove; feeds [Plan 08](../todo/08-crumb.md) nothing, and is the last
  of the UI.
- Needed because the slice is fixed per cake and nothing takes a cake
  apart yet.

## Decisions

1. **Modules.** `docs/src/cake/slice.js`, pure: eatenAngleForStep() maps
   a step index to the angle, through `docs/src/cake/resolve.js`'s
   exported eatenRadiansForFraction(), and stepCountOf() gives a recipe's
   steps.
   `docs/src/cake/reveal.js`, pure: revealPartsOf() lists a cake's parts
   in order, snapRevealStop() carries a stop across cakes, and
   presenceMaskFor() gives each part's presence at a stop.
   `docs/src/ui/sliders.js` wires both inputs; `docs/src/ui/keys.js`
   gains Up and Down and routes Left and Right through the eaten slider;
   `docs/src/ui/controls-toggle.js` is the port.
   `docs/src/motion/cake-motion.js` gains retargetSlice() and
   retargetPresence(), which change the slice alone and the presence
   alone within a cake. Neither goes through retargetCakeMotion(), which
   is the cake change: it sinks every decoration, delays the body by
   `BODY_DELAY_SECONDS`, withdraws the drips and drops the decorations
   after `DROP_DELAY_SECONDS`. Under reduced motion both go straight to
   the target, as retargetCakeMotion() does.
2. **The markup**, in `docs/index.html`'s `.controls`: a bottom bar
   holding the previous button, `<input type="range">` with the
   `aria-label` "Eaten", and the next button; and a right rail holding
   `<input type="range">` with the `aria-label` "Reveal". The two
   existing `data-walk` buttons, which `docs/src/ui/cake-arrows.js`
   wires, become the bar's ends, their `aria-label`s "Previous cake" and
   "Next cake" becoming "Previous" and "Next", since mid slider they step
   the slider. No visible text anywhere. Tab order is previous, eaten,
   next, reveal.
3. **The layout**, in `docs/styles/main.css` with custom properties: the
   bar is centred along the bottom, `--eaten-length` 40vw and at least
   12rem long, `--controls-offset` from the edge; the rail is centred up
   the right side, `--reveal-length` 40vh, laid vertically by
   `writing-mode: vertical-lr` with `direction: rtl` so the greatest
   value is at the top, which the implementer verifies against the MDN
   page above in Chrome before relying on it. The canvas's grab cursor
   and drag do not extend under the controls.
4. **The eaten mapping.** The input's `min` is 0, its `max` the cake's
   steps less 1, its `step` 1. Step i gives the fraction
   `minFraction + (maxFraction − minFraction) × i ÷ (steps − 1)`, times
   a full turn, clamped to `EATEN_MAX_RADIANS`. A cake with one step has
   `max` 0 and the input disabled, at `minFraction`. A cake arrives at
   step 0 on load and on a hash change. Every step change within a cake,
   by key, by pointer or by a button, restarts Plan 05's slice ease
   (smoothstep over `SLICE_SECONDS`) from the current angle through
   retargetSlice(); a cake change carries its step in the resolved cake
   through retargetCakeMotion(), as now.
5. **The walk from the ends.** Left at step 0 goes to the previous cake at
   its last step; Right at the last step goes to the next cake at step 0,
   replacing Plan 05's fractions. The two arrow buttons do exactly what
   Left and Right do, from the current step, so a button mid slider steps
   the slider rather than changing cake.
6. **The parts**, read from the recipe, in order: the plate if it is not
   `null` and its rim radius is above 0, each layer with height above 0
   from the bottom, the topping if it is not `null` and its coverage is
   above 0, and the decorations, as one part, if any count is above 0.
   The reveal input's `min` is 0 and its `max` the count less 1; stop k
   shows parts 0 to k. A cake loads at its last stop, the whole cake. Up
   at `max` and Down at 0 do nothing. revealPartsOf() of the Black Forest
   gives:

   ```json
   [
     { "kind": "plate" },
     { "kind": "layer", "index": 0 },
     { "kind": "layer", "index": 1 },
     { "kind": "layer", "index": 2 },
     { "kind": "layer", "index": 3 },
     { "kind": "layer", "index": 4 },
     { "kind": "topping" },
     { "kind": "decorations" }
   ]
   ```

7. **The mask.** A part's presence is 1 when shown and 0 when hidden,
   and is applied per kind to the resolved cake before it reaches the
   motion: multiplied into the plate's lengths, into a layer's lengths
   (its height, radii and rounding, as an unused slot's are all 0), and
   into the topping's coverage; and, for the decorations, a hidden part
   passes the motion no slots and no scatter, so Plan 06's sink takes
   them away and its drop brings them back. Hiding the topping therefore
   withdraws it through its stages, and hiding a layer drops the layers
   above it, the topping and the decorations with it. A stop change
   within a cake goes through retargetPresence(); a cake change passes
   the masked cake to retargetCakeMotion(), so the next cake arrives
   taken apart to the snapped stop. presenceMaskFor(recipe, stop) gives,
   for the Black Forest at stop 4, with `layers` one per recipe layer and
   a part the cake lacks at 0:

   ```json
   { "plate": 1, "layers": [1, 1, 1, 1, 0], "topping": 0, "decorations": 0 }
   ```

8. **Snapping across cakes.** On a cake change the stop keeps its ends,
   and between them becomes `round(stop ÷ oldMax × newMax)` with halves
   rounded up, so a stop exactly half way prefers the higher. The input's
   `max` and value change together, with no `input` event fired.
9. **Keys.** The window's capture-phase listener of Plan 05 handles all
   four arrows with `preventDefault()`, so a focused range input never
   also steps itself. Key repeat is allowed. Escape toggles a
   `data-hidden` attribute on `.controls`, as the port does, which the
   CSS fades out and lets the pointer pass through, ignoring a held key's
   repeats; the port's moving of focus to a radio goes, since there is
   none, and so does its `onEscape` hook, since nothing else takes
   Escape. The keys work while the controls are hidden, and the canvas
   keeps its `tabindex`.
10. **Pointer.** Dragging either range fires `input` events, each
    retargeting as a key would, so a drag across many steps eases through
    them.
11. **Performance** needs no step: nothing here runs per frame beyond the
    springs Plan 05 measured.

## Steps

### Step 1: The slice and reveal maths [P]

Adds `docs/src/cake/slice.js` and `docs/src/cake/reveal.js` per
Decisions 1, 4, 6 and 8.

- It should map steps to angles, with one step at `minFraction` and the
  greatest angle clamped (Agent QA below).
- It should list each cake's parts and snap a stop across cakes by
  fraction, preferring the higher at a half (Agent QA below).
- It should give each part's presence at a stop, skipping a part a cake
  lacks, and apply it to the resolved cake (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { eatenAngleForStep } from "./docs/src/cake/slice.js"; const e = { steps: 5, minFraction: 0.1, maxFraction: 0.7 }; console.log(eatenAngleForStep(e, 2).toFixed(3), eatenAngleForStep({ steps: 1, minFraction: 0.25, maxFraction: 0.25 }, 0).toFixed(3), eatenAngleForStep({ steps: 2, minFraction: 0, maxFraction: 1 }, 1).toFixed(3));' && node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { stepCountOf } from "./docs/src/cake/slice.js"; console.log(RECIPES.map(stepCountOf).join(","));'`
- Expect: `2.513 1.571 6.266`, then `5,6,200,4,7,1`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { revealPartsOf, snapRevealStop } from "./docs/src/cake/reveal.js"; console.log(RECIPES.map((r) => revealPartsOf(r).length).join(","), snapRevealStop(3, 5, 2), snapRevealStop(1, 2, 1), snapRevealStop(0, 5, 2), snapRevealStop(5, 5, 2));'`
- Expect: `5,8,4,5,8,3 1 1 0 2`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { presenceMaskFor, revealPartsOf } from "./docs/src/cake/reveal.js"; const odd = { plate: { rimRadiusMeters: 0 }, layers: [{ heightMeters: 0.03 }, { heightMeters: 0 }], topping: { coverage: 0 }, decorations: [{ count: 0 }] }; const f = (m) => [m.plate, m.layers.join(""), m.topping, m.decorations].join(" "); console.log(revealPartsOf(odd).length, "|", f(presenceMaskFor(RECIPES[4], 4)), "|", f(presenceMaskFor(RECIPES[5], 1)));'`
- Expect: `1 | 1 11110 0 0 | 0 1 1 0`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { maskResolvedCake, presenceMaskFor } from "./docs/src/cake/reveal.js"; const r = RECIPES[4]; const c = resolveRecipe(r); c.decorations = { scatter: { kindId: 3 }, slots: [1] }; maskResolvedCake(c, presenceMaskFor(r, 0)); console.log(c.plate.rimRadiusMeters > 0, c.layers.map((l) => l.heightMeters).join(","), c.topping.coverage, c.decorations.slots.length, c.decorations.scatter.kindId);'`
- Expect: `true 0,0,0,0,0,0,0 0 0 0`: at stop 0 only the plate keeps
  its size, and the decorations have no slots and no scatter.

### Step 2: The markup and the layout [P]

Changes `docs/index.html` and `docs/styles/main.css` per Decisions 2
and 3.

- It should show the bar along the bottom and the rail up the right, with
  the rail's top as its greatest value, at a desktop and a phone-sized
  viewport (Manual QA steps 1 and 13).

**Agent QA**

- Do: `grep -c 'type="range"' docs/index.html; grep -c "writing-mode: vertical-lr" docs/styles/main.css; grep -c "direction: rtl" docs/styles/main.css`
- Expect: `2`, `1`, `1`.

### Step 3: The sliders wired, the keys and the walk

Adds `docs/src/ui/sliders.js`; changes `docs/src/ui/keys.js`,
`docs/src/motion/cake-motion.js` for retargetSlice() and
retargetPresence() (Decisions 1, 4 and 7), `docs/src/main.js` per
Decisions 4 to 10, and the doc comments of `docs/src/ui/cake-arrows.js`,
whose buttons no longer only walk the cakes.

- It should eat the cake step by step, by key and by pointer (Manual QA
  steps 2, 3 and 8).
- It should hand over to the next and previous cake at the ends (Manual
  QA step 4).
- It should take the cake apart and put it back stop by stop (Manual QA
  steps 5 and 6).
- It should snap the reveal across cakes (Manual QA step 7).

**Agent QA**

- Do: `for f in docs/src/ui/sliders.js docs/src/ui/keys.js docs/src/motion/cake-motion.js docs/src/main.js; do node --check "$f"; done; grep -c "ArrowUp\|ArrowDown\|ArrowLeft\|ArrowRight" docs/src/ui/keys.js`
- Expect: no parse error, and at least `4`.
- Do: `grep -rn "ArrowUp\|ArrowDown\|ArrowLeft\|ArrowRight" docs/src --include='*.js' | grep -v "docs/src/ui/keys.js" | wc -l`
- Expect: `0`: no other module reads an arrow key.

### Step 4: Escape

Adds `docs/src/ui/controls-toggle.js`, wires it in `docs/src/main.js`,
and styles `.controls[data-hidden]` in `docs/styles/main.css`.

- It should hide and show the controls on Escape while the keys keep
  working (Manual QA step 9).

**Agent QA**

- Do: `node --check docs/src/ui/controls-toggle.js && grep -c "data-hidden" docs/src/ui/controls-toggle.js docs/styles/main.css`
- Expect: no parse error, and at least `1` in each.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and in
the browser the cake is eaten step by step along the bottom slider, taken
apart stop by stop up the right slider, and both are walked by the arrow
keys wherever focus is, with no console error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#black-forest` in Chrome on the M4 MacBook, open
the dev tools console, and hard-reload.

1. **Do:** Look at the page.
   - **Expect:** A slider along the bottom between two arrow buttons, and
     a slider up the right side with its knob at the top; neither shows a
     word; the console is clean.
2. **Do:** Press Right three times, pausing between presses.
   - **Expect:** Each press eases the cut wider by one step; the bottom
     slider's knob moves right each time; the plate is never cut.
3. **Do:** Press Right until the knob reaches the right end, counting.
   - **Expect:** The Black Forest has seven steps, so six presses from
     the left end reach the right end, at 90% eaten.
4. **Do:** Press Right once more, then Left once more.
   - **Expect:** Right goes to the fruit cake at its one step, with the
     bottom slider disabled and its knob fixed; Left returns to the Black
     Forest at its last step, 90% eaten.
5. **Do:** Press Down repeatedly until nothing more changes.
   - **Expect:** The cherries and flakes sink away first, then the cream
     withdraws to a dollop and vanishes, then each layer from the top
     shrinks away and those above it fall, until only the plate is shown;
     a further Down does nothing.
6. **Do:** Press Up repeatedly until nothing more changes.
   - **Expect:** The layers grow back from the bottom, bouncing those
     above them, then the cream, then the cherries and flakes drop in;
     a further Up does nothing.
7. **Do:** Press Down three times, to stop 4 of 8, then press Right past
   the end to the fruit cake, which has three parts.
   - **Expect:** The reveal snaps to stop 1 of 3, the layer with its
     marzipan but no decorations, the knob moving to match; the fruit
     cake arrives already taken apart to that stop.
8. **Do:** Drag the bottom slider's knob with the mouse from one end to
   the other, then click a point on the right slider's track.
   - **Expect:** The cut eases through each step as the knob passes it;
     the reveal eases to the clicked stop.
9. **Do:** Press Escape, then press Right and Up.
   - **Expect:** Both sliders and the buttons vanish; Right and Up still
     eat and reveal the cake; Escape again shows the controls at their
     new values.
10. **Do:** Click the bottom slider so it has focus, then press Right.
    - **Expect:** The cut moves exactly one step, not two.
    - **Why:** A focused range input steps itself on an arrow key unless
      the default is prevented.
11. **Do:** Press Right past the fruit cake to the Victoria sponge, then
    hold Right down.
    - **Expect:** The steps race through, each retargeting smoothly, and
      the walk carries on into the next cake.
12. **Do:** Change the hash to `#cheesecake` and press Enter, then press
    Right.
    - **Expect:** The slider has two hundred steps, so one press is a
      barely visible change; holding Right eats the cake smoothly to 100%,
      where a sliver remains.
13. **Do:** In the dev tools' device toolbar, pick a phone-sized viewport
    of 390 × 844, reload, and tap the bottom slider's track, then the
    right slider's track.
    - **Expect:** The bar fits along the bottom between the two arrow
      buttons and the rail up the right, neither overlapping the other nor
      running off screen; each tap moves its knob to the tapped point and
      eases the cake to match; the console is clean.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: two native range inputs laid
  out along the bottom and up the right, the stepped eaten mapping with
  the walk at the ends, the parts as reveal stops with the presence
  mask, snapping by fraction, the four keys on the window, and Escape.
- **2026-11-25T21:27:47Z** — **reviewed**: realigned with Plans 03 to 06 as built:
  cheesecake has four parts (its coulis topping), so revealPartsOf()'s
  Expect is `5,8,4,5,8,3`; named retargetSlice() and retargetPresence()
  in cake-motion.js, since retargetCakeMotion() is the cake change; the
  mask covers a layer's rounding and passes hidden decorations no slots;
  JSON examples for the parts and the mask; reuse of
  eatenRadiansForFraction(); load at the last stop; button labels
  "Previous" and "Next"; Agent QA for stepCountOf() and
  presenceMaskFor(); quoted the `--include` glob for zsh; main.css and
  cake-arrows.js added to their steps; Manual QA step 13 for a phone.
- **2026-11-25T21:33:06Z** — **implemented**: Steps 1 to 4. New
  `docs/src/cake/slice.js`, `docs/src/cake/reveal.js` (with
  maskResolvedCake() applying Decision 7's mask),
  `docs/src/ui/sliders.js`, `docs/src/ui/controls-toggle.js`; changed
  `docs/src/ui/keys.js`, `docs/src/motion/cake-motion.js`
  (retargetSlice(), retargetPresence(), installDecorations() taking its
  drop delay, `REVEAL_DROP_DELAY_SECONDS` 0.15 s),
  `docs/src/main.js`, `docs/index.html`, `docs/styles/main.css`, and the
  doc comment of `docs/src/ui/cake-arrows.js`. Every Agent QA block
  passes as written; Manual QA unchanged.
- **2026-11-25T21:33:06Z** — **verified**: agent checks pass: 8 changed
  modules parse, no long lines bar the favicon, all changed files served
  with status 200, vendored checksums match; browser not run.
- **2026-11-25T21:35:27Z** — **quality-checked**: Fixed: none in code;
  Step 1 gained an Agent QA line for maskResolvedCake(), which no line
  proved, and its third criterion now names the mask's application.
  Deferred: drips withdraw and rerun on a reveal change that touches only
  the decorations, since retargetPresence() always calls retargetParts()
  (a visible glitch, left for the post-Plan 08 fix round: skip
  retargetParts() when the mask's body parts are unchanged);
  hasStandingDecorations() out of A-Z among the helpers; mutation testing
  skipped by the Lead Developer's speed order. Verified fine: every Agent
  QA block reruns as written; no new scene resource, nothing new on the
  per-frame path (installDecorations() gains an argument, no
  allocation); pending-change paths of retargetPresence() and
  retargetSlice(); snapping and Manual QA steps 3, 4, 7, 11 and 12
  against the recipes; agent checks pass; browser not run.
- **2026-11-25T22:13:43Z** — **done**: the Lead Developer’s manual QA
  passed (all groups, desktop and phone); moved to `plans/done/`.
