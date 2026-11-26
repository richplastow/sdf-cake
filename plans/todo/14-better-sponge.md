---
title: Better sponge
description: Breaks the crumb's visible lattice with a turned, jittered first octave, skins the holes under the crust and shades their cavities, so the Victoria sponge looks edible.
type: plan
---

## Context

- Delivers a crumb that reads as cake, not a bath sponge: no rows or
  columns of holes on a cut face, no repeating pattern seen from afar, a
  smooth baked skin on the outer surfaces, and a finer, warmer, shaded
  crumb for the Victoria sponge, whose `sponge` material a colleague
  called "like a bath sponge".
- Builds on [Plan 08](../done/08-crumb.md), which took Inigo Quilez's
  [fbm SDF](https://iquilezles.org/articles/fbmsdf/) with two octaves,
  the first on an unturned cubic lattice of the material's
  `holeCellMeters`, and on its crust colouring in `docs/src/sdf/cake.js`.
- Feeds [Plan 19](19-plate-textures.md), whose stone plate reuses the
  crumb; independent of every other plan after it.
- An infinite fractal zoom into the crumb, the "megazoom", waits in the
  backlog, [20261126-megazoom.md](backlog/20261126-megazoom.md).

## Decisions

1. **The cause.** holesDistance() in `docs/src/sdf/crumb.js` puts octave
   0's spheres exactly at the corners of an axis-aligned grid of
   `holeCellMeters`, so a vertical cut face and a horizontal top each
   slice rows of corners; octave 1 is turned by `HOLE_OCTAVE_TURN` but is
   half the size, so it cannot hide octave 0's rows. Read in the code on
   2026-11-26, not yet confirmed in the browser.
2. **Octave 0 is turned and every sphere is jittered.** The cell
   coordinates are turned once by `HOLE_BASE_TURN`, half of
   `HOLE_OCTAVE_TURN` (iq's matrix is twice a rotation), before the
   octave loop, a pure rotation that keeps the distance exact. Each
   sphere's centre moves from its corner by up to `HOLE_JITTER_CELLS`,
   0.25, of a cell along each axis by its corner's hash, at most one
   extra hash per corner. The greatest radius stays half a cell, and
   0.25 + 0.5 is under 1, so a sphere from a cell outside the eight
   checked cannot reach the point: the eight-corner check stays exact,
   and the cut still only raises the distance, so the layer's bound holds
   as Plan 08 measured.
3. **The holes are skinned under the crust.** A layer's holed distance
   becomes `min(holed, max(plain, -plain - HOLE_SKIN_METERS))`, the
   holed layer united with its own outer shell `HOLE_SKIN_METERS`,
   1.5 mm, deep, so every outer surface is solid and smooth and the holes
   open only on a cut face, beneath a crust rim as deep as the skin. A
   union of two bounds is a bound, so no step factor changes. The skin is
   applied in layerDistance() alone: layerHoleFilledAt() keeps reading
   the unskinned holes, so the Bolo Formigueiro's chocolate flecks still
   show on its outer surface. Tuning value, to tune by eye.
4. **The `sponge` material retuned**, first guesses by eye: colour
   `#e9c46a` to `#eed59a`, a paler golden crumb; roughness 0.9 to 0.8;
   `holeCellMeters` 0.004 to 0.0025; `holeStrength` 1 to 0.7. Every
   other material keeps its values: the dark chocolate sponges and the
   pandan sponge already look right.
5. **The cavities are shaded.** At a hit on a layer whose hole strength
   is above 0, an occlusion term scales the indirect diffuse and the
   indirect specular, as Three.js's own `aomap_fragment` chunk scales
   them by an occlusion map (r187, verified 2026-11-26): iq's SDF
   ambient occlusion, the field read `AO_SAMPLES`, 4, times along the
   normal `AO_STEP_METERS`, 0.001, apart, each shortfall weighted by half
   the last's, times `AO_STRENGTH`, 2, from his
   [Rendering Worlds with Two Triangles](https://iquilezles.org/articles/nvscene2008/)
   (link not reachable from the terminal on 2026-11-26; cited from
   reference material). The field reads are at the hit only, four more
   beside the normal's four, never per march step.
6. **Performance** is measured once, by
   [Plan 03's frame-time snippet](../done/03-frame-budget.md#manual-qa)
   on `#3` at a device pixel ratio of 2, against the live site, which
   runs the code before this plan. The jitter adds one hash per corner,
   the skin two operations per layer, and the occlusion four field reads
   per layer hit.

## Steps

### Step 1: Turn and jitter the first octave

- `docs/src/sdf/crumb.js`: `HOLE_BASE_TURN` and `HOLE_JITTER_CELLS`;
  holeSpheresDistance() jitters each corner's centre; holesDistance()
  turns the cells before its loop.
- It should show no rows or columns of holes on a cut face (Manual
  QA 2).
- It should repeat no visible pattern across a cut face from afar
  (Manual QA 3).
- It should keep the eight-corner check exact: the jitter plus the
  greatest radius stays under one cell (Agent QA).

**Agent QA**

- Do: `node --check docs/src/sdf/crumb.js`
- Expect: no output.
- Do: `grep -c "HOLE_JITTER_CELLS = 0.25" docs/src/sdf/crumb.js`
- Expect: `1`.
- Do: `node -e 'console.log(0.25 + 0.5 < 1)'`
- Expect: `true`.

### Step 2: Skin the holes and retune the sponge

- `docs/src/sdf/crumb.js`: `HOLE_SKIN_METERS` and a
  skinnedHolesDistance() that unites holesDistance() with the shell.
- `docs/src/sdf/layers.js`: layerDistance() reads the skinned holes.
- `docs/src/cake/materials.js`: the `sponge` entry of Decision 4.
- It should show the Victoria sponge's outer side smooth, with its
  crust, and holes only on the cut (Manual QA 1, 2).
- It should leave the Bolo Formigueiro's outer flecks as they are
  (Manual QA 6).
- It should give the Victoria sponge a paler, finer crumb (Manual QA 1).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const l = resolveRecipe(RECIPES[2]).layers[0]; console.log(l.color, l.roughness, l.holeCellMeters, l.holeStrength);'`
- Expect: `#eed59a 0.8 0.0025 0.7`.
- Do: `grep -c "skinnedHolesDistance" docs/src/sdf/layers.js docs/src/sdf/cake.js`
- Expect: `docs/src/sdf/layers.js:1` and `docs/src/sdf/cake.js:0`.

### Step 3: Shade the cavities

- `docs/src/raymarch/fragment.js`: an occlusionAt() of Decision 5, and
  shadeAt() scales the indirect terms by it for a layer hit whose hole
  strength is above 0.
- It should show the walls of each hole darker than the cut face around
  it (Manual QA 2).
- It should leave the plate and the topping shaded as before (Manual
  QA 6).
- It should hold the frame time within reach of the live site's (Manual
  QA 7).

**Agent QA**

- Do: `for f in docs/src/sdf/crumb.js docs/src/sdf/layers.js docs/src/cake/materials.js docs/src/raymarch/fragment.js; do node --check "$f"; done`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
Victoria sponge's cut face shows an irregular, skinned, shaded crumb with
no rows of holes.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#3`, the Victoria sponge, in Chrome on the M4
MacBook with the dev tools console open, and hard-reload. Keep the live
site, `https://richplastow.com/sdf-cake/#3`, in a second window of the
same size for the comparisons. Every step also expects no error, warning
or shader log in the console.

1. **Do:** Look at the page after the reload, and press Up until the
   whole cake shows.
   - **Expect:** A paler, golden crumb than the live site's; the outer
     side of each sponge layer is smooth with a faint crust, with no
     pits in it.
2. **Do:** Press Right once, then scroll in until the zoom stops and
   drag to look straight at the cut face.
   - **Expect:** Holes of varied size and spacing, with no vertical
     columns or horizontal rows, each hole's inside darker than the flat
     crumb round it; a solid rim about 1.5 mm deep where the cut meets
     the outer surface.
   - **Why:** The lattice, the skin and the occlusion.
3. **Do:** Scroll out until the zoom stops, and watch the cut as the
   turntable turns it.
   - **Expect:** No stripes, grid or repeating tile across the cut face.
4. **Do:** Reload at `#1` and `#banh-bo` in turn, press Up until each is
   whole and Right once, and look at the cut.
   - **Expect:** The same irregular, skinned crumb; their colours as on
     the live site.
5. **Do:** Reload at `#pancake` and `#pepionkh-honey-cake` in turn, press
   Up until each is whole and Right once, and zoom in on the cut.
   - **Expect:** An irregular crumb with no rows, under the scorched
     skin.
6. **Do:** Reload at `#bolo-formigueiro`, press Up until it is whole and
   Right once.
   - **Expect:** Chocolate flecks on the outer surface and the cut, as on
     the live site; the glaze and the plate shaded as on the live site.
7. **Do:** On `#3`, set `MAX_PIXEL_RATIO` in `docs/src/main.js` to `2`,
   hard-reload, double-click to reset the view, and run Plan 03's
   snippet in both windows; restore the value to `1`.
   - **Expect:** Within about 20 % of the live site's figure; note both
     in the Audit entry.
8. **Do:** On `#3`, press Down to the plate and Up again, step by step.
   - **Expect:** Each sponge layer grows in with a smooth outer side, no
     pits flashing as it appears.
9. **Do:** Repeat step 2 at a phone-sized viewport in the dev tools'
   device mode, in the dark colour scheme.
   - **Expect:** The crumb reads as in step 2.

## Audit

- **2026-11-26T18:10:00Z** — **drafted**: split from the visual
  refinements brief as the first of Plans 14 to 20. Proposed by the
  agent: the cause in Decision 1, the base turn and the 0.25-cell jitter,
  the 1.5 mm skin and its exemption for filled holes, the `sponge`
  values of Decision 4, the cavity occlusion and its constants, and
  measuring on `#3` alone.
