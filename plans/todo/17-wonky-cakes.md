---
title: Wonky cakes
description: Gives every cake a wonky, 0 to 1, that pushes its outline off round, domes or sags its layers, misaligns and oozes its soft layers and tears its slice, on a base that stays flat.
type: plan
---

## Context

- Delivers wonkiness as one number per cake: the Sachertorte at 0.05
  stays all but mathematically perfect, the rustic pancake at 0.7 is
  potato-shaped, thicker and lumpier in the middle and off to one side,
  and torn rather than sliced; every other cake sits between them. The
  base of every cake stays perfectly flat, so it meets the plate, which
  stays perfectly round.
- Builds on [Plan 02](../done/02-plate-and-layers.md), the layers as
  rounded cones in the plane of revolution; [Plan 04](../done/04-topping.md),
  whose topping follows the smoothed stack, so it lays over whatever the
  layers become; [Plan 07](../done/07-sliders.md), the eaten wedge; and
  [Plan 08](../done/08-crumb.md), whose irregularity set the pattern for
  a displacement with a step factor, measured in
  [the research](01-presentation-mode-research.md#the-march-today-and-the-fields-the-brief-needs):
  a displacement breaks the bound by about its amplitude times its
  frequency.
- Feeds [Plan 18](18-bite-dont-slice.md), whose bite is torn by the same
  term as the slice; depends on no plan after it.
- Every term follows Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/),
  the displacement and domain operations.

## Decisions

1. **`wonky` is a recipe field**, 0 to 1, required on every recipe and
   validated. Values, first guesses by eye but for the two the brief
   fixes:

   | Cake | `wonky` | Cake | `wonky` |
   | --- | --- | --- | --- |
   | `1` Black Forest | 0.3 | `pepionkh-honey-cake` | 0.55 |
   | `2` cheesecake | 0.2 | `artemis-offering` | 0.25 |
   | `3` Victoria sponge | 0.35 | `sachertorte` | 0.05 |
   | `4` chocolate drip | 0.3 | `bolo-formigueiro` | 0.35 |
   | `5` fruit cake | 0.4 | `banh-bo` | 0.4 |
   | `pancake` | 0.7 | `custard-pie` | 0.3 |

   The resolver passes it through; the motion springs it on the colour
   spring, unitless, so a walk morphs one cake's wonkiness into the
   next's; a `wonky` uniform carries it.
2. **Each cake's shapes come from its hash.** The resolver draws, from
   lowbias32 of the recipe's `placementSeed` or `id` as placeItem() in
   `docs/src/cake/place.js` draws, which exports its hash helpers: three
   outline phases, `wonkyPhasesRadians`, a vec3 uniform sprung on the
   colour spring, so the potato turns smoothly between cakes; and per
   layer a direction, from the same hash and the slot. Per slot the
   uniform `layerWonkies`, a vec4: x the material's `rise`, −1 sags to 1
   domes; y 1 for a `soft` material, else 0; z and w the cosine and sine
   of the layer's direction. A resolved layer's new fields:

   ```json
   { "rise": 1, "soft": false, "wonkyAngleRadians": 2.731 }
   ```

   The palette's `rise` and `soft`, first guesses: `pancake` 1,
   `flatbread` 0.6, `custard` 0.3, `pastry` 0.2, `moonSponge`,
   `greyMoonSponge`, `biscuit` 0, `fruitCake` −0.2, `sacherSponge` and
   `formigueiroSponge` −0.3, `pandanSponge` and `cheesecake` −0.4,
   `sponge` and `chocolateSponge` −0.5; `cream`, `jam`, `apricotJam`,
   `honey`, `ganache` and `darkGanache` are soft with a `rise` of 0.5,
   so a soft layer levels up over a sag. A material that leaves them out
   has `rise` 0 and is not soft.
3. **The outline.** Once per sample, before the layers and never for the
   plate, cakeFieldOf() takes `q.x` in by `wonky × WONKY_OUTLINE × r0 ×
   profile(θ) × fade(q.x)`, with `profile(θ) = 0.5 sin(2θ + φ1) +
   0.35 sin(3θ + φ2) + 0.15 sin(5θ + φ3)`, θ from `atan(p.z, p.x)`,
   `WONKY_OUTLINE` 0.1, r0 the widest layer radius in a new
   `wonkyRadiusMeters` uniform, and the fade a smoothstep from 0 at the
   axis to 1 at half r0, so the shift vanishes where θ is undefined.
   Three low harmonics with hashed phases give a potato, not an ellipse.
   The term's gradient along the rim is at most `0.1 × 3.36` and the
   fade's at most `0.1 × 2`, together `WONKY_OUTLINE_GRADIENT`, 0.54,
   per unit of `wonky` (derived, not measured).
4. **The tops.** A layer's height at (x, z) gains `δ = wonky × (rise ×
   WONKY_RISE_METERS × dome + WONKY_LUMP_METERS × lumps)`:
   `WONKY_RISE_METERS` 0.006; dome `max(1 − (d / r0)², 0)` with d the
   distance from the layer's dome centre, `WONKY_DOME_OFFSET × r0` along
   its direction, `WONKY_DOME_OFFSET` 0.3; `WONKY_LUMP_METERS` 0.003 and
   lumps iq's product of sines in x and z at
   `WONKY_LUMP_WAVES_PER_METER` 50, about 6 cm lumps, computed once per
   sample and scaled per slot. The layer's cone takes half height
   `(height + δ) / 2` and centre `bottom + (height + δ) / 2`, so its
   bottom stays where it is. The offsets accumulate up the stack: a
   layer's bottom and top are shifted by the sum of the δ of every used
   slot beneath it, so a layer never hangs in air over a sag, and the
   lowest layer's underside, with nothing beneath it, is untouched: the
   base stays flat whatever `wonky` is. The gradient: the dome's at
   most `0.006 × 2 / r0`, 0.27 on the honey cake, the lumps'
   `0.003 × 50`, 0.15; together `WONKY_TOP_GRADIENT`, 0.42, per unit of
   `wonky` (derived). All first guesses, to tune by eye.
5. **Soft layers are misaligned and oozed.** A soft slot's `q` is taken
   from `p` shifted in x and z by `wonky × WONKY_SHIFT_METERS`, 0.006,
   along its direction, one more `length()` per soft slot per sample; so
   a cream or jam sits off its sponge, and, with its dome offset, is
   thicker on one side. Where it would overhang the layer beneath, it is
   cut back: the soft slot is intersected, by a smooth maximum over its
   own rounding, with the column of the slot beneath grown by `wonky ×
   WONKY_OOZE_METERS`, 0.004, so it bulges past the sponge's edge by at
   most that and never hangs in space, its rounding making the bulge an
   ooze. The ooze does not run down: a droop would add a gradient of its
   own, and the rounding carries the look.
6. **The slice is torn.** eatenStackDistance() lowers the wedge's
   distance by `wonky × WONKY_TEAR_METERS × tear(p)`, `WONKY_TEAR_METERS`
   0.005 and tear a product of sines in y and radius at
   `WONKY_TEAR_WAVES_PER_METER` 60, so the cut faces wander by up to
   3.5 mm on the pancake and 0.25 mm on the Sachertorte; the cut's
   bound on the plate's gate still holds, as the term only lowers the
   wedge's distance within its amplitude, which the gate's margin
   covers. Gradient `0.005 × 60`, `WONKY_TEAR_GRADIENT`, 0.3, per unit
   of `wonky` (derived).
7. **One step factor covers every term.** The terms peak at different
   points, but the bound must hold everywhere, so the march multiplies
   its step by `1 / (1 + WONKY_GRADIENT × wonky)`, `WONKY_GRADIENT` the
   sum of Decisions 3, 4 and 6, 1.26: about 0.53 on the pancake, 0.69 on
   the Victoria sponge and 0.94 on the Sachertorte, times
   `IRREGULARITY_STEP_FACTOR`. The pancake is the cheapest cake, so it
   can afford the slowest march. If Manual QA finds see-through pixels,
   the gradient rises; if the frame time is too dear, the amplitudes
   fall.
8. **The bounds grow.** writeCakeBounds() grows the stack's radius by
   `wonky × WONKY_OUTLINE × r0` plus `wonky × WONKY_SHIFT_METERS`, and
   its top by `wonky × (WONKY_RISE_METERS + WONKY_LUMP_METERS)` times
   the used slots; layerBoundDistance() subtracts the same from its
   slab and cylinder.
9. **The decorations ride the wonky top.** A slot's item takes, at
   placement, the stack's total top offset at its (x, z), by a pure
   stackTopOffsetAt() in a new `docs/src/cake/wonky.js` that mirrors the
   shader's δ with the recipe's own `wonky`, added to its rest height
   in decorationCenterOf(); the scatter's cells compute the same offset
   in the shader, four cells per sample within the scatter's reach. Mid
   transition an item sits at its own cake's offset while the top
   springs, a glitch of a few millimetres that settles.
10. **Performance** is measured once each, by
    [Plan 03's frame-time snippet](../done/03-frame-budget.md#manual-qa)
    on `#pancake` and on `#3` at a device pixel ratio of 2, against the
    live site. The step factor of Decision 7 is the cost; the amplitudes
    are the lever.

## Steps

### Step 1: Recipes, palette, resolver and placement [P]

- `docs/src/cake/recipes.js`: `wonky` on every recipe, by Decision 1.
- `docs/src/cake/materials.js`: `rise` and `soft`, by Decision 2.
- `docs/src/cake/place.js`: exports hashText() and unitOf().
- `docs/src/cake/wonky.js`: the constants of Decisions 3 to 7,
  stackTopOffsetAt(), and wonkyPhasesOf(recipe).
- `docs/src/cake/resolve.js`: `wonky`, `wonkyPhasesRadians`,
  `wonkyRadiusMeters` and each layer's `rise`, `soft` and
  `wonkyAngleRadians`; validateRecipe() rejects a `wonky` outside 0 to
  1, and the bounds grow by Decision 8.
- It should resolve the pancake at 0.7 with its layer's rise 1, and the
  Sachertorte at 0.05 (Agent QA).
- It should reject a `wonky` of 2 (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; const by = (id) => RECIPES.find((r) => r.id === id); const p = resolveRecipe(by("pancake")); console.log(p.wonky, p.layers[0].rise, p.layers[0].soft, resolveRecipe(by("sachertorte")).wonky, validateRecipe({ ...by("pancake"), wonky: 2 }).length);'`
- Expect: `0.7 1 false 0.05 1`.
- Do: `grep -c "wonky:" docs/src/cake/recipes.js`
- Expect: `12`.

### Step 2: Motion and uniforms

- `docs/src/motion/cake-motion.js`: springs for `wonky` and the three
  phases on the colour spring; `layerWonkies` values copied at retarget.
- `docs/src/sdf/cake.js`: the uniforms `wonky`, `wonkyPhasesRadians`,
  `wonkyRadiusMeters` and `layerWonkies`, written by writeCakeUniforms().
- It should spring `wonky` from one cake's to the next's (Agent QA).
- It should grow the stack's bound by Decision 8 (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const cake = (id) => { const r = RECIPES.find((x) => x.id === id); return { ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }; }; const m = createCakeMotion(cake("sachertorte")); retargetCakeMotion(m, cake("pancake"), { reducedMotion: false }); for (let i = 0; i < 100; i++) stepCakeMotion(m, 0.05); console.log(m.values.wonky.toFixed(2), m.values.bounds.stack.radiusMeters.toFixed(4));'`
- Expect: `0.70` and a radius above `0.1030`: the pancake's bound today,
  93.5 mm, grown by Decision 8's 10.5 mm at a `wonky` of 0.7.

### Step 3: The field

- `docs/src/sdf/cake.js`: the outline shift of Decision 3 before the
  layers; the tops' offsets accumulated by Decision 4.
- `docs/src/sdf/layers.js`: layerPlainDistance() takes the offsets,
  the soft shift and the ooze cut of Decision 5; layerBoundDistance()
  subtracts Decision 8's growth.
- `docs/src/raymarch/fragment.js`: the step factor of Decision 7.
- It should show the pancake potato-shaped, thicker and lumpy in the
  middle, off to one side (Manual QA 1).
- It should show the Sachertorte all but round and flat-topped (Manual
  QA 2).
- It should keep every base flat on its plate (Manual QA 3).
- It should sag the sponges and misalign and ooze the soft layers, with
  nothing hanging in space (Manual QA 4, 5).
- It should lay the topping over the layers as they are (Manual QA 5).
- It should leave no see-through pixel at the silhouette or the cut
  (Manual QA 6).

**Agent QA**

- Do: `for f in docs/src/sdf/cake.js docs/src/sdf/layers.js docs/src/raymarch/fragment.js docs/src/cake/wonky.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -c "WONKY_GRADIENT" docs/src/raymarch/fragment.js`
- Expect: `1` or more.

### Step 4: The torn slice

- `docs/src/sdf/cake.js`: eatenStackDistance() lowers the wedge by
  Decision 6.
- It should tear the pancake's cut and leave the Sachertorte's clean
  (Manual QA 7).
- It should keep the plate whole under the cut (Manual QA 7).

**Agent QA**

- Do: `grep -c "WONKY_TEAR_METERS" docs/src/sdf/cake.js`
- Expect: `1` or more.

### Step 5: The decorations ride the top

- `docs/src/cake/place.js`: each slot's `topOffsetMeters` from
  stackTopOffsetAt().
- `docs/src/sdf/decorations.js`: decorationCenterOf() adds the slot's
  offset; scatterNearest() computes each cell's.
- It should seat the honey cake's seeds and the Artemis offering's
  candles and flakes on the wonky top, neither buried nor floating
  (Manual QA 8).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations } from "./docs/src/cake/place.js"; const s = placeDecorations(RECIPES.find((r) => r.id === "artemis-offering")); console.log(s.length, s.every((x) => Number.isFinite(x.topOffsetMeters)));'`
- Expect: `9 true`.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and
`#pancake` is a lumpy, torn potato on a flat base while `#sachertorte`
stays all but perfect.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#pancake` in Chrome on the M4 MacBook with the
dev tools console open, and hard-reload. Keep the live site,
`https://richplastow.com/sdf-cake/`, in a second window of the same size.
Every step also expects no error, warning or shader log in the console.

1. **Do:** Press Up until the pancake shows, and watch a full turn.
   - **Expect:** Its outline is a potato, clearly not round nor merely
     oval; it is thicker in the middle than at the rim, the thickest
     part off centre, with gentle lumps across the top.
2. **Do:** Reload at `#sachertorte` and press Up until it is whole.
   - **Expect:** All but round and flat-topped; a very close look finds
     a hint of unevenness and no more.
3. **Do:** On `#pancake` and `#3`, drag to look at the cake from just
   above plate level, all the way round.
   - **Expect:** The underside meets the plate flat all round; no gap
     and no sinking into the plate.
4. **Do:** Reload at `#3`, press Up until it is whole and Right once,
   and look at the cut.
   - **Expect:** Each sponge dips a little in the middle; the jam and
     cream are thicker on one side, their edges off the sponge's by a
     few millimetres, and bulge past it as an ooze rather than a shelf
     hanging in air.
5. **Do:** On `#3`, turn the cake and look at the icing where the cream
   oozes.
   - **Expect:** The icing lays over the ooze and the dips; no icing
     floats clear of the cake.
6. **Do:** On `#pancake` and `#3`, scroll in until the zoom stops and
   look along the silhouette and along the cut seen edge-on.
   - **Expect:** No page-coloured pixels inside the cake.
   - **Why:** A step factor too high lets a ray step through the surface.
7. **Do:** Compare the cut on `#pancake` and `#sachertorte`, each at its
   second eaten step, and tilt to see the plate on the floor of the cut.
   - **Expect:** The pancake's cut edge wanders as if torn; the
     Sachertorte's is a clean segment; the plate is whole under both.
8. **Do:** Reload at `#pepionkh-honey-cake`, press Up until the seeds
   come, then at `#artemis-offering` until the candles and flakes come.
   - **Expect:** Seeds, candles and flakes sit on the uneven tops; none
     floats above or sinks below the surface once settled.
9. **Do:** On `#artemis-offering`, press Left from the first step to
   walk back to `#pepionkh-honey-cake`, then Right to return.
   - **Expect:** The outline and tops morph smoothly between the two
     cakes' wonkiness; nothing jumps.
10. **Do:** Reload at `#custard-pie` and `#4` in turn, press Up until
    each is whole.
    - **Expect:** The custard stays inside its pastry; the ganache layers
      sit a touch off the sponges and ooze; the drips still run.
11. **Do:** Set `MAX_PIXEL_RATIO` in `docs/src/main.js` to `2`,
    hard-reload `#pancake`, double-click to reset the view, and run Plan
    03's snippet in both windows; repeat on `#3`; restore the value to
    `1`.
    - **Expect:** Both figures noted in the Audit entry with the live
      site's; a rise of up to half on `#3` is the step factor's cost.
12. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools'
    device mode.
    - **Expect:** As step 1.

## Audit

- **2026-11-26T18:13:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 16. Proposed by the agent: every `wonky`
  value but the Sachertorte's and the pancake's, the hashed phases and
  directions, the `rise` and `soft` palette fields and their values,
  every amplitude and gradient constant, the tops accumulating up the
  stack in place of a sag on a layer's underside, the ooze without a
  droop, and the decorations' offsets precomputed at placement.
