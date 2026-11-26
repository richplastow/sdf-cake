---
title: Presentation prep
description: Grows the walk from six cakes to twelve for International Cake Day, adds the layer surface effects and decoration options they need, and refines navigation, drips and the camera.
type: plan
---

## Context

- A retrospective plan: it records work done in one fast, iterative
  session on 26 November 2026, steered cake by cake by the Lead
  Developer's eye in the browser, rather than planned up front. The Lead
  Developer asked for speed over polish, so tuning values are first
  guesses tuned by eye, and no agent ran a browser.
- Builds on [Plan 06](./06-decorations.md)'s decorations,
  [Plan 07](./07-sliders.md)'s sliders, [Plan 08](./08-crumb.md)'s
  crumb and [Plan 09](./09-candle-flames.md)'s flames.
- Needed for the International Cake Day presentation: more cakes from
  more places and times, each recognisable at a glance.

## Decisions

1. **New cakes.** Six recipes were added, each with the materials it
   needs in `docs/src/cake/materials.js`:
   - `pepionkh-honey-cake`: two scorched wheat flatbreads with
     translucent honey between, scattered sesame seeds, on a small
     brushed-copper dish whose lip rises straight up close round the
     cake.
   - `artemis-offering`: six thin layers alternating white and light
     grey, with flatbread-like bubbles and evenly spread scorch marks,
     silvery drip icing, silver flakes and nine candles, on a
     brushed-gold plate.
   - `sachertorte`: two dense chocolate sponges with apricot jam
     between and beneath a glossy glaze that runs down to the plate,
     with one thick chocolate disc standing at an angle on the quarter
     left at the last eaten step.
   - `bolo-formigueiro`: one golden sponge whose holes are filled with
     chocolate, a glaze with 18 long, uneven drips, 300 large chocolate
     sprinkles, on a plate the yellow of Brazil's flag.
   - `banh-bo`: two green pandan sponges, strongly browned, with cream
     between, on a thick, shallow wooden plate.
   - `pancake`: one thin layer, greyly browned and boldly scorched in
     the middle, on a slab of grey stone.
2. **Layer surface effects**, each a material setting carried through
   `resolve.js` and `cake-motion.js` to a per-slot uniform, and each
   worked out only at shading, never in the march:
   - `holeFill`: the layer is drawn whole and the points that would lie
     in a hole are coloured chocolate. Chosen over the Lead Developer's
     suggested overlapping copy of the layer, since layers always stack
     and a copy would mean changing the stacking motion.
   - `crust`, 0 to 1: browns the layer towards `CRUST_COLOR` within
     `CRUST_DEPTH_METERS` of its outer surface, so a cut face shows a
     rim. A layer darker than the crust browns to `DARK_CRUST_FACTOR` of
     its own colour instead. Every baked layer takes `LIGHT_CRUST`; the
     bánh bò takes 0.875 and the pancake 0.5.
   - `crustSaturation`, 0 to 1: desaturates that crust colour, for the
     pancake.
   - `scorch`, with `scorchClustering`, `scorchCoverage`, `scorchScale`,
     `scorchSeed` and `scorchVariety`: soft patches from 3D value noise,
     shifted per slot so stacked layers differ, gathered in the middle or
     spread evenly, and ranging between muted brown and grey.
3. **Decorations.** New kinds in `docs/src/cake/place.js`: `sesame`,
   `chocolateDisc` and `chocolateSprinkle`. A recipe's single decoration
   may give `at`, a fixed point with an optional fixed tilt and yaw, so
   the Sachertorte's disc and the custard pie's cherry sit in the
   quarter left at the last eaten step. A recipe may give a
   `placementSeed`, so a cake whose id changed keeps its decorations'
   places.
4. **Toppings.** A topping may be `isInvisible`: it draws nothing but
   still gives scattered decorations a cap, as the honey cake's sesame
   seeds need.
5. **Drips.** Every drip cake's drips are warped in place and swollen
   in length round the cake, so no two match. The field's step factor
   near the drips is now worked out per cake from the drips' slope,
   their reach times the skirt's share of the coverage, so
   `MAX_DRIP_TERM` rose from 1.9 to 8.
6. **Walk and slider.**
   - The order is `#1` Black Forest, `#2` cheesecake, `#3` Victoria
     sponge, `#4` chocolate drip, `#5` fruit cake, then the pancake,
     honey cake, Artemis offering, Sachertorte, Bolo Formigueiro, bánh
     bò and custard pie. The first five ids became numbers.
   - The fruit cake is `isOffWalk`: only `#5` reaches it.
   - The page opens, and Right walks on, with the reveal slider at the
     plate alone.
   - Left from the first eaten step walks back to the previous cake's
     first step, at `BACK_WALK_TIME_SCALE`, half speed, until the next
     change.
7. **Camera and canvas.** `MIN_FIT_RADIUS_METERS` keeps the camera back
   for a small cake, so the honey cake looks small. The canvas no longer
   takes focus, since every key listens on the window, so it draws no
   focus ring.
8. **Other refinements.** The cheesecake's cream layer is 70% of its
   former height, and the Victoria sponge has a cream layer above its
   jam.

## Changes by file

- `docs/index.html`: the canvas's `tabindex` removed.
- `docs/styles/main.css`: the canvas's focus-ring rule and
  `--scene-focus-ring-inset` removed.
- `docs/src/main.js`: the camera's least fit radius, the reveal slider
  at 0 on load and walking on, the walk back to step 0 at half speed,
  and walking by recipes rather than a count.
- `docs/src/cake/walk.js`: next and previous skip `isOffWalk` recipes.
- `docs/src/cake/recipes.js`: six new recipes, the new order and ids,
  and the refinements above.
- `docs/src/cake/materials.js`: the new materials and the crust and
  scorch settings.
- `docs/src/cake/place.js`: three decoration kinds, `at` and
  `placementSeed`.
- `docs/src/cake/resolve.js`: the layer and topping settings, the drip
  irregularity constants and dripTermOf().
- `docs/src/motion/cake-motion.js`: the new layer and topping surface
  keys.
- `docs/src/sdf/crumb.js`: the hole fill, crust and scorch constants,
  valueNoise() and scorchAt().
- `docs/src/sdf/layers.js`: the new uniforms; a filled layer cuts no
  holes.
- `docs/src/sdf/cake.js`: layerHoleFilledAt(), layerCrustedColorAt() and
  the new uniforms.
- `docs/src/sdf/topping.js`: the invisible topping and the varied drips
  with their per-cake step factor.

## Not done

- Brushed metal plates have no streaks: brushed copper and gold are a
  colour and a roughness.
- The Sachertorte's disc carries no lettering.
- A real Bánh bò has a honeycomb crumb; this one has round holes.
- The resolver's drip check repeats the topping shader's coverage of 0.5
  at which the skirt starts.
- After a walk back, a resize before any other change refits the camera
  at half speed.
- Frame times were not measured. 1000 sprinkles on the Bolo Formigueiro
  dropped the frame rate, so it holds 300 larger ones.

## Manual QA

1. Open `http://localhost:2222/`.
   Expect: the Black Forest's plate alone, the reveal slider at its
   foot, and no errors or warnings in the console.
2. Walk forward through every cake with Right, building each with Up.
   Expect: the order in Decision 6, skipping the fruit cake, each
   arriving on its bare plate.
3. On each new cake, eat to the last step.
   Expect: crusted rims on baked layers, darker on the dark sponges;
   chocolate in the Bolo Formigueiro's holes; the Sachertorte's disc and
   the custard pie's cherry whole on the quarter left.
4. From any cake's first eaten step, press Left a few times.
   Expect: each previous cake at its first step, changing at half speed.
5. Open `http://localhost:2222/#5`.
   Expect: the fruit cake, with its decorations where they always were.
6. Repeat steps 1 to 3 at a phone-sized viewport.
   Expect: the same.

## Audit

- **2026-11-26T11:10:08Z** — **done**: written after the work, from one
  iterative session the Lead Developer steered and checked cake by cake
  in the browser; agent checks run per change (every changed module
  parses, no line over 80 columns, every recipe validates); browser not
  run by the agent.
