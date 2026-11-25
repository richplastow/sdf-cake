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
  [the research's architecture, section 2](01-presentation-mode-research.md#2-the-parts-as-fields),
  with the hole construction measured in
  [the research's measurements](01-presentation-mode-research.md#the-hole-construction-the-research-recommends),
  from Inigo Quilez's [fbm SDF](https://iquilezles.org/articles/fbmsdf/),
  [smooth minimum](https://iquilezles.org/articles/smin/) and
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/).
- Depends on [Plan 07](../done/07-sliders.md), so the cut and the reveal expose
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
   layer's amplitude is above 0.
7. **Uniforms**, arrays of `LAYER_SLOTS`: `layerHoleStrengths`,
   `layerHoleCellsMeters`, `layerInclusionCellsMeters`,
   `layerInclusionWeights` as a `vec3`, and `layerIrregularitiesMeters`;
   the resolver fills them from the palette and the recipe, and Plan 05's
   springs tween the strengths, cells and amplitudes like any length.
8. **The step cap** stays at 96; Manual QA looks for the grazing pixels
   that exhausted rays leave at the silhouette, and the Audit entry says
   whether 128 is needed.
9. **Performance** is measured on the fruit cake, the heaviest crumb,
   against Plan 06's numbers.

## Steps

### Step 1: The holes

Adds `docs/src/sdf/crumb.js` with holesDistance() per Decision 2;
changes `docs/src/sdf/layers.js` to subtract them per slot within the
clip, `docs/src/sdf/cake.js` and `docs/src/cake/resolve.js` for the two
hole uniforms, and `docs/src/cake/materials.js` if the palette's crumb
columns are not yet read.

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
`docs/src/cake/resolve.js` for the two inclusion uniforms.

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
changes `docs/src/sdf/layers.js` to apply it, `docs/src/raymarch/fragment.js`
for the step factor, and `docs/src/cake/resolve.js` for the uniform and
the cap.

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
console, and hard-reload.

1. **Do:** Press Right twice to widen the cut, drag it to face the camera
   and zoom in on it.
   - **Expect:** Both sponge layers' cut faces are pitted with holes of
     two sizes, the smaller inside the larger, with shadow inside the
     holes; the jam seam is smooth; the console is clean.
2. **Do:** Walk to the Black Forest and look at its cut.
   - **Expect:** The three dark sponge layers are pitted and the two
     cream seams are smooth.
3. **Do:** Press Down until only the plate and the bottom layer are shown,
   and look at that layer's top.
   - **Expect:** Its top is pitted as its cut face is.
4. **Do:** Walk to the chocolate cake and zoom in on its cut.
   - **Expect:** Dark flat patches of chocolate chip in each sponge
     layer's face, none in the ganache seams, and none showing through
     the ganache on the outside.
5. **Do:** Walk to the fruit cake, press Right to widen the cut, and zoom
   in.
   - **Expect:** Many dark raisin patches and fewer paler nut patches
     across the face, in a scattered, non-repeating arrangement; the
     marzipan outside shows none.
6. **Do:** Walk to the cheesecake, where no topping hides the layers, and
   look along its side against the light.
   - **Expect:** A gentle, low-frequency lumpiness to the surface, with no
     banding, flicker or holes torn in the silhouette.
   - **Why:** The irregularity breaks the distance bound; the step factor
     must keep the march safe.
7. **Do:** On the fruit cake, look at the cake's silhouette against the
   page at the load zoom.
   - **Expect:** No stray background pixels along the edge beyond what
     Plan 02 showed; if there are, note it for the step cap in the
     Audit entry.
8. **Do:** On the fruit cake, record 5 s in the Performance panel and
   compare with Plan 06's numbers.
   - **Expect:** A steady frame time; note its value in the Audit entry.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: fractal holes per material
  within a clip, inclusions as volumes of material read once per hit,
  the three inclusion kinds, irregularity with its cap and step factor,
  and the crumb uniforms.
