---
title: Better sponge
description: Breaks the crumb's visible lattice with a turned, jittered first octave, lets only a lesser crumb through a skin on the outer surfaces, and shades and warms the holes' cavities, so the Victoria sponge looks edible.
type: plan
---

## Context

- Delivers a crumb that reads as cake, not a bath sponge: no rows or
  columns of holes on a cut face, no repeating pattern seen from afar, a
  baked skin on the outer surfaces that shows fewer, narrower holes than
  a cut face, holes whose crumb turns a warmer, browner shade as it
  darkens into them, and a finer, paler crumb for the Victoria sponge, whose
  `sponge` material a colleague called "like a bath sponge".
- Builds on [Plan 08](./08-crumb.md), which took Inigo Quilez's
  [fbm SDF](https://iquilezles.org/articles/fbmsdf/) with two octaves,
  the first on an unturned cubic lattice of the material's
  `holeCellMeters`, and on its crust colouring in `docs/src/sdf/cake.js`.
- Feeds [Plan 19](../todo/19-plate-textures.md), whose stone plate reuses the
  crumb; independent of every other plan after it.
- An infinite fractal zoom into the crumb, the "megazoom", waits in the
  backlog, [20261126-megazoom.md](../todo/backlog/20261126-megazoom.md).

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
   0.25 + 0.5 is under 1, so a sphere from a corner outside the eight
   checked lies at least a quarter cell from the point and never holds
   it: the eight-corner check stays exact inside every hole and within a
   quarter cell of one, where the surface is. Farther off, deep in the
   crumb, it may read the holes up to 0.3 cells too far, which only
   lowers the field inside the solid, never outside it. The cut still
   only raises the distance, so the layer's bound holds as Plan 08
   measured.
3. **A skin lets a lesser crumb through to the outer surfaces.** A
   layer's holed distance becomes `min(holed, skin)`: the holed layer
   united with its own outer shell, `HOLE_SKIN_METERS`, 1.5 mm, deep,
   cut by the same holes shrunk by `HOLE_SKIN_ERODE`, 0.3 of each
   octave's greatest radius. The smaller holes stay shut beneath the
   skin and the larger open through it narrower, into the hole beneath,
   so an outer surface shows a lesser crumb than a cut face: in a JS
   port of the field, the share of an outer surface opened more than
   0.1 mm deep is about a third of a cut face's (Victoria sponge 0.033
   against 0.120, chocolate sponge 0.112 against 0.291, pandan 0.096
   against 0.287), and the flatbread's tiny holes stay shut. The shrunk
   holes reuse each octave's sphere distances, so the skin costs one
   more smooth maximum per octave. A shrunk sphere's distance is still a
   bound, and so is a union of two: the port measured the gradient near
   the surface at 1.00, so no step factor changes. The skin is applied
   in layerDistance() alone: layerHoleFilledAt() keeps reading the bare
   holes, so the Bolo Formigueiro's chocolate flecks show on its outer
   surface as before. Tuning values, to tune by eye.
4. **The `sponge` material retuned**, first guesses by eye: colour
   `#e9c46a` to `#eed59a`, a paler golden crumb; roughness 0.9 to 0.8;
   `holeCellMeters` 0.004 to 0.0025; `holeStrength` 1 to 0.7. Every
   other material keeps its values: the dark chocolate sponges and the
   pandan sponge already look right.
5. **The cavities are shaded.** At a hit on a layer whose hole strength
   is above 0, an occlusion term, 0 to 1, is applied once both indirect
   terms are in, as Three.js's own `aomap_fragment` chunk applies an
   occlusion map (r187, verified 2026-11-26): it scales the indirect
   diffuse by the occlusion, and the indirect specular by
   computeSpecularOcclusion(dotNV, occlusion, roughness), from
   `lights_physical_pars_fragment`. shadeAt() adds no indirect specular
   today, so only the diffuse changes until
   [Plan 20](../todo/20-lighting.md) adds one. The occlusion is iq's SDF ambient
   occlusion: the hit layer read `AO_SAMPLES`, 4, times along the
   normal, `AO_STEP_METERS`, 0.001, apart, as the sub-point below sets
   out; sample i's shortfall, `(i × step − d) /
   step`, is in steps, unitless, weighted by 1/2^i, summed, and times
   `AO_STRENGTH`, 2, taken from 1 and clamped to 0 to 1, from his
   [Rendering Worlds with Two Triangles](https://iquilezles.org/articles/nvscene2008/)
   (link not reachable from the terminal on 2026-11-26; cited from
   reference material). The reads are at the hit only, never per march
   step. The occlusion fades in with the hole strength up to
   `AO_FADE_STRENGTH`, 0.1, below every holed material's strength, so a
   strength springing to or from 0 never switches it in one frame. A
   layer whose holes are filled, the Bolo Formigueiro's, has no
   cavities and reads none. Tuning values, to tune by eye.
   - **The occlusion reads the hit layer alone.** Each read is the hit
     slot's layerDistance(), holed beneath its skin, with the half-space
     beyond the eaten slice's face on the hit's side cut from it, never
     the whole field. The whole field, read through cakeFieldOf(), held
     three lower bounds that lie millimetres short of the true distance
     and so read as occluders, each measured in a JS port: the
     decorations' slab, whose floor 10 mm below the topping's base
     darkened a band 1 to 2 mm tall round every holed layer's side
     (occlusion 0 at 1 to 1.5 mm below the floor, 0.5 at 2 mm), the dark
     line that rose with each landing layer; the scatter's clamp to
     `unchecked`, 1.42 mm on the Pepi’Onkh honey cake, which read the
     whole cap of its invisible topping as occluded (occlusion 0 out to
     33 mm from the axis, 1 beyond 35 mm), a darker disc where the
     topping sits; and the facing cut face across a narrow slice
     (occlusion 0 out to 6 mm from the axis at 36 degrees eaten, 10 mm at
     20 degrees, 2 mm at 90 degrees), which left the apex lit by nothing
     where Plan 11's cast shadow had already taken the direct light. With
     the face on the hit's side alone, the port reads 1 there at every
     angle; the cast shadow is unchanged. The crease shadow round 1 drew
     where a holed layer meets another part goes with them.
   - **Only a cavity occludes.** The occlusion fades in with the hit's
     depth below the plain layer, cut by the same face, over
     `AO_DEPTH_FADE_METERS`, 0.2 mm, and a hit on the plain surface reads
     none and skips the four reads. That plain shape is convex, but for
     its gentle irregularity, so nothing of it rises above a surface
     point's tangent plane. Its edges are sharp, though: where a cut face
     meets an outer surface, and at every hole's rim. The normal, read
     0.5 mm about the hit, is blended across them, and the reads along it
     meet the corner, where `max()` lies short of the true distance, so
     every such edge read as a cavity, warmed and darkened: the orange
     line round every cut and the orange ring round every hole on a cut
     face. In a JS port of the Victoria sponge's layer cut at 36 degrees,
     the cut face's mean occlusion was 0.00 to 0.04 from 0.1 to 0.3 mm
     below the top edge, and 0.85 across the face away from it, with 7 %
     of hits under 0.5, nearly all on the flat face beside a hole; with
     the fade, 0.98 to 1.00 everywhere, while hits more than 0.3 mm deep
     in a hole keep their occlusion. Tuning value, to tune by eye.
6. **Performance** is measured once, by
   [Plan 03's frame-time snippet](./03-frame-budget.md#manual-qa)
   on `#3` at a device pixel ratio of 2, against the live site, which
   runs the code before this plan. The jitter adds one hash per corner,
   the skin one smooth maximum per octave and two operations per layer
   read, and the occlusion four reads of the hit layer alone per holed
   layer hit in a cavity, each a plain layer and its two octaves of
   holes, beside the normal's four whole-field reads, and one plain layer
   read per holed layer hit to find the cavity; the warmth is a few
   operations at the hit.
7. **The crumb warms into its holes.** At a holed layer's hit, the
   albedo, not the lighting, is filtered by `HOLE_WARM_COLOR`, sRGB
   `#e8b48c`, raised to the cavity's depth, 1 less the faded occlusion,
   in warmedCrumbAlbedo(): a filter that absorbs, so the crumb turns a
   warmer, browner shade of itself, as light that reaches deep into a
   hole has bounced off the crumb, and been absorbed by it, more often.
   Colours stay in linear space, as Three.js's colour management has
   them. At full depth, by a port of the formula, the Victoria sponge
   `#eed59a` turns to `#d89652`, the moon sponge `#eceef3` to `#d7a885`,
   the chocolate sponge `#5a3a22` to `#51260d`, the pandan `#7cc35a` to
   `#70892e`, each at about 0.5 to 0.6 of its luminance. A filter brought
   back to the crumb's own luminance, as first built, cannot darken: on a
   pale crumb it pushed red past the albedo's own, `#eed59a` to
   `#ffc066` and `#eceef3` to `#ffdda9`, the bright orange the second
   manual QA found in the outer pits and on the cut. Shadow rays treat
   the crumb as solid, so a pit's floor takes the direct light in full,
   and only the albedo can make it read as shade there. No field is read
   for it. Tuning value, to tune by eye.
8. **The Pepi’Onkh honey cake's invisible topping has no reveal stop,
   and its seeds sit on the bread.** The Lead Developer's request at the
   second manual QA, beyond the plan's first scope. The topping, which
   draws nothing, had a stop of its own that showed no change; it now
   comes in with the top layer, so its cap is in place before the seeds
   drop onto it, and the slider has 4 as its top stop rather than 5. The
   rule is keyed on the topping's `isInvisible`, which only this cake
   uses, in revealPartsOf() and presenceMaskFor(); its script's beats at
   5 move to 4, and every other cake's stops, cap and script are
   unchanged. The seeds sat on the cap's top, 0.8 mm above the bread: an
   invisible topping now has no top but its base, so what sits on it sits
   on the layer beneath, lowering the seeds by 0.8 mm, within the 0.5 to
   1 mm asked for. The height eases with the topping's sprung invisible
   weight, so no seed jumps as one cake springs to another. In a port of
   the seeds' tilt, size and embed over the bread's 1 mm irregularity,
   which rises and falls up to 0.8 mm within the cap, 98 % of seeds
   floated, by a median 0.48 mm; lowered by 0.8 mm, 5 % float, by at
   most 0.24 mm, the median seed sits 0.33 mm into the bread, near its
   designed embed of 0.28 mm, and 1 % sink past nine tenths of their
   height. A thinner invisible cap would lower them too, but the stack's
   smooth blend follows the topping's thickness, so it would also
   sharpen the bread's and honey's joins.

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
- Do: `awk -F'= ' '/HOLE_JITTER_CELLS = [0-9]/ { print ($2 + 0.5 < 1) }' docs/src/sdf/crumb.js`
- Expect: `1`: the jitter plus the greatest radius, half a cell, is
  under one cell.
- Do: `grep -c "HOLE_BASE_TURN" docs/src/sdf/crumb.js`
- Expect: `2` or more: declared and used.

### Step 2: Skin the holes and retune the sponge

- `docs/src/sdf/crumb.js`: `HOLE_SKIN_METERS` and `HOLE_SKIN_ERODE`; a
  holedDistances() that cuts the holes and the skin's shrunk holes in one
  pass, read by holesDistance() bare and by skinnedHolesDistance().
- `docs/src/sdf/layers.js`: layerDistance() reads the skinned holes.
- `docs/src/cake/materials.js`: the `sponge` entry of Decision 4.
- It should show fewer, narrower holes on the outer surfaces than on the
  cut, with the crust, and no deep pitting on the Victoria sponge
  (Manual QA 1, 2).
- It should show the lower Victoria sponge's top holed through the
  translucent jam (Manual QA 11).
- It should leave the Bolo Formigueiro's outer flecks as they are
  (Manual QA 6).
- It should give the Victoria sponge a paler, finer crumb (Manual QA 1).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const l = resolveRecipe(RECIPES[2]).layers[0]; console.log(l.color, l.roughness, l.holeCellMeters, l.holeStrength);'`
- Expect: `#eed59a 0.8 0.0025 0.7`.
- Do: `grep -c "skinnedHolesDistance" docs/src/sdf/layers.js docs/src/sdf/cake.js`
- Expect: `docs/src/sdf/layers.js:1` and `docs/src/sdf/cake.js:0`.
- Do: `grep -c "HOLE_SKIN_ERODE = 0.3" docs/src/sdf/crumb.js`
- Expect: `1`.

### Step 3: Shade the cavities

- `docs/src/raymarch/fragment.js`: an occlusionAt() of Decision 5,
  reading the hit layer alone, faded in with the hit's depth below the
  plain layer by `AO_DEPTH_FADE_METERS`; shadeAt() computes it first for
  a layer hit whose hole strength is above 0 and whose holes are not
  filled, warms the albedo by it, and scales the indirect terms by it.
- `docs/src/sdf/crumb.js`: `HOLE_WARM_COLOR` and warmedCrumbAlbedo() of
  Decision 7.
- It should show the walls of each hole darker than the cut face around
  it, and a warmer, browner shade of the crumb the deeper they go, never
  bright orange, on light and dark crumbs alike (Manual QA 2, 15).
- It should draw no line where a cut face meets an outer surface, and no
  ring round a hole on a cut face (Manual QA 15).
- It should leave the plate and the topping shaded as before (Manual
  QA 6).
- It should draw no dark band round any layer's side as layers land
  (Manual QA 12).
- It should leave the Pepi’Onkh honey cake's invisible topping unseen
  (Manual QA 13).
- It should light the cut near the axis of a narrow slice as the live
  site does (Manual QA 14).
- It should hold the frame time within reach of the live site's (Manual
  QA 7).
- It should fade the occlusion in with the hole strength, so no layer's
  shading changes in one frame as one cake springs to another (Manual
  QA 10).

**Agent QA**

- Do: `for f in docs/src/sdf/crumb.js docs/src/sdf/layers.js docs/src/cake/materials.js docs/src/raymarch/fragment.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -c "occlusionAt(" docs/src/raymarch/fragment.js`
- Expect: `2` or more: defined, and called in shadeAt().
- Do: `awk '/float occlusionAt\(/,/^  }$/' docs/src/raymarch/fragment.js | grep -c "cakeFieldOf"`
- Expect: `0`: the occlusion never reads the whole field.
- Do: `awk '/float occlusionAt\(/,/^  }$/' docs/src/raymarch/fragment.js | grep -c "layerDistance("`
- Expect: `1`.
- Do: `grep -c 'HOLE_WARM_COLOR = "#e8b48c"' docs/src/sdf/crumb.js; grep -c "warmedCrumbAlbedo(" docs/src/raymarch/fragment.js`
- Expect: `1` and `1`.
- Do: `grep -c "HOLE_WARM_MIN_LUMINANCE" docs/src/sdf/crumb.js`
- Expect: `0`: the filter is no longer brought back to the crumb's
  luminance.
- Do: `awk '/float occlusionAt\(/,/^  }$/' docs/src/raymarch/fragment.js | grep -c "layerPlainDistance(\|smoothstep(0.0, AO_DEPTH_FADE_METERS"`
- Expect: `2`: the depth below the plain layer is read, and fades the
  occlusion in.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

### Step 4: Drop the honey cake's empty stop and seat its seeds

- `docs/src/cake/reveal.js`: revealPartsOf() gives an invisible topping
  no part; presenceMaskFor() shows it with the top layer.
- `docs/src/tour/scripts.js`: the `pepionkh-honey-cake` beats at reveal
  5 move to 4.
- `docs/src/sdf/topping.js`: toppingSurfaceHeight() gives an invisible
  topping no top but its base, eased by its sprung weight.
- `docs/src/cake/recipes.js`: comments only.
- It should give every Up on `#pepionkh-honey-cake` a visible change,
  with the seeds at the top stop (Agent QA, Manual QA 16).
- It should leave every other cake's reveal stops, and every script's
  end at its cake's top stop, as they were (Agent QA).
- It should sit the sesame seeds on the bread, neither floating above it
  nor sunk out of sight (Manual QA 16).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { revealPartsOf } from "./docs/src/cake/reveal.js"; import { SCRIPTS } from "./docs/src/tour/scripts.js"; const max = (id) => revealPartsOf(RECIPES.find((r) => r.id === id)).length - 1; console.log(RECIPES.map((r) => r.id + ":" + max(r.id)).join(" ")); console.log(SCRIPTS.every((s) => s.beats.at(-1).reveal === max(s.pageId)));'`
- Expect: `1:7 2:3 3:5 4:7 5:3 pancake:1 pepionkh-honey-cake:4 artemis-offering:8 sachertorte:6 bolo-formigueiro:3 banh-bo:3 custard-pie:4`
  and `true`: the honey cake's top stop is 4, not 5, every other cake's
  is as before, and every script ends at its cake's top stop.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { presenceMaskFor } from "./docs/src/cake/reveal.js"; const h = RECIPES.find((r) => r.id === "pepionkh-honey-cake"); console.log([3, 4].map((k) => JSON.stringify(presenceMaskFor(h, k))).join(" "));'`
- Expect: `{"plate":1,"layers":[1,1,1],"topping":1,"decorations":0} {"plate":1,"layers":[1,1,1],"topping":1,"decorations":1}`:
  the invisible topping comes in with the top layer, the seeds at the
  top stop.
- Do: `awk '/float toppingSurfaceHeight\(/,/^  }$/' docs/src/sdf/topping.js | grep -c "toppingInvisible"`
- Expect: `1`.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 1 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
Victoria sponge's cut face shows an irregular, shaded crumb, warming into
its holes, with no rows of holes, under a skin that shows a lesser crumb,
with no orange line round its cut; and every step of the Pepi’Onkh honey
cake's reveal shows a change, its seeds sitting on the bread.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#3`, the Victoria sponge, in Chrome on the M4
MacBook with the dev tools console open, and hard-reload. Keep the live
site, `https://richplastow.com/sdf-cake/#3`, in a second window of the
same size for the comparisons, and give it the same key presses. `#1`
and `#3` are guess pages: Up stops one part short of the whole cake
until the first Right. The presentation pages, `#pancake` onwards,
autoplay with captions; the first Up or Right pauses it. Every step
also expects no error, warning or shader log in the console.

1. **Do:** After the reload, press Up until it stops, Right once, then
   Up once more, so the whole cake shows with its first slice eaten.
   - **Expect:** A paler, golden crumb than the live site's; the outer
     side and top of each sponge layer show a faint crust and a sparse
     scatter of small holes, fewer and narrower than on the cut, with no
     deep pits.
2. **Do:** Scroll in until the zoom stops and drag to look straight at
   the cut face.
   - **Expect:** Holes of varied size and spacing, with no vertical
     columns or horizontal rows, each hole's inside darker than the flat
     crumb round it and warmer, turning from the pale gold to a browner
     shade of it the deeper it goes, never bright orange; a rim about
     1.5 mm deep where the cut meets the outer surface, with fewer holes
     in it, and no ring round any hole on the flat crumb.
   - **Why:** The lattice, the skin, the occlusion and the warmth.
3. **Do:** Scroll out until the zoom stops, and watch the cut as the
   turntable turns it.
   - **Expect:** No stripes, grid or repeating tile across the cut face.
4. **Do:** Reload at `#1`, and give it step 1's presses; then reload at
   `#banh-bo`, press Up until it is whole and Right once. Look at each
   cut.
   - **Expect:** The same irregular crumb, a sparser one on the outer
     surfaces; their colours as on the live site, but for the holes, which
     turn a darker, redder brown, or on `#banh-bo` a darker olive green,
     as they darken; no shadow where a holed layer meets another layer, the
     topping or the plate beyond the live site's.
5. **Do:** Reload at `#pancake` and `#pepionkh-honey-cake` in turn, press
   Up until each is whole and Right once, and zoom in on the cut.
   - **Expect:** An irregular crumb with no rows, under the scorched
     skin; the outer surfaces as on the live site, the breads' tiny holes
     shut.
6. **Do:** Reload at `#bolo-formigueiro`, press Up until it is whole and
   Right once.
   - **Expect:** Chocolate flecks on the outer surface and the cut, as on
     the live site; the cake, the glaze and the plate shaded as on the
     live site, with no shadow along the layer's join with the plate or
     the glaze.
7. **Do:** Set `MAX_PIXEL_RATIO` to `2` in both windows: in
   `docs/src/main.js` for the local one, and for the live one through
   the dev tools' Sources, Overrides, editing its `main.js`. Hard-reload
   both at `#3`, give each step 1's presses, double-click to reset the
   view, and run Plan 03's snippet in both; then restore the value to
   `1` and remove the override.
   - **Expect:** Within about 20 % of the live site's figure; note both
     in the Audit entry.
8. **Do:** On `#3`, press Down to the plate and Up again, step by step.
   - **Expect:** Each sponge layer grows in with its sparse outer holes,
     none flashing as it appears.
9. **Do:** Repeat step 2 at a phone-sized viewport in the dev tools'
   device mode, in the dark colour scheme.
   - **Expect:** The crumb reads as in step 2.
10. **Do:** Reload at `#4`, press Up until it stops, then Left once, so
    the Victoria sponge springs in from the birthday cake, and watch it
    for 15 seconds without a key press.
    - **Expect:** Each layer's shading, its edges included, settles with
      the cake and then holds: nothing darkens or brightens in one frame,
      about 10 seconds in or at any other time.
    - **Why:** A hole strength springing to 0 fades the occlusion out
      rather than switching it off.
11. **Do:** Reload at `#3` and give it step 1's presses; scroll in on the
    red jam band at the cut and on the cake's side, and drag so the view
    looks slightly down through the jam.
    - **Expect:** The lower sponge's top shows through the jam, with a
      sparse scatter of small holes, as the live site showed it, though
      fewer.
12. **Do:** Reload at `#3`, press Down to the plate, then Up one step at a
    time, watching the outer side of each sponge layer as each layer
    lands; repeat at `#1`, `#4`, `#sachertorte`, `#bolo-formigueiro` and
    `#banh-bo`.
    - **Expect:** No dark line or band round any layer's side, at any
      height, before, during or after a layer lands.
    - **Why:** The occlusion no longer reads the decorations' slab.
13. **Do:** Reload at `#pepionkh-honey-cake`, press Up until it is
    whole, then Down and Up again one step at a time, and Right once.
    - **Expect:** The top bread's top evenly shaded round the sesame
      seeds, with no darker disc where the invisible topping sits, as on
      the live site; Up and Down step as step 16 sets out.
14. **Do:** Reload at `#3` and press Up until it stops, so the cake
    shows with its first, narrowest slice eaten, a tenth of it; drag to
    look into the slice towards the cake's axis. Then press Right once,
    so about a quarter is eaten, and look again.
    - **Expect:** Each time, the cut near the axis lit as on the live
      site: as bright as farther out, but where the other face's cast
      shadow falls, which is as dark as on the live site, never
      near-black; its holes darker and warmer than the crumb round them,
      as elsewhere on the cut.
    - **Why:** The occlusion no longer reads the facing cut face.

15. **Do:** Reload at `#3`, give it step 1's presses, scroll in on the
    cut's top and outer edges, then look at the outer top and side. Then
    reload at `#2` and give it step 1's presses, and reload at
    `#artemis-offering`, press Up until it is whole and Right once; look
    at each cut's edges, the cheesecake base's on its shady side.
    - **Expect:** No orange or dark line along any edge where the cut
      meets the top, the side or the jam; the outer pits and the holes'
      floors a warmer, browner shade of the crumb, never bright orange, on
      the pale moon sponge as on the golden sponge.
    - **Why:** Only a cavity occludes, and the warmth absorbs rather than
      brightens.
16. **Do:** Reload at `#pepionkh-honey-cake` and watch autoplay to its
    end. Then reload, press Up one step at a time to the top, watching
    each step; press Right once, and scroll in on the seeds at the bread's
    top edge, looking across the top.
    - **Expect:** Autoplay's captions as before, "with sesame seeds on
      top." as the seeds drop in. Every Up shows a change: each bread and
      the honey in turn, then the seeds dropping in at the last, with no
      Up that changes nothing. The seeds sit on the bread, partly sunk
      into it, none floating with a gap beneath it, and none sunk out of
      sight.

## Audit

- **2026-11-26T18:10:00Z** — **drafted**: split from the visual
  refinements brief as the first of Plans 14 to 20. Proposed by the
  agent: the cause in Decision 1, the base turn and the 0.25-cell jitter,
  the 1.5 mm skin and its exemption for filled holes, the `sponge`
  values of Decision 4, the cavity occlusion and its constants, and
  measuring on `#3` alone.
- **2026-11-26T21:55:20Z** — **reviewed**: Decisions 2 and 3 tested in
  a JS port (gradient at most 1.06 with the irregularity, 1.00 without;
  no jumps outside; no ray steps through; normals and occlusion unmoved
  by the jitter's deep over-read); Decision 2's exactness claim narrowed
  to within a quarter cell of a hole; Decision 3 notes thin layers and
  the shell's gradient; Decision 5 gives the shortfall in steps, the
  `hidden` read and the specular term per aomap_fragment (r187
  verified); Agent QA in Steps 1 and 3 tied to the code; Manual QA
  preconditions, steps 1, 2, 4 and 7 fitted to Plans 12 and 13 and the
  live site's pixel ratio.
- **2026-11-26T21:59:05Z** — **implemented**: Steps 1 to 3 done.
  `docs/src/sdf/crumb.js`: `HOLE_BASE_TURN`, `HOLE_JITTER_CELLS` and its
  bit-field constants, `HOLE_SKIN_METERS`; holeSpheresDistance() jitters
  each centre from three 10-bit fields of one nextHash() of the radius
  hash; holesDistance() turns the cells before its loop; a new
  skinnedHolesDistance(). `docs/src/sdf/layers.js`: layerDistance() reads
  the skinned holes; layerHoleFilledAt() in `docs/src/sdf/cake.js`
  unchanged. `docs/src/cake/materials.js`: the `sponge` entry of
  Decision 4. `docs/src/raymarch/fragment.js`: `AO_SAMPLES`,
  `AO_STEP_METERS`, `AO_STRENGTH`, occlusionAt(), applied in shadeAt()
  after RE_IndirectDiffuse() for any layer whose hole strength is above
  0, filled-hole layers included. Every Agent QA check failed before the
  work and passes after it. Manual QA unchanged.
- **2026-11-26T22:00:30Z** — **verified**: agent checks pass: 4 changed
  modules parse, no long lines, `/` and the 4 changed files served 200
  (server started for the check and stopped), vendored checksums match;
  GLSL not compiled; browser not run.
- **2026-11-26T22:05:40Z** — **quality-checked**: Fixed: the
  occlusion's on/off gate at hole strength 0 (holeStrength is sprung on
  the colour spring and never snaps, so a layer springing from a holed to
  a hole-less material, such as slot 2 going from `#4` to `#3`, kept a
  crease shadow for about 10 s, until its float underflowed, then lost it
  in one frame; the reverse switched it on in one frame), now faded in
  with the hole strength up to `AO_FADE_STRENGTH`, 0.1, under every holed
  material's 0.15 or more, in `docs/src/raymarch/fragment.js`; Step 3
  gains a criterion, Manual QA 4 and 6 name the crease shadow, and a new
  Manual QA 10 covers the transition. Deferred: AO saturation on fine
  cells (with `AO_STEP_METERS` 1 mm over holes of at most 0.9 mm radius
  on the Victoria sponge, 2 mm on the chocolate sponges, samples 2 to 4
  land back in solid crumb, so every hole's floor reads fully occluded
  and a crease shadow spans about 4 mm: Decision 5's values, to tune by
  eye); the topping and plate sides of a crease stay unoccluded while the
  layer side darkens (the plan scopes the occlusion to layers). Verified
  fine: inclusion hits carry their layer's slot as material id, so they
  are occluded as the crumb is; GLSL ES 3.00 forms (`const mat3` from a
  scaled const, `uvec3 & uint`, uint shifts, short-circuit gate on the
  uniform index); computeSpecularOcclusion() unguarded in r187
  `lights_physical_pars_fragment` and the order of `aomap_fragment`; the
  jitter's 0.25 + 0.5 bound and the turn's orthonormality; the skin a
  no-op where strength is 0 and equal to the plain layer outside it, so
  outer surfaces and the bound gates are unchanged; JS per-frame path,
  resources, resize and input untouched; Agent QA of Steps 1 to 3 and
  agent checks 1 to 4 pass (server started for check 3 and stopped);
  GLSL not compiled; browser not run.
- **2026-11-26T22:59:04Z** — **ruled**: by the Lead Developer, after
  manual QA: some holes on the outer surfaces, fewer or shallower than on
  a cut face, the Victoria sponge's top showing them through the jam
  (Decision 3); the crumb warms towards orange-red into its holes, every
  holed material a little, the pale sponge most (Decision 7). Findings to
  fix at their cause: the honey cake's invisible topping showing, a dark
  line round holed layers that rises as layers land, and the cut near
  the axis near-black under a narrow slice (Decision 5's sub-point).
- **2026-11-26T22:59:04Z** — **implemented**: the five items.
  `docs/src/sdf/crumb.js`: `HOLE_SKIN_ERODE`, 0.3, and a holedDistances()
  that cuts the holes and the skin's shrunk holes in one pass, read by
  holesDistance() and skinnedHolesDistance(); `HOLE_WARM_COLOR`,
  `#ffb98a`, `HOLE_WARM_MIN_LUMINANCE` and warmedCrumbAlbedo().
  `docs/src/sdf/layers.js`: comments only. `docs/src/raymarch/fragment.js`:
  occlusionAt() reads the hit slot's layerDistance() alone, cut by the
  eaten slice's face on the hit's side, never cakeFieldOf(); shadeAt()
  computes it first, skips filled-hole layers, warms the albedo by it and
  scales the indirect terms by it. Causes found in the code and measured
  in a JS port: the occlusion read the decorations' slab (the line, 0 at
  1 to 1.5 mm below its floor, toppingBase − 10 mm), the scatter's clamp
  (the honey cake's cap, 0 out to 33 mm), and the facing cut face (the
  apex, 0 out to 6 mm at 36 degrees eaten); none is new to the field,
  all new to round 1's occlusion, which the live site lacks. The
  topping's cause was fixed, not the topping removed: smaller, and no
  recipe or reveal change. Plan edits: Context, Decisions 3, 5 (its read
  and a sub-point), 6 and a new 7; Step 2 criteria 1 and 2 reworded and
  added, one Agent QA line added; Step 3's work lines, criterion 1
  reworded, criteria 3 to 5 added, four Agent QA lines added; Done when;
  Manual QA 1, 2, 4, 5, 6 and 8 reworded, 11 to 14 added. Every new Agent
  QA line failed before the work and passes after it.
- **2026-11-26T22:59:04Z** — **verified**: agent checks pass: 4 changed
  modules parse, no long lines, `/` and the 4 changed files served 200
  by the Lead Developer's server on 2222 (pid 43838, started 22:11:28,
  left running), vendored checksums match; every Agent QA line passes;
  GLSL not compiled; browser not run.
- **2026-11-26T23:03:41Z** — **quality-checked**: Fixed: none.
  Deferred: outer pits as deep as cut-face holes (an opening through the
  eroded skin leads into the whole hole beneath it, so only the mouth
  narrows, to at most 0.61 mm radius on the Victoria sponge against
  0.875 mm, 1.4 mm on the chocolate sponges against 2 mm; Decision 3's
  target is fewer and narrower, met in the port, so Manual QA 1's "no
  deep pits" is for the Lead Developer to judge by eye, with
  `HOLE_SKIN_ERODE` the value to tune); holesDistance() in
  layerHoleFilledAt() computes a skin it discards (at the hit only, on
  filled-hole layers, and likely dropped by the compiler); occlusionAt()'s
  comment recounts what the whole field once darkened (report tier).
  Verified fine: GLSL ES 3.00 forms `vec2(layer)`, `pow(vec3, vec3)` on
  a filter with no zero channel (linear `#ffb98a`), `min(vec3, vec3)`,
  the face-normal ternary and `for (int i = 1; i <= AO_SAMPLES; …)`;
  declaration order in the assembled shader (`LUMINANCE_WEIGHTS` before
  warmedCrumbAlbedo(), the crumb, layers and `eatenAngleRadians` before
  occlusionAt(), `dotNV` declared before the indirect occlusion uses it,
  `occlusion` before the albedo it warms); the face plane against
  wedgeDistance() and eatenStackDistance(): (sin h, ∓cos h) on z ≷ 0
  points from the cake into the slice, 0 on the face, and holds past half
  a turn, where the remaining wedge about -X lies on its negative side;
  the cut leaves a flat cut face at occlusion 1 and never reads the
  facing face; q built as cakeFieldOf() builds it; the skin's maths
  (shell `max(layer, -layer - skin)`, spheres shrunk by 0.3 of the
  octave's greatest radius, union with the holed layer) and no height
  term in it or in occlusionAt(), so neither can draw a band round a
  layer's side as it lands; the gates on hole strength and filled holes
  match layerDistance()'s; the 0 to 1 depth into warmedCrumbAlbedo() is
  continuous with the fade; no JS per-frame, resource, resize or input
  change; Agent QA of Steps 1 to 3 and agent checks 1 to 4 pass (the
  Lead Developer's server on 2222, pid 43838, started 22:11:28, left
  running); Manual QA 1, 2, 4 to 6 and 8 to 14 walked against the code;
  no mutation hunt beyond the Agent QA; GLSL not compiled (no validator
  on the machine); browser not run.
- **2026-11-26T23:31:01Z** — **ruled**: by the Lead Developer, after a
  second manual QA: the outer pits and hole floors too vivid an orange,
  and an orange line round every cut, worst on pale crumbs such as
  `#artemis-offering`'s, to be fixed at its cause and the warmth toned to
  a browner shade (Decisions 5 and 7); and, beyond the plan's first
  scope, the Lead Developer's request that `#pepionkh-honey-cake` lose
  its reveal step that shows nothing, and that its sesame seeds, which
  float, come down about 0.5 to 1 mm (Decision 8).
- **2026-11-26T23:31:01Z** — **implemented**: the three items. Causes
  measured in a JS port before any change: the normal blended across the
  sharp edges of the plain layer cut by the face, read along by
  occlusionAt() into a corner where `max()` lies short, gave occlusion
  0.00 to 0.04 from 0.1 to 0.3 mm below the cut's top edge, and rings
  round the holes on the flat cut face; the warmth's luminance restore
  pushed a pale crumb's red past its own; the seeds sat on the invisible
  cap's top, 0.8 mm up. `docs/src/raymarch/fragment.js`:
  `AO_DEPTH_FADE_METERS`, 0.2 mm, and occlusionAt() fades in with the
  hit's depth below the plain layer, skipping its reads on the plain
  surface. `docs/src/sdf/crumb.js`: `HOLE_WARM_COLOR` `#e8b48c`, an
  absorbing filter, `HOLE_WARM_MIN_LUMINANCE` removed.
  `docs/src/cake/reveal.js`: no part for an invisible topping, which
  shows with the top layer. `docs/src/tour/scripts.js`: the honey cake's
  four beats at reveal 5 moved to 4. `docs/src/sdf/topping.js`:
  toppingSurfaceHeight() gives an invisible topping no top but its base.
  `docs/src/cake/recipes.js`: comments only. Plan edits: Context; Decision
  5 gains a sub-point, Decisions 6 and 7 reworded, Decision 8 added; Step
  3's work line and criterion 1 reworded, criterion 2 added, its warm
  colour Agent QA line changed and two lines added; Step 4 added, with
  three criteria and four Agent QA lines; Done when; Manual QA 2, 4 and
  13 reworded, 15 and 16 added. The honey cake's stop count read 5 before
  the work and 4 after; every other new Agent QA line names code absent
  before it.
- **2026-11-26T23:31:01Z** — **verified**: agent checks pass: 8 changed
  modules parse, no long lines, `/` and the 8 changed files served 200 by
  the Lead Developer's server on 2222 (pid 43838, started 22:11:28, left
  running), vendored checksums match; every Agent QA line passes; GLSL
  not compiled; browser not run.
- **2026-11-26T23:33:36Z** — **quality-checked**: Fixed: none.
  Deferred: Step 4's presence-mask line checks stops 3 and 4 only, so a
  mutant that brings the invisible topping in with the first layer
  (findIndex() for findLastIndex()) passes it; near-equivalent, as the
  topping draws nothing and the seeds keep their own stop (report tier).
  Verified fine: occlusionAt()'s depth, `-max(plain, face)`, is 0 on an
  outer surface and on a flat cut face, so both read no occlusion and
  skip the four reads, positive only inside a cavity, and with nothing
  eaten the face term is pushed off by `NO_SURFACE_METERS`;
  layerPlainDistance(vec3, vec2, int) declared in layers.js before
  occlusionAt(); `smoothstep(0.0, AO_DEPTH_FADE_METERS, depth)` and the
  `occlusion < 1.0` gate continuous with `pow(HOLE_WARM_COLOR, 0) = 1`;
  linear `#e8b48c` has no zero channel for pow(); toppingInvisible
  declared above toppingSurfaceHeight(), clamped against spring
  overshoot, and read by both the slots' centres and the scatter, so
  each seed's bound follows its centre; the decorations' slab reaches
  10 mm below the base, so the lowered seeds stay inside it;
  toppingField() still returns early for an invisible topping;
  revealPartsOf() and presenceMaskFor() keyed on `isInvisible`, which
  only the honey cake sets; every cake's top stop as before but the
  honey cake's, 5 to 4; every script's beats within its cake's stops,
  non-decreasing, and ending at its top stop; revealMaxOf(), the guess
  cap revealCapOf(), snapRevealStop(), startRevealMaxOf() and the hash's
  pageIndexForHash() all derive from revealPartsOf() or the beats, so
  `#pepionkh-honey-cake` reaches stop 4 with the seeds; presenceMaskFor()
  runs in stageCake() on events, not per frame; no JS per-frame,
  resource, resize or input change; Agent QA of Steps 1 to 4 and agent
  checks 1 to 4 pass (the Lead Developer's server on 2222, pid 43838,
  started 22:11:28, left running); Manual QA 2, 4, 13, 15 and 16 walked
  against the code; GLSL not compiled; browser not run.
- **2026-11-26T23:41:51Z** — **done**: the Lead Developer’s manual QA
  passed, the first walk and the re-checks after two rounds of rulings
  (outer holes, warm hole floors, the occlusion read narrowed to the hit
  layer, the honey cake’s reveal step and seated seeds); frame time (Manual
  QA 7) not measured.
