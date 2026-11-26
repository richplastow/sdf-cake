---
title: Plate textures
description: Makes the wooden, stone and ancient metal plates read as their materials, with grain, pits and speckles, dints, scratches and patina, in the shading and the stone's field.
type: plan
---

## Context

- Delivers three plate textures: the Bánh Bò's wood with varying colour
  and grain ridges; the pancake's stone with mottled colour, pits,
  speckles and an uneven slab; and the honey cake's copper and the
  Artemis offering's gold as ancient metal, dinted, scratched and worn
  to a patina.
- Today each plate is one colour and one roughness from the palette
  (`docs/src/cake/materials.js`) over the exact profile of
  [Plan 02](../done/02-plate-and-layers.md) in `docs/src/sdf/plate.js`.
- Builds on [Plan 08](../done/08-crumb.md), whose holes, inclusions and
  irregularity the stone reuses, and on [Plan 14](14-better-sponge.md),
  whose jittered octave keeps the stone's pits off a lattice; feeds
  [Plan 20](20-lighting.md), whose sheen reads over the wear.
- The noise is Plan 08's valueNoise(), after iq's
  [value noise](https://iquilezles.org/articles/morenoise/); the bumps
  bend the normal as Blinn's
  [Simulation of Wrinkled Surfaces](https://dl.acm.org/doi/10.1145/965139.507101)
  does, by a height function's finite differences.

## Decisions

1. **A texture per plate material.** The palette gains `texture`:
   `"wood"` on `wood`, `"stone"` on `stone`, `"wornMetal"` on
   `brushedCopper` and `brushedGold`; absent means plain. A
   `plateTexture` uniform carries its id, 0 plain, 1 wood, 2 stone, 3
   worn metal, copied at retarget, never sprung. The pattern is anchored
   to the plate's own space, so the two metal plates share it.
2. **Shading only, but for the stone's pits.** The wood, the metal and
   the stone's colour change the albedo, the roughness and the normal at
   the hit: a plateBumpNormal() reads a texture's height function three
   times more at the hit and tilts the normal by its gradient, so the
   march costs the same and the silhouette stays the exact profile. The
   stone's pits and unevenness are in the field, as a layer's holes and
   irregularity are, so they show on the slab's edge and catch the
   shadows.
3. **Wood**, first guesses: grain from valueNoise() stretched 1 to 6
   along a fixed grain direction, cells `WOOD_GRAIN_CELL_METERS` 0.012;
   rings `sin(WOOD_RING_WAVES_PER_METER × d + grain)`, d the distance
   from an axis `WOOD_RING_OFFSET_METERS` 0.08 off the plate's,
   `WOOD_RING_WAVES_PER_METER` 500; the albedo mixes from `color` to
   `WOOD_DARK_GRAIN_COLOR` `#6e5440` by the ring term, the roughness
   varies by `WOOD_ROUGHNESS_VARY` 0.1, and the ring term is the bump's
   height at `WOOD_RIDGE_METERS` 0.0002.
4. **Stone.** The recipe's plate gains a layer's `irregularityMeters`
   and `inclusions`, and the material's `holeStrength` and
   `holeCellMeters` count: for the pancake's plate, 0.0005 m, 0.25 and
   0.003 m, with `inclusions: { grit: 400 }`. A fourth inclusion kind,
   `grit`, `#d9d4c7`, roughness 0.7, 2 by 1 by 1.5 mm, joins
   `INCLUSION_KINDS`, and inclusionAt() takes four weights. The plate's
   field cuts the holes, unskinned, within `CRUMB_CLIP_METERS` of the
   profile, and displaces it by its irregularity; plateBoundDistance()
   subtracts the amplitude, and writeCakeBounds() grows the plate's
   cylinder by it. A `plateCrumb` vec4 and `plateInclusionWeights` vec4
   carry them, the lengths sprung on the length spring as a layer's are.
   The albedo is mottled by valueNoise() at `STONE_MOTTLE_CELL_METERS`
   0.015 by `STONE_MOTTLE` 0.12 of its luminance, and takes the grit's
   colour where inclusionAt() finds a speckle at the surface, with no
   inset. The resolved plate's new fields:

   ```json
   {
     "holeStrength": 0.25,
     "holeCellMeters": 0.003,
     "inclusionCellMeters": 0.0135,
     "inclusionWeights": [0, 0, 0, 1],
     "irregularityMeters": 0.0005
   }
   ```

5. **Worn metal**, first guesses: patina where valueNoise() at
   `PATINA_CELL_METERS` 0.02 passes `1 − PATINA_COVERAGE`, 0.35, softly,
   mixing the albedo to the material's `patinaColor`, `#3f7a6a` on the
   copper and `#8a7a4e` on the gold, and raising the roughness by
   `PATINA_ROUGHNESS` 0.2; scratches as thin lines of noise stretched 1
   to 40 along hashed directions in cells of `SCRATCH_CELL_METERS` 0.01,
   raising the roughness to `SCRATCH_ROUGHNESS` 0.7 along them and
   bumping the normal by `SCRATCH_DEPTH_METERS` 0.00005; dints as one
   dome per cell of `DINT_CELL_METERS` 0.015 where the cell's hash passes
   `DINT_CHANCE` 0.3, `DINT_RADIUS_METERS` 0.006 wide and
   `DINT_DEPTH_METERS` 0.0004 deep, as bumps.
6. **Performance** is measured once, by
   [Plan 03's frame-time snippet](../done/03-frame-budget.md#manual-qa)
   on `#pancake`, whose plate's holes are in the field, at a device
   pixel ratio of 2 against the live site; the wood and the metal add
   hit-only work.

## Steps

### Step 1: Wood [P]

- `docs/src/cake/materials.js`: `texture` on `wood`.
- `docs/src/sdf/plate.js`: woodHeightAt(), woodAlbedoAt() and
  woodRoughnessAt(), by Decision 3.
- `docs/src/sdf/cake.js`: the `plateTexture` uniform; cakeAlbedoOf() and
  cakeRoughnessOf() read the texture for a plate hit.
- `docs/src/raymarch/fragment.js`: plateBumpNormal() applied to a plate
  hit's normal before shadeAt().
- `docs/src/cake/resolve.js` and `docs/src/motion/cake-motion.js`: the
  plate's `texture` id resolved and copied at retarget.
- It should show grain rings of varying colour and ridges on the Bánh
  Bò's plate (Manual QA 1).
- It should leave the china and paper plates plain (Manual QA 5).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; console.log(RECIPES.map((r) => resolveRecipe(r).plate.texture).join(","));'`
- Expect: `0,0,0,0,0,0,0,0,0,0,1,0` after this step alone, and
  `0,0,0,0,0,2,3,3,0,0,1,0` once Steps 2 and 3 are in.

### Step 2: Stone

- `docs/src/sdf/crumb.js`: the `grit` kind; inclusionAt() takes four
  weights.
- `docs/src/cake/recipes.js`: the pancake's plate's `irregularityMeters`
  and `inclusions`; `docs/src/cake/materials.js`: `stone`'s holes and
  `texture`.
- `docs/src/cake/resolve.js`: the plate's crumb resolved as a layer's
  is, and validated; `docs/src/motion/cake-motion.js`: its lengths
  sprung.
- `docs/src/sdf/plate.js`: plateField() cuts the holes and displaces
  the profile; plateBoundDistance() subtracts the amplitude; the mottle
  and speckles in the plate's albedo.
- `docs/src/sdf/cake.js`: the `plateCrumb` and `plateInclusionWeights`
  uniforms.
- It should show a mottled grey slab, pitted, speckled and faintly
  uneven, under the pancake (Manual QA 2).
- It should keep every layer's inclusions as they were (Manual QA 6).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const p = resolveRecipe(RECIPES.find((r) => r.id === "pancake")).plate; console.log(p.holeStrength, p.holeCellMeters, p.inclusionWeights.join(","), p.irregularityMeters, p.inclusionCellMeters > 0);'`
- Expect: `0.25 0.003 0,0,0,1 0.0005 true`.
- Do: `node --input-type=module -e 'import { INCLUSION_KINDS } from "./docs/src/sdf/crumb.js"; console.log(INCLUSION_KINDS.length, INCLUSION_KINDS[3].name);'`
- Expect: `4 grit`.

### Step 3: Worn metal [P]

- `docs/src/cake/materials.js`: `texture` and `patinaColor` on
  `brushedCopper` and `brushedGold`.
- `docs/src/sdf/plate.js`: wornMetalHeightAt(), wornMetalAlbedoAt() and
  wornMetalRoughnessAt(), by Decision 5; `docs/src/sdf/cake.js`: a
  `platePatinaColor` uniform.
- It should show dints, scratches and patina on the copper dish and the
  gold plate (Manual QA 3, 4).

**Agent QA**

- Do: `for f in docs/src/sdf/plate.js docs/src/sdf/crumb.js docs/src/sdf/cake.js docs/src/raymarch/fragment.js docs/src/cake/resolve.js docs/src/cake/materials.js docs/src/cake/recipes.js docs/src/motion/cake-motion.js; do node --check "$f"; done`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
wood, stone, copper and gold plates read as their materials.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#banh-bo` in Chrome on the M4 MacBook with the
dev tools console open, and hard-reload. Keep the live site,
`https://richplastow.com/sdf-cake/`, in a second window of the same size.
Every step also expects no error, warning or shader log in the console.

1. **Do:** Look at the plate, then zoom in on its rim.
   - **Expect:** Grain rings of lighter and darker wood across the
     plate; the light catches ridges along them; the plate's edge stays
     smooth.
2. **Do:** Reload at `#pancake`, press Up until the pancake shows, and
   look at the slab from above and at its edge.
   - **Expect:** A mottled grey stone with small pits and pale speckles,
     its top faintly uneven, the pits showing on the edge too; the
     pancake sits on it with no gap.
3. **Do:** Reload at `#pepionkh-honey-cake` and zoom in on the copper
   dish's floor and lip.
   - **Expect:** Patches of green patina, fine scratches that catch the
     light, and shallow dints; the metal still shines between them.
4. **Do:** Reload at `#artemis-offering` and look at the gold plate's
   rim.
   - **Expect:** As step 3, with a dull brownish patina.
5. **Do:** Reload at `#1` and `#custard-pie` in turn.
   - **Expect:** The china and paper plates as on the live site.
6. **Do:** Reload at `#5`, press Up until it is whole and Right once.
   - **Expect:** Raisins and nuts on the cut as on the live site.
7. **Do:** On `#pancake`, set `MAX_PIXEL_RATIO` in `docs/src/main.js` to
   `2`, hard-reload, double-click to reset the view, and run Plan 03's
   snippet in both windows; restore the value to `1`.
   - **Expect:** Within about 25 % of the live site's figure; note both
     in the Audit entry.
8. **Do:** On `#pancake`, press Left from the first step to walk back to
   `#fun-facts`, then Right to return.
   - **Expect:** The stone's texture arrives with the slab; no pattern
     flickers as it grows.
9. **Do:** Repeat step 2 at a phone-sized viewport in the dev tools'
   device mode, in the light colour scheme.
   - **Expect:** As step 2.

## Audit

- **2026-11-26T18:15:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 18. Proposed by the agent: shading-only
  textures but for the stone's pits, every constant and colour, the
  `grit` inclusion kind, the plate's crumb as a layer's, and the two
  metal plates sharing one pattern.
