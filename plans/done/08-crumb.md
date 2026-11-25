---
title: The crumb
description: Pits each sponge layer with fractal holes, colours raisins, nuts and chocolate chips into its cut faces as volumes of material, and gives every layer a gentle irregularity.
type: plan
---

## Context

- Delivers the inside of the cake: fractal sponge holes in the field of
  each layer whose material has them, inclusions shown wherever a layer
  is cut, and a low-frequency irregularity of each layer's surface.
- Implements the crumb of
  [the research's architecture, section 2](../todo/01-presentation-mode-research.md#2-the-parts-as-fields),
  with the hole construction measured in
  [the research's measurements](../todo/01-presentation-mode-research.md#the-hole-construction-the-research-recommends),
  from Inigo Quilez's [fbm SDF](https://iquilezles.org/articles/fbmsdf/),
  [smooth minimum](https://iquilezles.org/articles/smin/) and
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/).
- Depends on [Plan 07](./07-sliders.md), so the cut and the reveal expose
  every face the crumb shows on; feeds nothing: it completes the field.
- Needed because the brief's sponge is pitted and studded, and every cut
  face is smooth today.

## Decisions

1. **Module.** `docs/src/sdf/crumb.js` exports `crumbChunk`:
   holesDistance() for the fractal holes, inclusionAt() for the material
   of a point inside a layer, and irregularityAt() for the displacement.
   `docs/src/sdf/layers.js` applies the holes and the irregularity per
   slot; the material lookups in `docs/src/sdf/cake.js` take the hit
   point and ask inclusionAt() for it.
2. **The holes** are iq's fractal field: eight spheres at the corners of a
   cubic cell of the material's hole cell size, each with a radius under
   half the cell's edge by hash, in `HOLE_OCTAVES`, 2, each half the size
   of the last and rotated, subtracted from the layer by a smooth maximum
   of `HOLE_SMOOTH_FRACTION`, 0.2, of the cell; the sphere radii are
   scaled by the material's hole strength, so 0 skips the construction.
   The holes are evaluated only within `CRUMB_CLIP_METERS`, 1 cm, of the
   plain layer, which spares a third of the samples and changes no step
   count, as measured.
3. **Inclusions are volumes of material, not geometry.** At a hit, if the
   plain layer's distance at the point is below `INCLUSION_INSET_METERS`,
   −1 mm, so the point lies inside the layer, and the point falls inside
   an inclusion of the inclusion grid, the hit takes the inclusion's
   colour and roughness. A cut face therefore shows raisins, nuts and
   chips as flat patches, as a cut through them does, at eight
   evaluations per hit instead of per step, and the layer's outer surface
   never shows them. The grid is a jittered cell of the layer's inclusion
   cell size with one ellipsoid per cell, checked across the nearest
   neighbour on each axis, iq's eight-cell trick, and the item's kind is
   drawn by hash against the layer's weights.
4. **The inclusion kinds**, each an ellipsoid with semi-axes, a colour and
   a roughness: chocolateChip 4 by 3 by 4 mm, #2b1a10, 0.4; nut 6 by 4
   by 5 mm, #b9895a, 0.8; raisin 5 by 3 by 4 mm, #3a2418, 0.5. Material
   ids 50, 51 and 52. A layer's cell size is the cube root of its volume
   over its total count, and its weights are the three counts' shares.
5. **The layers' inclusions and irregularity**, first guesses: the
   chocolate cake's three sponge layers hold 60 chocolate chips each; the
   fruit cake's layer holds 150 raisins and 40 nuts; every other layer
   has none. Irregularity is 1.5 mm for sponge and chocolate sponge,
   2 mm for the fruit cake, 1 mm for cheesecake, biscuit and pastry,
   0.5 mm for custard, and 0 for jam, cream and ganache.
6. **Irregularity** displaces a layer's distance by its amplitude times
   iq's product of sines at `IRREGULARITY_WAVES_PER_METER`, 40, which
   raised the worst gradient to 1.03 at 1 mm, as measured; the validator
   caps the amplitude at `MAX_IRREGULARITY_METERS`, 2 mm, and the march
   multiplies its step by `IRREGULARITY_STEP_FACTOR`, 0.9, while any
   layer's amplitude is above 0. The factor sits in march(), not on the
   layer's term as the topping's `DRIP_STEP_FACTOR` does, since a scaled
   layer distance would also thin the topping's coat, which follows the
   smoothed stack. The displaced layer reaches up to its amplitude beyond
   the cone, so layerBoundDistance() subtracts the amplitude, and
   writeCakeBounds() grows the stack's cylinder by the greatest amplitude,
   which would otherwise eat the whole of `BOUND_MARGIN_METERS`, 2 mm.
7. **Uniforms**, arrays of `LAYER_SLOTS`, packed so the shader adds 14
   uniform vectors rather than 35: `layerCrumbs`, a `vec4` per slot of
   the hole strength, the hole cell in metres, the inclusion cell in
   metres and the irregularity in metres, and `layerInclusionWeights`, a
   `vec3` per slot of the chips', nuts' and raisins' shares. The resolver
   fills each layer's values from the palette and the recipe, 0 for an
   empty slot and an inclusion cell of 0 for a layer with no inclusions,
   and writeCakeUniforms() packs them. Plan 05's springs move the cells
   and the amplitude on the length spring, as a layer's radii, and the
   hole strength and the three weights on the colour spring, as its
   roughness; stepPart() springs only scalar keys, so the weights are
   sprung as three keys or otherwise retargeted on every walk, never left
   at the first cake's. A resolved layer, the fruit cake's:

   ```json
   {
     "holeStrength": 0.6,
     "holeCellMeters": 0.003,
     "inclusionCellMeters": 0.0203,
     "inclusionWeights": [0, 0.211, 0.789],
     "irregularityMeters": 0.002
   }
   ```

8. **The step cap** stays at Plan 03's `MAX_MARCH_STEPS`, 1024. The step
   factor lengthens a crawling ray's march by about a ninth, so Plan 03's
   worst measured crawl, 888 steps, becomes about 987 (inferred, not
   measured); Manual QA looks for stray page pixels at the silhouette and
   along the cut seen edge-on, which exhausted rays leave, and the Audit
   entry says whether the cap needs to rise.
9. **Performance** is measured on the fruit cake, the heaviest crumb, by
   [Plan 03's frame-time snippet](./03-frame-budget.md#manual-qa),
   against the live site, which runs the code before this plan.
10. **The topping is carved by plain copies of the layers** (the Lead
    Developer's ruling after manual QA): toppingField() subtracts
    toppingCarveDistance(), each used layer's rounded cone without holes
    or irregularity, drawn in by `CARVE_INSET_METERS`, 1.5 mm, reaching
    `CARVE_SEAM_METERS`, 2 mm, below its bottom, and cut off
    `CARVE_DIP_METERS`, 1.5 mm, below the topping's base, to which the
    cap's floor also drops; so the topping fills no inner hole or seam,
    only a little of the outermost and topmost holes. The carve is read
    only where the uncarved topping lies within `CARVE_GATE_METERS`, 1 mm.
11. **The jam is translucent** (the Lead Developer's ruling): the palette
    gives the jam `translucency`, `JAM_TRANSLUCENCY`, 0.5, which the
    resolver, the colour spring and a `layerTranslucencies` uniform carry.
    The fragment shader's throughTopping() becomes throughTranslucent(),
    shared by the topping and any translucent layer, marching with that
    layer and the topping hidden (cakeFieldOf()'s `hidden` slot) over at
    most four times the layer's height.
12. **The cheesecake's eaten maximum is 0.9** (the Lead Developer's
    ruling), per recipe, so its last step leaves about a tenth of the
    cake rather than a sliver.

## Steps

### Step 1: The holes

Adds `docs/src/sdf/crumb.js` with holesDistance() per Decision 2;
changes `docs/src/sdf/layers.js` to subtract them per slot within the
clip, `docs/src/cake/resolve.js`, `docs/src/sdf/cake.js` and
`docs/src/motion/cake-motion.js` for the hole strength and cell in
`layerCrumbs` per Decision 7; the palette's crumb columns in
`docs/src/cake/materials.js` are already there, so it changes only its
comment's "will read".

- It should pit a cut face of every layer whose material has holes, and
  none of a jam or cream seam (Manual QA steps 1 and 2).
- It should pit a layer's top where the reveal exposes it (Manual QA step
  3).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const v = resolveRecipe(RECIPES[0]); console.log(v.layers.map((l) => l.holeStrength).join(","), v.layers[0].holeCellMeters);'`
- Expect: `1,0,1,0,0,0,0 0.004`
- Do: `node --check docs/src/sdf/crumb.js && node --check docs/src/sdf/layers.js && grep -c "HOLE_OCTAVES\|HOLE_SMOOTH_FRACTION\|CRUMB_CLIP_METERS" docs/src/sdf/crumb.js docs/src/sdf/layers.js`
- Expect: no parse error, and at least `3` in all.

### Step 2: The inclusions

Adds inclusionAt() to `docs/src/sdf/crumb.js` per Decisions 3 and 4;
changes `docs/src/sdf/cake.js` so the material lookups take the hit
point, `docs/src/raymarch/fragment.js` to pass it, and
`docs/src/cake/resolve.js` and `docs/src/motion/cake-motion.js` for the
inclusion cell in `layerCrumbs` and `layerInclusionWeights`, read from
each recipe layer's `inclusions`.

- It should show chips in the chocolate cake's cut faces and raisins and
  nuts in the fruit cake's, and nothing on any outer surface (Manual QA
  steps 4 and 5).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const f = resolveRecipe(RECIPES[5]).layers[0]; console.log(f.inclusionWeights.map((w) => w.toFixed(3)).join(","), f.inclusionCellMeters > 0);'`
- Expect: `0.000,0.211,0.789 true`: chips, nuts and raisins as shares of
  190.
- Do: `grep -c "inclusionAt" docs/src/sdf/cake.js docs/src/sdf/crumb.js`
- Expect: at least `1` in each.

### Step 3: The irregularity

Adds irregularityAt() to `docs/src/sdf/crumb.js` per Decision 6;
changes `docs/src/sdf/layers.js` to apply it and to lower
layerBoundDistance() by it, `docs/src/raymarch/fragment.js` for the step
factor, `docs/src/cake/resolve.js` for the value in `layerCrumbs`, the
cap and the grown stack bound, and `docs/src/motion/cake-motion.js` to
spring it.

- It should lump every sponge's surface gently and leave the seams smooth
  (Manual QA step 6).
- It should refuse an amplitude above the cap (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; const r = structuredClone(RECIPES[0]); r.layers[0].irregularityMeters = 0.003; console.log(validateRecipe(r).length, validateRecipe(RECIPES[0]).length);'`
- Expect: `1 0`
- Do: `grep -c "IRREGULARITY_STEP_FACTOR" docs/src/raymarch/fragment.js`
- Expect: at least `2`.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and in
the browser every cut face is pitted where its material is sponge, the
chocolate cake and the fruit cake show their inclusions in the cut, the
sponges are gently lumpy, and the console shows no error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/` in Chrome on the M4 MacBook, open the dev tools
console, and hard-reload. [Plan 03's frame-time
snippet](./03-frame-budget.md#manual-qa), to paste into the
console for step 8, prints the mean over 300 animation frames:

```js
{ let n = 0; const t0 = performance.now(); const f = () => ++n < 300 ? requestAnimationFrame(f) : console.log(((performance.now() - t0) / n).toFixed(1), "ms per frame"); requestAnimationFrame(f); }
```

1. **Do:** On the Victoria sponge, the cake at load, press Right twice to
   widen the cut, drag it to face the camera and zoom in on it.
   - **Expect:** Both sponge layers' cut faces are pitted with holes of
     two sizes, the smaller scattered among and into the larger, with
     shadow inside the holes; the jam seam is smooth and translucent, the
     sponge faintly visible through it; the pink icing fills no inner
     hole or seam, only a little of the outermost and topmost holes; the
     console is clean.
2. **Do:** Open `http://localhost:2222/#black-forest` and look at its
   cut.
   - **Expect:** The three dark sponge layers are pitted, no topping
     fills their inner holes, and the two cream seams are smooth.
3. **Do:** Press Down until only the plate and the bottom layer are shown,
   and look at that layer's top.
   - **Expect:** Its top is pitted as its cut face is.
4. **Do:** Open `http://localhost:2222/#chocolate-drip` and zoom in on
   its cut.
   - **Expect:** Dark flat patches of chocolate chip in each sponge
     layer's face, none in the ganache seams, and none showing through
     the ganache on the outside; the ganache coat fills no inner hole.
5. **Do:** Open `http://localhost:2222/#fruit-cake` and zoom in on its
   cut, a fixed quarter: Right there walks on to the next cake.
   - **Expect:** Many dark raisin patches and fewer paler nut patches
     across the face, in a scattered, non-repeating arrangement; the
     marzipan outside shows none.
6. **Do:** Open `http://localhost:2222/#cheesecake`, press Down once to
   hide the coulis, and look along the cheesecake's side against the
   light.
   - **Expect:** A gentle, low-frequency lumpiness to the surface, with no
     banding, flicker or holes torn in the silhouette.
   - **Why:** The irregularity breaks the distance bound; the step factor
     must keep the march safe.
   - **Then:** Press Right until the eaten slider is at its maximum.
     **Expect:** About a tenth of the cheesecake is left, not a sliver.
7. **Do:** On `#fruit-cake` and then `#victoria-sponge`, look at the
   silhouette against the page at the load zoom, then drag until the cut
   is seen edge-on; do the same on
   `https://richplastow.com/sdf-cake/`, which runs the code before this
   plan.
   - **Expect:** No stray page pixels along the edge or the cut beyond
     what the live site shows; if there are, note them for the step cap
     in the Audit entry.
8. **Do:** On `#fruit-cake`, double-click to reset the view and run the
   snippet; zoom in until the zoom stops and run it again. Do the same on
   `https://richplastow.com/sdf-cake/#fruit-cake` at the same window
   size.
   - **Expect:** About 16.7 ms, the display's limit, at both views on
     both sites; note all four figures in the Audit entry.
9. **Do:** In the dev tools device toolbar, pick a phone-sized viewport
   (iPhone 14, 390 × 844), reload `#chocolate-drip`, and zoom in on its
   cut.
   - **Expect:** The pitted faces and the chips show as on the desktop,
     and the console stays clean.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: fractal holes per material
  within a clip, inclusions as volumes of material read once per hit,
  the three inclusion kinds, irregularity with its cap and step factor,
  and the crumb uniforms.
- **2026-11-25T22:26:24Z** — **reviewed**: no Major finding; Minor
  fixes applied: Decision 6 gains why its factor sits in march() and
  the layer and stack bounds grown by the amplitude; Decision 7 packs
  the five arrays into `layerCrumbs` (`vec4`) and
  `layerInclusionWeights`, 14 uniform vectors not 35, the shader being
  over WebGL 2's floor of 224 already (Plan 06's deferred finding), and
  names each value's spring, with a JSON example; Decision 8 takes Plan
  03's cap of 1024; Decision 9 and Manual QA 8 use Plan 03's snippet
  against the live site; Steps 1 to 3 name the packed uniforms,
  `cake-motion.js` and the bounds; Manual QA 2, 4 and 5 open cakes by
  hash, 5 drops a Right that would walk on, 6 hides the coulis first, 7
  compares with the live site, 9 adds the phone viewport. Material ids
  50 to 52 free; Step 1 and 2 Agent QA Expects match the code.
- **2026-11-25T22:34:45Z** — **implemented**: Steps 1 to 3. Added
  `docs/src/sdf/crumb.js` (holesDistance(), inclusionAt(),
  irregularityAt(), `INCLUSION_KINDS`); changed `docs/src/sdf/layers.js`
  (`layerCrumbs`, `layerInclusionWeights`, layerPlainDistance(), holed
  layerDistance(), bound less the amplitude), `docs/src/sdf/cake.js`
  (crumb chunk pasted first, layerInclusionAt() in the layer branch of
  cakeAlbedoOf() and cakeRoughnessOf(), which now takes the point, packed
  uniforms), `docs/src/raymarch/fragment.js` (`IRREGULARITY_STEP_FACTOR`
  in march(), point to cakeRoughnessOf()), `docs/src/cake/resolve.js`
  (crumb values, `MAX_IRREGULARITY_METERS` check, stack bound grown by
  the greatest irregularity), `docs/src/motion/cake-motion.js` (cells and
  amplitude on the length spring, hole strength on the colour spring,
  weights copied on each retarget of a present layer), and the comment in
  `docs/src/cake/materials.js`. Beyond the plan's file list: lowbias32(),
  nextHash() and unitOfHash() moved from `docs/src/sdf/decorations.js` to
  `docs/src/sdf/primitives.js`, which also gains smoothMaxDistance(), so
  the crumb, pasted before the layers, can use them; decorations.js
  exports linearColorOf() and toGlslFloat() for the crumb. The clip reads
  "within 1 cm" as a plain layer distance below 1 cm, so a deep cut face
  is pitted. Agent QA: all three steps' blocks pass. Manual QA 1's Expect
  reworded: the finer octave scatters among the larger holes, not only
  inside them.
- **2026-11-25T22:34:45Z** — **verified**: agent checks pass: 9 changed
  modules parse, no long lines, `/` and every changed file served 200
  (server started for the check and stopped), vendored checksums match;
  browser not run, so no shader has been compiled.
- **2026-11-25T22:37:30Z** — **quality-checked**: Fixed: none at fix tier; first-run polish only, the awkward doc-comment wraps in `docs/src/sdf/decorations.js` (decorationsChunk) and `docs/src/cake/resolve.js` (resolveRecipe(), writeCakeBounds()), and layerVolumeMeters3() reformatted as Prettier would. Deferred: GLSL compile, performance and fidelity (holes near the cut, the coat following holed layers, inclusions looked up twice per hit, weights switching at once, every cake marching at 0.9) left to the Lead Developer's browser QA. Verified fine: GLSL read by hand for compile errors (declaration order primitives, crumb, plate, layers, topping, decorations; `PI` from `common`; `NO_SURFACE_METERS`, the hashes and smoothMaxDistance() declared before use; `uvec3` from a float vector, const arrays dynamically indexed, `LAYER_SLOTS` declared in GLSL; every caller of layerDistance(), layersField() and cakeRoughnessOf() on its new signature); writeCakeUniforms() and retargetParts() allocate nothing; no change to disposal, resize or input; all three steps' Agent QA blocks pass; agent checks 1 to 4 pass (server started for check 3 and stopped); browser not run.
- **2026-11-25T23:03Z** — **ruled**: The Lead Developer’s three rulings after manual QA, applied: the topping is carved by plain copies of the layers (inset 1.5 mm, seam 2 mm, dip 1.5 mm, Decision 10); the jam is 0.5 translucent through a shared throughTranslucent() (Decision 11); the cheesecake’s eaten maximum is 0.9 (Decision 12). Manual QA steps 1, 2, 4 and 6 amended; browser not run.
- **2026-11-25T23:11:30Z** — **done**: the Lead Developer’s manual QA passed, including the
  QA fix round (topping carve, translucent jam, cheesecake maximum 0.9).
