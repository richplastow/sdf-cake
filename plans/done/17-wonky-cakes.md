---
title: Wonky cakes
description: Gives every cake a wonky, 0 to 1, that pushes its outline off round, domes or sags its layers, misaligns and oozes its soft layers and tears its slice, on a base that stays flat.
type: plan
---

## Context

- Delivers wonkiness as one number per cake: the Sachertorte at 0.1
  stays all but mathematically perfect, the rustic pancake at 0.7 is
  potato-shaped, thicker and lumpier in the middle and off to one side,
  and torn rather than sliced; every other cake sits between them. The
  base of every cake stays perfectly flat, so it meets the plate, which
  stays perfectly round.
- Builds on [Plan 02](./02-plate-and-layers.md), the layers as
  rounded cones in the plane of revolution; [Plan 04](./04-topping.md),
  whose topping's skirt follows the smoothed stack, while its cap, floor,
  pile, drips and carve read q and its base, so Decision 4 lifts them
  onto the wonky top; [Plan 07](./07-sliders.md), the eaten wedge;
  [Plan 14](./14-better-sponge.md), whose ambient occlusion and
  crumb colouring read a layer away from the march, so they must read
  the same wonky layer (Step 3); and
  [Plan 08](./08-crumb.md), whose irregularity set the pattern for
  a displacement with a step factor, measured in
  [the research](../todo/01-presentation-mode-research.md#the-march-today-and-the-fields-the-brief-needs):
  a displacement breaks the bound by about its amplitude times its
  frequency.
- Feeds [Plan 18](../todo/18-bite-dont-slice.md), whose bite is torn by the same
  term as the slice; depends on no plan after it.
- Every term follows Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/),
  the displacement and domain operations.
- The fragment shader already declares about 384 uniform vectors,
  counting one per array element and Three.js's light and built-in
  uniforms, past WebGL 2's guaranteed `MAX_FRAGMENT_UNIFORM_VECTORS` of
  224, which the M4's driver exceeds; this plan adds 10. A device at the
  minimum fails to compile the shader today, with or without this plan.

## Decisions

1. **`wonky` is a recipe field**, 0 to 1, required on every recipe and
   validated. Values, first guesses by eye but for the two the brief
   fixes:

   | Cake | `wonky` | Cake | `wonky` |
   | --- | --- | --- | --- |
   | `1` Black Forest | 0.1 | `pepionkh-honey-cake` | 0.3 |
   | `2` cheesecake | 0.2 | `artemis-offering` | 0.12 |
   | `3` Victoria sponge | 0.1 | `sachertorte` | 0.1 |
   | `4` chocolate drip | 0.15 | `bolo-formigueiro` | 0.35 |
   | `5` fruit cake | 0.4 | `banh-bo` | 0.2 |
   | `pancake` | 0.7 | `custard-pie` | 0.45 |

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
   domes; y 1 for a `soft` material, else 0, which scales Decision 5's
   shift and mixes in its ooze cut, so it can spring; z and w the cosine
   and sine of the layer's direction, along x and z. The resolved cake's
   new fields, then a resolved layer's:

   ```json
   { "wonky": 0.7, "wonkyPhasesRadians": [1.92, 4.07, 0.55] }
   ```

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
   `WONKY_OUTLINE` 0.1, r0 the widest used layer's radius in a new
   `wonkyRadiusMeters` uniform, derived each frame from the sprung
   layers as writeCakeBounds() derives its widest radius, not a resolver
   field, so it springs with them; and the fade a smoothstep from 0 at
   the axis to 1 at half r0, so the shift vanishes where θ is undefined.
   Three low harmonics with hashed phases give a potato, not an ellipse.
   The shifted q serves every layer, a soft one included (Decision 5),
   and the topping (Decision 4). The plate keeps the round q, and the
   decorations keep p, so an item near the rim may overhang a pulled-in
   edge by up to `wonky × WONKY_OUTLINE × r0`, 3.4 mm on the fruit cake
   (derived): a bounded glitch.
   The term's gradient along the rim is at most `0.1 × 3.36` and the
   fade's at most `0.1 × 2`, together `WONKY_OUTLINE_GRADIENT`, 0.54,
   per unit of `wonky` (derived, not measured).
4. **The tops.** A layer's height at (x, z) gains `δ = wonky × (rise ×
   WONKY_RISE_METERS × dome + WONKY_LUMP_METERS × lumps)`:
   `WONKY_RISE_METERS` 0.006; dome `max(1 − (d / r0)², 0)` with d the
   distance from the layer's dome centre, at `WONKY_DOME_OFFSET × r0 ×
   (cos, sin)` of its direction in x and z, `WONKY_DOME_OFFSET` 0.3;
   `WONKY_LUMP_METERS` 0.003 and lumps iq's product of sines,
   `sin(k x) sin(k z)`, k `WONKY_LUMP_RADIANS_PER_METER` 50, about 6 cm
   lumps, computed once per sample. Every slot, a soft one included,
   reads δ at the unshifted p, and δ is scaled by the slot's fade,
   `clamp(height / LAYER_BLEND_FADE_METERS, 0, 1)`, as layersField()
   fades its blend, so a slot growing from nothing or vanishing adds its
   offset gradually rather than lifting every layer above it by up to
   `wonky × (WONKY_RISE_METERS + WONKY_LUMP_METERS)` in one frame. The
   layer's cone takes half height
   `(height + δ) / 2` and centre `bottom + (height + δ) / 2`, so its
   bottom stays where it is. The offsets accumulate up the stack: a
   layer's bottom and top are shifted by the sum of the δ of every used
   slot beneath it, so a layer never hangs in air over a sag, and the
   lowest layer's underside, with nothing beneath it, is untouched: the
   base stays flat whatever `wonky` is. The topping rides the same top:
   toppingField() takes the outlined q with its height lowered by the
   stack's total top offset at the sample, so its cap, floor, pile,
   drips' cut-off and carve follow the wonky top as its skirt follows
   the smoothed stack; otherwise its flat cap floats over a sag and the
   top pokes through it. The gradient: the dome's at
   most `0.006 × 2 / r0`, 0.27 on the honey cake, the lumps'
   `0.003 × 50`, 0.15; together `WONKY_TOP_GRADIENT`, 0.42, per unit of
   `wonky` (derived). All first guesses, to tune by eye. Measured in a
   JS port of the field: since the lumps add up the stack, the top's
   offset spans −4.3 to +5.1 mm on `#3`, −5.3 to +4.0 mm on `#1`, −1.6 to
   +6.2 mm on the pancake and ±0.7 mm on the Sachertorte; the thinnest
   layer, the honey cake's honey, thins from 3 to 1.35 mm; and the
   pancake's 8 mm layer thins to 5.9 mm, less than twice its 4 mm
   rounding, which roundedCappedConeDistance() tolerates as a slab of the
   right thickness, 0.14 mm narrower. No air gap opens inside any cake.
5. **Soft layers are misaligned and oozed.** A soft slot's `q` is taken
   from `p` shifted in x and z by `wonky × WONKY_SHIFT_METERS`, 0.006,
   along its direction, times its `layerWonkies` y, then given Decision
   3's outline shift as every layer is: one more `length()` per soft
   slot per sample; so
   a cream or jam sits off its sponge, and, with its dome offset, is
   thicker on one side. Where it would overhang the layer beneath, it is
   cut back: the soft slot is intersected, by a smooth maximum over its
   own rounding, with the column of the slot beneath, in the outlined q,
   grown by `wonky ×
   WONKY_OOZE_METERS`, 0.004, so it bulges past the sponge's edge by at
   most that and never hangs in space, its rounding making the bulge an
   ooze. The ooze does not run down: a droop would add a gradient of its
   own, and the rounding carries the look. Measured in the port, a soft
   layer reaches at most 0.24 mm past the sponge it rests on (the honey
   cake). Where a soft slot rests on another, as `#3`'s cream on its
   jam, the column is the jam's unshifted one, so the cream may overhang
   the jam's inset side by up to about 3.5 mm over the sponge beneath
   (derived): a bounded glitch.
6. **The slice is torn.** eatenStackDistance() adds `t = wonky ×
   WONKY_TEAR_METERS × tear(p)` to the cut's term of the cake's
   distance, `WONKY_TEAR_METERS` 0.005 and tear `sin(k y) sin(k r)`, r
   the distance from the axis, k `WONKY_TEAR_RADIANS_PER_METER` 60: up
   to half a turn the cut is `subtractDistance(wedge − t, stack)`, past
   it `max(wedge′ + t, stack)`, so both forms still agree at half a
   turn. Lowering both wedges' distances instead makes the cut jump by
   up to 2.85 mm as the slice passes half a turn (measured in the port),
   which every cake's eaten range does. The cut faces wander by up to
   3.5 mm on the pancake and 0.25 mm on the Sachertorte. The plate's
   gate still holds, as it reads the cake's distance after the cut,
   whatever the cut's term. occlusionAt() in
   `docs/src/raymarch/fragment.js` gives its face term the same `t`:
   otherwise a torn face reads up to 3.5 mm deep behind the straight one
   and its crumb's occlusion goes black in patches. Gradient
   `0.005 × 60`, `WONKY_TEAR_GRADIENT`, 0.3, per unit of `wonky`
   (derived).
7. **One step factor covers every term.** The terms peak at different
   points, but the bound must hold everywhere, so the march multiplies
   its step by `1 / (1 + WONKY_GRADIENT × wonky)`, `WONKY_GRADIENT` the
   sum of Decisions 3, 4 and 6, 1.26: about 0.53 on the pancake, 0.69 on
   the Victoria sponge and 0.94 on the Sachertorte, times
   `IRREGULARITY_STEP_FACTOR`. The pancake is the cheapest cake, so it
   can afford the slowest march. If Manual QA finds see-through pixels,
   the gradient rises; if the frame time is too dear, the amplitudes
   fall. Measured in the port, without the crumb's irregularity, the
   field's greatest gradient within 4 mm of the surface is 1.07 on the
   pancake, 1.09 on `#3`, 1.09 on `#1`, 1.16 on the honey cake and 1.01
   on the Sachertorte, against the 1.88, 1.44, 1.38, 1.69 and 1.06 the
   factor covers: the warps' gradients add in quadrature, not linearly,
   so `WONKY_GRADIENT` can fall towards 0.5 before any amplitude does.
   Rays marched at the factor hit within 0.1 mm of a fine march's hits.
   The shadow march takes no factor: a 16 % overestimate moves its
   longest step, 25 mm, by at most 4 mm, which lands inside, not
   through, the thinnest wonky solid, the pancake's 5.9 mm.
8. **The bounds grow.** writeCakeBounds(), taking the cake's `wonky`
   as a new last argument, grows the stack's radius by
   `wonky × WONKY_OUTLINE × r0` plus `wonky × WONKY_SHIFT_METERS`, and
   its top by `wonky × (WONKY_RISE_METERS + WONKY_LUMP_METERS)` times
   the used slots; layerBoundDistance() subtracts the same from its
   slab and cylinder.
9. **The decorations ride the wonky top.** A slot's item takes, at
   placement, the stack's total top offset at its (x, z), by a pure
   `stackTopOffsetAt(layers, wonky, xMeters, zMeters)` in a new
   `docs/src/cake/wonky.js` that mirrors the shader's sum of δ, faded as
   Decision 4 sets out, with the resolved layers and the recipe's own
   `wonky`, r0 derived from the layers, as `topOffsetMeters`, added to
   its rest height in decorationCenterOf(); the scatter's cells compute
   the same offset
   in the shader, four cells per sample within the scatter's reach. Mid
   transition an item sits at its own cake's offset while the top
   springs, a glitch of a few millimetres that settles.
10. **Performance** is measured once each, by
    [Plan 03's frame-time snippet](./03-frame-budget.md#manual-qa)
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
- `docs/src/cake/resolve.js`: `wonky`, `wonkyPhasesRadians` and each
  layer's `rise`, `soft` and `wonkyAngleRadians`; validateRecipe()
  rejects a `wonky` outside 0 to 1, and the bounds grow by Decision 8.
- It should resolve the pancake at 0.7 with its layer's rise 1, and the
  Sachertorte at 0.1 (Agent QA).
- It should reject a `wonky` of 2 (Agent QA).
- It should give stackTopOffsetAt() the sum of every used slot's dome,
  each about its own direction, and lumps, and each cake its own three
  phases (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; const by = (id) => RECIPES.find((r) => r.id === id); const p = resolveRecipe(by("pancake")); console.log(p.wonky, p.layers[0].rise, p.layers[0].soft, resolveRecipe(by("sachertorte")).wonky, validateRecipe({ ...by("pancake"), wonky: 2 }).length);'`
- Expect: `0.7 1 false 0.1 1`.
- Do: `grep -c "wonky:" docs/src/cake/recipes.js`
- Expect: `12`.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { stackTopOffsetAt } from "./docs/src/cake/wonky.js"; const c = resolveRecipe(RECIPES.find((r) => r.id === "pepionkh-honey-cake")); const used = c.layers.filter((l) => l.heightMeters > 0); const r0 = Math.max(...used.map((l) => Math.max(l.bottomRadiusMeters, l.topRadiusMeters))); const z = 0.02; const want = used.reduce((s, l) => s + c.wonky * 0.006 * l.rise * Math.max(1 - ((0.3 * r0 * Math.cos(l.wonkyAngleRadians)) ** 2 + (z - 0.3 * r0 * Math.sin(l.wonkyAngleRadians)) ** 2) / r0 ** 2, 0), 0); console.log(Math.abs(stackTopOffsetAt(c.layers, c.wonky, 0, z) - want) < 1e-9, want > 0);'`
- Expect: `true true`: at x = 0 the lumps vanish, leaving the domes'
  sum, which a dropped sign, a single slot's offset or another slot's
  direction would change.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { stackTopOffsetAt } from "./docs/src/cake/wonky.js"; const c = resolveRecipe(RECIPES.find((r) => r.id === "pepionkh-honey-cake")); const used = c.layers.filter((l) => l.heightMeters > 0); const r0 = Math.max(...used.map((l) => Math.max(l.bottomRadiusMeters, l.topRadiusMeters))); const [x, z] = [0.03, 0.03]; const lumps = Math.sin(50 * x) * Math.sin(50 * z); const want = used.reduce((s, l) => s + c.wonky * (0.006 * l.rise * Math.max(1 - ((x - 0.3 * r0 * Math.cos(l.wonkyAngleRadians)) ** 2 + (z - 0.3 * r0 * Math.sin(l.wonkyAngleRadians)) ** 2) / r0 ** 2, 0) + 0.003 * lumps), 0); console.log(Math.abs(stackTopOffsetAt(c.layers, c.wonky, x, z) - want) < 1e-9);'`
- Expect: `true`: off both axes the lumps count, which a dropped or
  mis-phased lump term would change.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { wonkyPhasesOf } from "./docs/src/cake/wonky.js"; const by = (id) => RECIPES.find((r) => r.id === id); const all = [...wonkyPhasesOf(by("pancake")), ...wonkyPhasesOf(by("1"))]; console.log(new Set(all).size, all.every((v) => v >= 0 && v < 2 * Math.PI));'`
- Expect: `6 true`.

### Step 2: Motion and uniforms

- `docs/src/motion/cake-motion.js`: springs for `wonky` and the three
  phases on the colour spring; each layer's `rise`, its `soft` as 0 or
  1, and its direction's cosine and sine as layer surface numbers on the
  colour spring, so a layer appearing from nothing takes them at once,
  as it takes its colour, and a walk between cakes eases them rather
  than jumping each top by up to `wonky × WONKY_RISE_METERS` times the
  change in `rise` at the retarget; stepCakeMotion() passes `wonky` to
  writeCakeBounds().
- `docs/src/sdf/cake.js`: the uniforms `wonky`, `wonkyPhasesRadians`,
  `wonkyRadiusMeters`, derived by Decision 3, and `layerWonkies`,
  written by writeCakeUniforms().
- It should spring `wonky` from one cake's to the next's (Agent QA).
- It should grow the stack's bound by Decision 8 (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const cake = (id) => { const r = RECIPES.find((x) => x.id === id); return { ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }; }; const m = createCakeMotion(cake("sachertorte")); retargetCakeMotion(m, cake("pancake"), { reducedMotion: false }); for (let i = 0; i < 100; i++) stepCakeMotion(m, 0.05); console.log(m.values.wonky.toFixed(2), m.values.bounds.stack.radiusMeters.toFixed(4));'`
- Expect: `0.70 0.1040`: the pancake's bound today, 93.5 mm, grown by
  Decision 8's 10.5 mm at a `wonky` of 0.7.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const r = RECIPES.find((x) => x.id === "3"); const top = (wonky) => resolveRecipe({ ...r, wonky }).bounds.stack.topMeters; console.log((top(0.35) - top(0)).toFixed(5));'`
- Expect: `0.01260`: Decision 8's growth of the top, 0.35 × 9 mm for each
  of `#3`'s four used slots.

### Step 3: The field

- `docs/src/sdf/cake.js`: the outline shift of Decision 3 before the
  layers; the tops' offsets accumulated by Decision 4, once per sample.
- `docs/src/sdf/layers.js`: layerPlainDistance() takes the offsets,
  the soft shift and the ooze cut of Decision 5; layerBoundDistance()
  subtracts Decision 8's growth. One helper gives a slot's outlined,
  shifted q and its offsets at a point, and every reader of a layer away
  from cakeFieldOf() uses it: layerInclusionAt(), layerHoleFilledAt()
  and layerCrustedColorAt() in `docs/src/sdf/cake.js`, and occlusionAt()
  in `docs/src/raymarch/fragment.js`. Each builds its own round q today;
  left so, `#3`'s outline, pulled in by up to 3.2 mm, reads as that deep
  inside the round layer, so its occlusion goes black in a band, its
  inclusions show on the outer surface and its crust vanishes.
- `docs/src/sdf/topping.js`: toppingField() and toppingCarveDistance()
  ride the wonky top by Decision 4.
- `docs/src/raymarch/fragment.js`: the step factor of Decision 7.
- It should show the pancake potato-shaped, thicker and lumpy in the
  middle, off to one side (Manual QA 1).
- It should show the Sachertorte all but round and flat-topped (Manual
  QA 2).
- It should keep every base flat on its plate (Manual QA 3).
- It should sag the sponges and misalign and ooze the soft layers, with
  nothing hanging in space (Manual QA 4, 5).
- It should lay the topping over the layers as they are (Manual QA 5).
- It should leave no see-through pixel and no dark band at the
  silhouette or the cut (Manual QA 6).

**Agent QA**

- Do: `for f in docs/src/sdf/cake.js docs/src/sdf/layers.js docs/src/sdf/topping.js docs/src/raymarch/fragment.js docs/src/cake/wonky.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -c "WONKY_GRADIENT" docs/src/raymarch/fragment.js`
- Expect: `1` or more.

### Step 4: The torn slice

- `docs/src/sdf/cake.js`: eatenStackDistance() tears the cut by
  Decision 6, in both of its forms.
- `docs/src/raymarch/fragment.js`: occlusionAt()'s face term takes the
  same tear.
- It should tear the pancake's cut, with no jump as the slice passes
  half a turn, and leave the Sachertorte's clean (Manual QA 7).
- It should keep the plate whole under the cut (Manual QA 7).

**Agent QA**

- Do: `grep -c "WONKY_TEAR_METERS" docs/src/sdf/cake.js`
- Expect: `1` or more.

### Step 5: The decorations ride the top

- `docs/src/cake/place.js`: each slot's `topOffsetMeters` from
  stackTopOffsetAt(), beside the fields a placed slot holds today:

  ```json
  { "xMeters": 0.031, "zMeters": -0.012, "topOffsetMeters": 0.0021 }
  ```
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
     and no sinking into the plate. On `#3`, whose icing runs down the
     sides, the icing meets the plate all round too.
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
   - **Expect:** No page-coloured pixels inside the cake, and no dark
     band along the outline or dark patches on the cut faces.
   - **Why:** A step factor too high lets a ray step through the surface;
     an occlusion read of the round layer darkens the wonky one.
7. **Do:** Compare the cut on `#pancake` and `#sachertorte`, each at its
   second eaten step, and tilt to see the plate on the floor of the cut.
   Then on `#pancake` press Right step by step to the last, watching the
   cut faces as the slice passes half the cake.
   - **Expect:** The pancake's cut edge wanders as if torn; the
     Sachertorte's is a clean segment; the plate is whole under both.
     The torn faces move smoothly with the slice, with no jump at half
     the cake.
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
- **2026-11-27T00:26:23Z** — **reviewed**: ported the field to JS and
  measured Decisions 3 to 7 (step factor holds with margin; no interior
  gap; base flat); fixed the tear's sign past half a turn, the topping
  riding the wonky top, the layer readers away from the march, a slot's
  offset fading in with its height, the layers' wonky numbers sprung,
  `wonkyRadiusMeters` derived, the frequency constants renamed to radians
  per metre; added JSON, two Agent QA lines and an exact Step 2 expect.
- **2026-11-27T00:40:11Z** — **implemented**: Steps 1 to 5. Added
  `docs/src/cake/wonky.js` (constants, wonkyPhasesOf(), wonkyLayerOf(),
  wonkyRadiusOf(), stackTopOffsetAt()); changed `recipes.js`,
  `materials.js`, `place.js` (exports hashText() and unitOf(); slots take
  `topOffsetMeters`), `resolve.js`, `cake-motion.js`, `sdf/cake.js`,
  `sdf/layers.js`, `sdf/topping.js`, `sdf/decorations.js` and
  `raymarch/fragment.js`. Every Agent QA block passes. Departures: a
  slot's top offset is clamped at minus its height, in GLSL and JS, so a
  slot fading in never inverts; the slot's wonky top offset rides in
  `decorationOffsets`' y, added by writeCakeUniforms(), so no uniform is
  added beyond the plan's 10; the drips' cut-off rides the top offset in
  proportion to its height over the base, so a full skirt still reaches
  the flat plate; layerBoundDistance() grows its slab by `slot + 1`
  slots' reach. Manual QA 3's Expect gains the icing meeting the plate.
- **2026-11-27T00:40:28Z** — **verified**: agent checks pass: 11 changed or new modules
  parse, no long lines, `/` and every changed file served 200 by a
  server this check started and stopped, vendored checksums match;
  browser not run, so the GLSL is unchecked.
- **2026-11-27T00:46:43Z** — **quality-checked**: Fixed: `WONKY_LEAST_RADIUS_METERS` renamed `WONKY_LEAST_LENGTH_METERS` in `sdf/layers.js` and `sdf/topping.js`, since the topping divides its base height by it, not a radius (first-run polish); Agent QA gaps found by mutation: Step 1 gains a line proving stackTopOffsetAt()'s lumps (a dropped or mis-phased lump term passed every line) and its criterion names the lumps; Step 2 gains a line proving the stack bound's top growth, `0.01260` on `#3` (a dropped `wonkyTopMeters` or one slot's growth passed). Deferred: `place.js` and `wonky.js` import each other, safe while neither reads the other at load, better broken by moving lowbias32(), hashText() and unitOf() to their own module; `rise`, `soft` and the direction's cosine and sine spring unclamped, so an overshoot past 1 can exceed the layer bound's growth by a fraction of a millimetre; wonky.js's exports are not A-Z. Verified fine: the assembled fragment shader read against GLSL ES 3.00 (`float levels[LAYER_LEVELS]` sized by a constant integral expression and passed as an exact match, every index in range, no int-to-float mixing, no recursion, every new function declared before its callers, no local named after a built-in, a reserved word or a user function, 10 uniforms added); `wonkyPhasesRadians`' Float32Array against r187's setValueV3f(); the per-frame path (stepCakeMotion(), writeCakeUniforms(), wonkyRadiusOf(), writeDecorationUniforms()) allocates nothing; no geometry, material or texture added, so nothing to dispose; the tear's sign in both cut forms and occlusionAt(); the drips' cut-off algebra; the decorations' slab still holds raised items; every Agent QA line and agent check passes; browser not run, so the shader is still uncompiled.
- **2026-11-27T08:49:51Z** — **ruled**: the Lead Developer’s first look
  in the browser: the pancake and `#2` look right; the tops of the
  layered cakes stack too much unevenness, worst on `#1` and `#3`; the
  custard pie wants more; the Sachertorte a little more, still near
  perfect. Decision 1’s table retuned: `1` 0.3 → 0.1, `3` 0.35 → 0.1,
  `4` 0.3 → 0.15, `banh-bo` 0.4 → 0.2, `artemis-offering` 0.25 → 0.12,
  `pepionkh-honey-cake` 0.55 → 0.3, `custard-pie` 0.3 → 0.45,
  `sachertorte` 0.05 → 0.1. Step 1’s criterion and Agent QA Expect
  follow the Sachertorte’s 0.1; every Agent QA line re-run and passing.
  The Decisions’ measurements quoted at 0.05 for the Sachertorte stand
  as measured then.
- **2026-11-27T08:54:46Z** — **fixed**: the Lead Developer saw the camera bob on most
  cakes; a temporary readout showed the stack bound's top flipping by
  `wonky × 9 mm` per hidden slot about once a second. A hidden slot's
  height rings about 0 on its spring, and writeCakeBounds() counted it
  as a whole used slot whenever it was above 0. Each slot now counts
  faded in by its height over `LAYER_BLEND_FADE_METERS`, as the
  shader fades its offset; wonkyRadiusOf() fades each radius the same
  way. Every Agent QA line re-run and passing.
- **2026-11-27T09:05:27Z** — **done**: the Lead Developer’s manual QA passed, after the
  wonky retune and the bound’s fade fix for the camera bob; the
  temporary bob readout removed from `docs/src/main.js`.
