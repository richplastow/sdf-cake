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
  [the research's architecture](01-presentation-mode-research.md#4-the-sliders-the-keys-and-the-ui),
  with MDN's
  [Creating vertical form controls](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_writing_modes/Vertical_controls)
  for the vertical range input, and ports
  pureland-simulator's `docs/src/ui/controls-toggle.js`.
- Depends on [Plan 06](../done/06-decorations.md), so that the reveal has every
  part to remove; feeds [Plan 08](08-crumb.md) nothing, and is the last
  of the UI.
- Needed because the slice is fixed per cake and nothing takes a cake
  apart yet.

## Decisions

1. **Modules.** `docs/src/cake/slice.js`, pure: eatenAngleForStep() maps
   a step index to the angle, and stepCountOf() gives a cake's steps.
   `docs/src/cake/reveal.js`, pure: revealPartsOf() lists a cake's parts
   in order, snapRevealStop() carries a stop across cakes, and
   presenceMaskFor() gives each part's presence at a stop.
   `docs/src/ui/sliders.js` wires both inputs; `docs/src/ui/keys.js`
   gains Up and Down and routes Left and Right through the eaten slider;
   `docs/src/ui/controls-toggle.js` is the port.
2. **The markup**, in `docs/index.html`'s `.controls`: a bottom bar
   holding the previous button, `<input type="range">` with the
   `aria-label` "Eaten", and the next button; and a right rail holding
   `<input type="range">` with the `aria-label` "Reveal". No visible
   text anywhere. Tab order is previous, eaten, next, reveal.
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
   `max` 0 and the input disabled, at `minFraction`. Every change, by
   key, by pointer or by the walk, retargets the slice tween of Plan 05.
5. **The walk from the ends.** Left at step 0 goes to the previous cake at
   its last step; Right at the last step goes to the next cake at step 0,
   replacing Plan 05's fractions. The two arrow buttons do exactly what
   Left and Right do, from the current step, so a button mid slider steps
   the slider rather than changing cake.
6. **The parts**, in order: the plate if its rim radius is above 0, each
   layer with height above 0 from the bottom, the topping if its coverage
   is above 0, and the decorations if any count is above 0. The reveal
   input's `min` is 0 and its `max` the count less 1; stop k shows parts
   0 to k. Up at `max` and Down at 0 do nothing.
7. **The mask.** A part's presence target is 1 when shown and 0 when
   hidden, multiplied into the targets the motion of Plan 05 springs to:
   the plate's lengths, a layer's height and radii, the topping's
   coverage, and the decorations through Plan 06's sink and drop. Hiding
   the topping therefore withdraws it through its stages, and hiding a
   layer drops the layers above it, the topping and the decorations with
   it.
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
   none. The keys work while the controls are hidden, and the canvas
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

**Agent QA**

- Do: `node --input-type=module -e 'import { eatenAngleForStep } from "./docs/src/cake/slice.js"; const e = { steps: 5, minFraction: 0.1, maxFraction: 0.7 }; console.log(eatenAngleForStep(e, 2).toFixed(3), eatenAngleForStep({ steps: 1, minFraction: 0.25, maxFraction: 0.25 }, 0).toFixed(3), eatenAngleForStep({ steps: 2, minFraction: 0, maxFraction: 1 }, 1).toFixed(3));'`
- Expect: `2.513 1.571 6.266`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { revealPartsOf, snapRevealStop } from "./docs/src/cake/reveal.js"; console.log(RECIPES.map((r) => revealPartsOf(r).length).join(","), snapRevealStop(3, 5, 2), snapRevealStop(1, 2, 1), snapRevealStop(0, 5, 2), snapRevealStop(5, 5, 2));'`
- Expect: `5,8,3,5,8,3 1 1 0 2`

### Step 2: The markup and the layout [P]

Changes `docs/index.html` and `docs/styles/main.css` per Decisions 2
and 3.

- It should show the bar along the bottom and the rail up the right, with
  the rail's top as its greatest value (Manual QA step 1).

**Agent QA**

- Do: `grep -c 'type="range"' docs/index.html; grep -c "writing-mode: vertical-lr" docs/styles/main.css; grep -c "direction: rtl" docs/styles/main.css`
- Expect: `2`, `1`, `1`.

### Step 3: The sliders wired, the keys and the walk

Adds `docs/src/ui/sliders.js`; changes `docs/src/ui/keys.js`,
`docs/src/motion/cake-motion.js` for the mask of Decision 7, and
`docs/src/main.js` per Decisions 4 to 10.

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
- Do: `grep -rn "ArrowUp\|ArrowDown\|ArrowLeft\|ArrowRight" docs/src --include=*.js | grep -v "docs/src/ui/keys.js" | wc -l`
- Expect: `0`: no other module reads an arrow key.

### Step 4: Escape

Adds `docs/src/ui/controls-toggle.js` and wires it in `docs/src/main.js`.

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

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: two native range inputs laid
  out along the bottom and up the right, the stepped eaten mapping with
  the walk at the ends, the parts as reveal stops with the presence
  mask, snapping by fraction, the four keys on the window, and Escape.
