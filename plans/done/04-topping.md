---
title: The topping
description: Coats the layer stack with a topping driven by one coverage value, from a dollop to a full cap to a skirt with drips, in the material each recipe names.
type: plan
---

## Context

- Delivers the third part of the cake: a topping whose coverage from 0
  to 1 places it as a dollop, a cap over the top, or a skirt down the
  sides with drips, with its pile, thickness, rounding and material from
  the recipe, cut by the slice as the layers are, and never on the plate.
- Implements the topping of
  [the research's architecture, section 2](../todo/01-presentation-mode-research.md#2-the-parts-as-fields),
  with Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/) for
  the cap and the offset.
- Depends on [Plan 02](./02-plate-and-layers.md) for the recipes, the
  resolver, the stack and the uniforms, and on
  [Plan 03](./03-frame-budget.md) for the walk that skips each part
  by a cheap bound, the two bounding cylinders and the march's step
  budget; feeds [Plan 05](05-transitions.md), whose springs animate the
  coverage, and [Plan 06](../todo/06-decorations.md), which sits decorations on
  the topping's surface.
- The "before" is the live site, `https://richplastow.com/sdf-cake/`,
  which shows Plan 03's commit `9771778`: every cake bare.
- Needed because the recipes already name their toppings and every cake
  shows bare without them.

## Decisions

1. **Module.** `docs/src/sdf/topping.js` exports `toppingChunk`, holding
   the topping's uniforms, toppingField(), which returns a distance and
   the topping's material id, and toppingSurfaceHeight(), the height of
   the topping's top at a radius, for Plan 06. `docs/src/sdf/cake.js`
   pastes the chunk and unions the topping with the stack before the
   slice is cut, so the cut passes through both.
   - **The topping joins Plan 03's walk**
     ([its Decision 2](./03-frame-budget.md#decisions)) after the
     layers and before the cut. cakeField() passes layersField()
     `min(plate.x + toppingThicknessMeters, stack.x)` as the nearest
     distance so far, in place of `min(plate.x, stack.x)`, takes the
     topping from the stack's distance the walk returns, then cuts the
     stack and the topping together, so the plate's gate reads both.
   - **Why the plate's distance is raised by the thickness.** The skirt
     is the stack's distance less the thickness (Decision 5), so it needs
     the stack's distance wherever the skirt could be the nearest part.
     The walk as Plan 03 built it skips a layer whose bound is no nearer
     than the plate where the plate went first, which leaves the stack's
     distance too large, `NO_SURFACE_METERS` at worst, round the cake's
     foot. Raised by the thickness, the walk skips a layer only where it
     lies the thickness or more beyond the plate, which then stays the
     nearer part whatever the skirt does. A `null` topping has a
     thickness of 0, which leaves the walk as Plan 03 built it.
   - **The smoothed stack** (Decision 5) is carried through the same
     walk: layersField() also returns the layers joined by iq's
     [smooth minimum](https://iquilezles.org/articles/smin/) with
     toppingSkirtBlend(), and skips a layer only where its bound is that
     blend or more beyond the nearest distance so far, since the smooth
     minimum differs from the minimum only within the blend. Reasoned,
     not measured.
   - **Measured** in a port of the field (2026-11-25, 200,000 points a
     cake, half of them round the foot, coverages 0.25 to 1): with the
     plate's distance as it is, the field overestimated at up to 7% of
     the points on every topped cake with a plate, by up to the
     thickness, 5 to 8 mm, and inside the custard pie's skirt at
     coverage 1 it read +4.1 mm where the true value is −3.9 mm. Raised
     by the thickness, it equalled the field with every part evaluated
     at all 2,160,000 points tried: the six cakes, six cuts from none to
     359°, five coverages.
2. **The toppings** are the five that `docs/src/cake/recipes.js` already
   holds, as Plan 02 wrote them, tuned by eye there, plus, by the Lead
   Developer's QA ruling, two recipe changes: the cheesecake gains a thin,
   translucent `berryCoulis` glaze (coverage 0.6, 1.5 mm thick, 0.75 mm
   rounding, a 3 mm pile, 20 mm drips in 9 waves, `translucency` 0.7, by the
   second QA's ruling); and the chocolate cake's two filling layers
   take a new `darkGanache` material, `#24140b`, roughness 0.25, darker than
   the ganache topping, and the Black Forest flakes take the same colour.
3. **Coverage splits at 0.5**, `COVERAGE_TOP`: below it the cap fraction
   is coverage ÷ 0.5, and the skirt fraction 0; above it the cap fraction
   is 1 and the skirt fraction is (coverage − 0.5) ÷ 0.5. A transition
   from 1 to 0 therefore passes through a full cap, then a shrinking
   dollop, as the brief asks. **The topping is skipped**, toppingField()
   returning `NO_SURFACE_METERS`, while its coverage is 0 or less: Plan
   02's validator counts a topping of coverage 0 as no part, Plan 07
   hides the topping by springing its coverage to 0, which an
   underdamped spring passes, and a cap of zero radius would still draw,
   as a needle the thickness tall.
4. **The cap** is cut from the skirt's own offset, the stack grown by the
   thickness (Decision 5), by iq's opIntersection, a bound, with two
   shapes: the half-space above the topping's base, and a rounded
   cylinder, iq's sdRoundedCylinder as the existing
   roundedCylinderDistance(), on the Y axis, centred on the base, of half
   height the thickness, so its top lies on the offset's flat top, and of
   radius the cap fraction times the sum of the crown radius
   (Decision 8) and the thickness. The cylinder's rounding, the least of
   the recipe's rounding, half the thickness and the cap's radius,
   rounds the dollop's top edge.
   - **How it falls.** The dollop grows from nothing at the centre, as
     [the research](../todo/01-presentation-mode-research.md#2-the-parts-as-fields)
     has it: a disc the thickness tall, with an upright side, a rounded
     top edge, and its underside flat on the crown's top. As it widens,
     the cylinder stops limiting where the offset's own rim, the crown's
     rounded edge grown by the thickness, lies inside it, and at coverage
     0.5 the cap is exactly the offset above the base, which is the skirt
     at a skirt fraction of 0: nothing jumps as the skirt starts. Above
     0.5 the cap lies wholly inside the skirt, so no groove forms where
     they meet. A full cap's rim is the offset's reach at the base, with
     a flat underside and a sharp lower edge: it overhangs the crown's
     top radius by about 4 mm on the Victoria sponge, the chocolate cake
     and the fruit cake, 6 mm on the Black Forest and 7 mm on the
     custard pie, whose 98 mm crown it covers to 105 mm.
   - The **pile** (second QA ruling) is a smooth bump on the cap's top,
     height h(1 − u²)², u the radius over the pile's radius,
     `PILE_RADIUS_FRACTION`, 0.8, of the cap's, held within the cap's
     flat; its slope falls to 0 at its rim, so it meets the cap with no
     crease. It is a height field held to its cylinder and standing on
     the base, unioned with the cap, skipped when the pile is 0. Its peak
     h scales with its radius, so its steepest slope,
     `PILE_PEAK_SLOPE` 1.5396 × pile ÷ (0.8 × (crown + thickness)), is the
     same at every coverage, and its height term is scaled by
     1 ÷ √(1 + slope²): 0.997 on the Black Forest, 0.911 on the custard
     pie (worst gradient 1.0000 in a port). The custard pie keeps its
     25 mm peak, but its dome is more peaked: 14 mm at half its radius,
     against the ellipsoid's 22 mm.
   - **Why not the ellipsoid.** Measured in a port (second QA): iq's
     sdEllipsoid under-reads so far beside the 17:1 Black Forest pile
     that its 5 mm smooth-minimum blend ended in a 1.1 mm step at about
     86 mm, 0.85 of the cap's radius: the ring the Lead Developer saw.
   - **Measured** in a port of the field (2026-11-25, round 2): a
     rounded cylinder standing on the base, unioned with the skirt, left
     a groove 1.14 to 1.73 mm deep round the crown's edge at every
     coverage from 0.6 to 1 on all five topped cakes, and its rim jumped
     outwards by 1.4 to 3.3 mm across coverage 0.5; cut from the offset,
     the cap leaves no groove at those coverages, and its rim and profile
     move by at most 0.002 mm between coverages 0.5 ± 10⁻⁶. With the pile
     left out, the field's worst gradient is 1.0000 on all six cakes at
     fourteen coverages from 0.001 to 1 and five cuts from none to 359°,
     so nothing overestimates. The ellipsoid pile measured here was
     replaced by the bump (second QA ruling), whose field never
     exceeds the true distance in a 2D port of the custard pie's and the
     Black Forest's piles.
5. **The skirt** is the smoothed stack offset outwards by the thickness,
   iq's opRound on the layers joined by the smooth minimum with
   toppingSkirtBlend(), `SKIRT_BLEND_PER_THICKNESS` 1.0 times the
   thickness (second QA ruling), cut off below a height, by iq's
   opIntersection with a half-space, that falls from the topping's base
   to 0, the stack's foot on the plate's top, as the skirt fraction
   rises, lowered further by the drips: the drip amplitude times the
   skirt fraction times a smooth wave, ½ + ½ sin(waves × angle + phase),
   round the cake, where the angle is `atan(p.z, p.x)`, about the Y axis
   from +X, with `DRIP_PHASE_RADIANS` 0.7 so no drip aligns with the
   slice at +X. The angle jumps by a full turn at −X, where the drips
   meet without a seam only for a whole number of waves (Decision 7).
   The cut-off is clamped at 0, so the skirt never lies on the plate. The
   skirt is skipped while the skirt fraction is 0. While the drip
   amplitude is above 0, the cut-off's term, the height of the cut-off
   above the point, is multiplied by `DRIP_STEP_FACTOR` (Decision 7)
   before the intersection; the offset is not.
   - **The coat fills the channels.** Where a filling sits between two
     wider, rounded layers, the stack is notched; offset from the sharp
     stack the coat dipped 2.00 to 2.02 mm there (measured, round 2).
     Offset from the smoothed stack it runs thick in the channel and
     leaves only a slight dip. With a fixed 4 mm blend, a port of the
     profile measured dips of 0.4 mm (Victoria sponge) and 0.8 mm (Black
     Forest), smooth, no crease, but sloped up to 0.14 and 0.23, which
     the light picks out as a line. A blend equal to the thickness
     halves that slope, to 0.10 to 0.14, with dips of 0.3 mm or less
     and a ridge either side of 0.2 to 0.4 mm; a wider blend raises the
     ridge. The cap shares the smoothed surface. The smoothing can push
     the coat out by a quarter of the blend, so the stack's bound grows
     by it (Decision 9).
6. **The topping is a shell**: the union of cap, pile and skirt, minus
   the sharp stack, as the proof of concept's icing was, so a cut face
   shows the layers inside the coat, and the coat thick in each channel. Above coverage 0.5 the cap adds nothing
   the skirt does not hold (Decision 4); it stays in the union, as the
   pile sits on it. A cake with no layers has nothing to coat, so
   the resolver gives it a topping of all zeros (Decision 9).
7. **The drips break the bound.** The skirt's cut-off height varies round
   the cake, so its lower face slopes, and the skirt's distance there,
   the height of that face above a point, exceeds the true distance by up
   to √(1 + term²), where the **drip term** is that slope: ½ × the drip
   amplitude × the waves ÷ the radius at which a drip ends. While the
   drip amplitude is above 0, toppingField() multiplies that term
   alone, the cut-off's height above the point, by `DRIP_STEP_FACTOR`,
   0.45, declared in `topping.js` (Decision 5), which keeps the term's
   gradient at or below 1 for a slope up to 1.98, a gradient of
   1 ÷ 0.45 = 2.22. Neither march multiplies its steps: march() and
   lightShareAt() read the field as they do now. The validator refuses
   a recipe whose drip term exceeds `MAX_DRIP_TERM`, 1.9, unitless, a
   gradient of 2.15, taken at the drip amplitude alone, as at a skirt
   fraction of 1, to which Plans 05 and 07 may spring the coverage, and
   at the least radius a drip can end on: the least, over the layers, of
   either radius less the layer's rounding. It also refuses a
   `dripWaves` that is not a whole number (Decision 5).
   - **Measured** in the port: the chocolate cake's term is 1.36 at its
     least radius, 81 mm. Unscaled, the cut-off overestimates: a drip of
     the full term 1.9 gave the field a worst gradient of 1.68. Scaled
     on the term alone, the field's worst gradient is 1.0000 with the
     chocolate cake's own drips and with drips of the full term 1.9, at
     fourteen coverages from 0.001 to 1 and five cuts. The wave's slope
     per metre grows as 1 ÷ radius towards the axis, but the cut-off
     never sets the field there, as the stack, its cut or the plate is
     always nearer. Marched from 8° to 28° below level at three turns,
     no ray pierced the chocolate cake's drips at coverage 0.8 or 0.95.
   - **The accepted cost.** Near a drip's lower face the field reads
     0.45 of the cut-off's height above the point, so a ray counts as a
     hit where that height is under `SURFACE_EPSILON_METERS` ÷ 0.45,
     0.22 mm: such a hit stops up to 0.22 mm short of the drip, about a
     pixel's footprint at the view at load. Accepted, not measured.
   - **The shadow march** reads the same field and takes no factor of
     its own.
8. **The topping's base and crown radius** come from the resolver: the
   base is the highest top of any used layer, one of height above 0, and
   the **crown radius**, which the cap's radius, the uniform
   `toppingRadiusMeters` and Plans 05 and 06 all mean, is that layer's
   top radius. An unused slot sits at the stack's top too, with a radius
   of 0, so it is never the crown. Plan 05 replaces both with continuous
   values while layers move; the shader reads them as two uniforms
   either way.
9. **Uniforms**: `toppingBaseMeters`, `toppingRadiusMeters`,
   `toppingCoverage`, `toppingThicknessMeters`, `toppingRoundingMeters`,
   `toppingPileMeters`, `toppingDripMeters`, `toppingDripWaves`,
   `toppingColor`, `toppingRoughness` and `toppingTranslucency`, 11 in
   all, declared in `topping.js` and
   created and written in `cake.js`; the material id `MATERIAL_TOPPING`
   is 8.
   - **The material lookups.** cakeAlbedoOf(), cakeRoughnessOf() and
     cakeMetalnessOf() send every id above 6.5 to the plate, so each
     gains id 8: `toppingColor`, `toppingRoughness`, and a metalness of
     0, as a layer's is, since the resolver carries no metalness for
     either.
   - **The resolved cake** gains a `topping` object of the same names
     without the prefix, all zeros and `#000000` for a `null` topping or
     a cake with no layers; `translucency` defaults to 0.
   - **Translucency** (third ruling) is refracted, not faked: at a
     topping hit with `toppingTranslucency` above 0, the fragment shader
     bends the ray by `GLAZE_IOR` 1.35 (a tuning value), marches it at
     most `GLAZE_MARCH_STEPS` 32 steps and 4 thicknesses through
     cakeFieldOf() without the topping, shades the part it meets with
     the same shadeAt() as any hit, absorbs it by Beer–Lambert with
     σ = −ln(colour) ÷ thickness × (1 − translucency), and adds it,
     weighted by 1 − Three.js's F_Schlick() at F0 0.022, to the glaze's
     specular and its diffuse times 1 − translucency. A march that meets
     nothing shades the glaze opaque. Only translucent-topping pixels pay.
   - **The bound.** The stack's cylinder, `bounds.stack`, grows by the
     topping's extents: its `radiusMeters` by 1.25 times the thickness,
     `SKIRT_BULGE_PER_THICKNESS` 0.25 for the smoothing's push, and its
     `topMeters` by the thickness plus the pile. Its `bottomMeters` and
     the plate's cylinder stay as they are, since the skirt stops at 0. A
     `null` topping grows nothing. The chocolate cake's:

     ```json
     {
       "topping": {
         "baseMeters": 0.083,
         "radiusMeters": 0.085,
         "coverage": 0.8,
         "thicknessMeters": 0.005,
         "roundingMeters": 0.004,
         "pileMeters": 0.004,
         "dripMeters": 0.02,
         "dripWaves": 11,
         "color": "#3b2314",
         "roughness": 0.25,
         "translucency": 0
       },
       "bounds": {
         "stack": {
           "bottomMeters": -0.002,
           "radiusMeters": 0.09325,
           "topMeters": 0.094
         }
       }
     }
     ```
10. **toppingSurfaceHeight(r)** returns, for a radius from the axis, the
    height of the topping's top there: the base plus the thickness plus
    the pile's bump where the pile reaches, the base plus the thickness
    under the rest of the cap, and the base beyond the cap. Written here,
    since this plan owns the shape, and read by Plan 06.
    - **Exact over the pile and the cap's flat.** The flat reaches to the lesser
      of the cap's radius less its rounding and the crown radius less
      the crown layer's rounding; past it the top falls along the cap's
      rim (Decision 4), which the function does not follow, so there it
      reads up to the thickness high. Plan 06 places its counted items
      within 0.8 of the crown radius, on the flat for every cake; its
      scattered kind, drawn out to the cap's radius, reaches the rim, and
      Plan 06's review must settle how.
11. **Performance** is measured against the live site (Manual QA 10):
    the topping adds a rounded cylinder, the pile's height field and an
    offset of the stack per sample, and the drip factor slows the chocolate cake's
    steps near its drips' lower faces.
    - **Measured** in the port at the view at load, 1000 px square,
      every seventh pixel, march steps a pixel, bare as on the live site
      and then topped, with the cap and the drip factor of Decisions 4
      and 7: Victoria sponge 4.35 to 4.42; chocolate cake 4.61 to 5.33;
      custard pie 3.49 to 4.78, most of it the pile's ellipsoid, whose
      bound read low beside the pile, since replaced by the bump; Black
      Forest 5.32 to 6.09; fruit cake 2.02 to 2.33; the cheesecake 3.40 either way. The mean over
      the six cakes goes from 3.86, which reproduces Plan 03's 3.87, to
      4.39. At the view at load the longest ray takes 138 steps.
    - **The step cap.** `MAX_MARCH_STEPS` in
      `docs/src/raymarch/fragment.js` rises from 768 to 1024: measured,
      bare cakes with the cut seen edge-on need up to 888 steps (the
      live site misses up to 83 rays there), and the chocolate cake with
      the drip-only factor up to 765. Plan 03's note stands: the loop's
      size is a compile risk only the browser settles.

## Steps

### Step 1: The smooth minimum [P]

Changes `docs/src/sdf/primitives.js`: adds iq's smooth minimum, by the
QA rulings, with its article cited. The ellipsoid it once added is gone
with the ellipsoid pile (second QA ruling).

- _(no observable behaviour)_ until Step 2 draws with it.

**Agent QA**

- Do: `node --check docs/src/sdf/primitives.js && grep -c "smoothMinDistance" docs/src/sdf/primitives.js`
- Expect: no parse error, and a count of at least 1.

### Step 2: The topping chunk

Adds `docs/src/sdf/topping.js` per Decisions 1, 3 to 7, 9 and 10, with
`DRIP_STEP_FACTOR` on the skirt's cut-off term.

- It should draw a dollop below coverage 0.5, a full cap at 0.5 and a
  skirt above it (Manual QA steps 1, 3, 4, 6 and 12).
- It should draw nothing at coverage 0 (Manual QA step 12).
- It should drip only where the recipe gives an amplitude (Manual QA
  steps 4 and 5).

**Agent QA**

- Do: `node --check docs/src/sdf/topping.js && grep -c "^ *uniform " docs/src/sdf/topping.js && grep -n "COVERAGE_TOP\|PILE_RADIUS_FRACTION\|DRIP_PHASE_RADIANS\|DRIP_STEP_FACTOR" docs/src/sdf/topping.js | wc -l`
- Expect: no parse error, `11` uniform declarations, and at least `5`
  lines: the four named constants, and `DRIP_STEP_FACTOR`'s use.

### Step 3: The resolver, the uniforms and the assembly

Changes `docs/src/cake/resolve.js` (the `topping` block, the stack's
bound and the drip checks of Decision 7, with `MAX_DRIP_TERM`) and
`docs/src/sdf/cake.js` (the uniforms, the writer, the walk's nearest
distance of Decision 1, the union before the cut and the material
lookups, and cakeFieldOf() without the topping for the translucent
glaze's march of Decision 9). `docs/src/sdf/layers.js`'s walk also carries the smoothed
stack (Decision 1), `docs/src/sdf/primitives.js` gains
smoothMinDistance(), and march() and
lightShareAt() in `docs/src/raymarch/fragment.js` take no step factor;
there `MAX_MARCH_STEPS` rises to 1024 (Decision 11), the shading moves
into shadeAt(), and throughTopping() refracts into a translucent topping
(Decision 9).

- It should resolve a `null` topping to all zeros and a bound that
  ignores it, and each topped cake's base, crown radius and grown stack
  cylinder as Decisions 8 and 9 give them (Agent QA below).
- It should refuse drips whose term passes `MAX_DRIP_TERM`, and a wave
  count that is not whole (Agent QA below).
- It should cut the slice through the topping and show the layers inside
  the coat (Manual QA step 2).
- It should keep the plate bare, and the skirt's foot clean where it
  meets the plate (Manual QA step 7).
- It should let no page show through a cut seen edge-on (Manual QA step
  13).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; const c = RECIPES.map(resolveRecipe); console.log(c.map((x) => x.topping.coverage).join(","), c[2].topping.thicknessMeters, c[1].topping.dripWaves, RECIPES.map((r) => validateRecipe(r).length).join(","));'`
- Expect: `1,0.8,0.6,0.5,1,1 0.0015 11 0,0,0,0,0,0`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const f = (c) => [c.topping.baseMeters, c.topping.radiusMeters, c.bounds.stack.radiusMeters, c.bounds.stack.topMeters].map((v) => v.toFixed(4)).join(" "); const c = RECIPES.map(resolveRecipe); console.log(f(c[1]), "|", f(c[2]), "|", f(c[3]), "|", resolveRecipe({ ...RECIPES[0], layers: [] }).topping.coverage);'`
- Expect: `0.0830 0.0850 0.0933 0.0940 | 0.0570 0.1000 0.1039 0.0635 | 0.0300 0.0980 0.1120 0.0650 | 0`:
  the chocolate cake's base, crown radius and grown stack cylinder; the
  cheesecake's, grown by its 1.5 mm glaze and 3 mm pile; the custard pie's, whose crown radius, 98 mm,
  is not its widest, 100 mm; and a cake with no layers, untopped.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; const c = RECIPES[1]; const v = (o) => validateRecipe({ ...c, topping: { ...c.topping, ...o } }).length; console.log([v({ dripMeters: 0.0275 }), v({ dripMeters: 0.0283 }), v({ dripWaves: 11.5 }), v({ dripMeters: 0, dripWaves: 40 })].join(""));'`
- Expect: `0110`: the chocolate cake's drips at 27.5 mm pass (term 1.87 at
  its least radius, 81 mm) and at 28.3 mm fail (1.92); 11.5 waves fail;
  40 waves of no amplitude pass.
- Do: `for f in docs/src/cake/resolve.js docs/src/sdf/cake.js; do node --check "$f"; done; grep -c "DRIP_STEP_FACTOR" docs/src/raymarch/fragment.js; grep -c "plate.x + toppingThicknessMeters" docs/src/sdf/cake.js`
- Expect: no parse error; `0`: the march takes no step factor; then `1`:
  the walk's nearest distance of Decision 1.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, the
six cakes show their toppings in the browser as Manual QA
describes, no page shows through any cake
(Manual QA 13), and the console shows no error or warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/` in Chrome on the M4 MacBook, open the dev tools
console, and hard-reload. Keep the live site,
`https://richplastow.com/sdf-cake/`, in a second tab: it shows every
cake bare, as before this plan.

1. **Do:** Look at the page after the reload.
   - **Expect:** The Victoria sponge wears pink icing over its top and
     all the way down its sides to the plate, its edge round the top
     smoothly rounded, with no ridge or groove running round it; down
     the side, the icing runs thick over the jam seam, leaving only a
     slight dip, well under 2 mm (Decision 5); the console shows no error, warning or shader
     log.
2. **Do:** Drag the cut to face the camera and zoom in on it.
   - **Expect:** The icing shows as a thin pink rind round the cut face,
     with the sponge and the jam seam inside it.
3. **Do:** Change the hash to `#custard-pie` and reload.
   - **Expect:** A disc of cream covers the custard's top and overhangs
     its rim by about 7 mm, its top edge rounded and its underside flat,
     with a low dome rising about 25 mm above it, a little more peaked
     than before, meeting the disc with no seam or ring, outside or in
     the cut; the custard's sides
     are bare.
4. **Do:** Change the hash to `#chocolate-drip` and reload, and let it
   turn a full lap.
   - **Expect:** In the cut, the two filling layers show the same dark
     brown as the Black Forest's flakes. Ganache covers the top and runs
     down the sides in ten
     even drips, alike and evenly spaced, the eleventh falling in the
     eaten slice; the drips end between about 21 and 33 mm above the
     plate, so about the lowest quarter of the sides is bare all round.
5. **Do:** Zoom in on the drips.
   - **Expect:** Each drip's end is smooth, with no steps, banding or
     flicker along its edge.
   - **Why:** The drip breaks the distance bound; the step factor on its
     cut-off term must keep the march from piercing it.
6. **Do:** Change the hash to `#black-forest` and reload.
   - **Expect:** Cream covers the whole cake with a slight pile on top,
     with no ring or dashed circle where the pile meets the flat, and no
     light line in the dip over each channel between layers; the light
     reads softer, more diffuse, than before.
7. **Do:** Tilt the cake to look along the plate's surface, then zoom in
   on the foot of the cake.
   - **Expect:** The plate is bare: no topping lies on it beyond the
     cake's foot, and the coat meets the plate in a clean ring, with no
     speckle or step.
   - **Why:** Round the foot the plate is nearer than the layers, which
     the walk skips; Decision 1 keeps the skirt's distance right there.
8. **Do:** Change the hash to `#cheesecake` and reload.
   - **Expect:** A thin, glossy, translucent deep-red glaze covers the
     top, the cheesecake visible through it and through the drips, the
     red deeper where the glaze is thicker or seen side-on, and the
     reflection stronger at grazing angles; it runs a little way down
     the sides in nine slight drips; the lower sides and the biscuit
     base are bare.
9. **Do:** Change the hash to `#fruit-cake` and reload.
   - **Expect:** Yellow marzipan covers the cake top and sides, and the
     cake still has no plate.
10. **Do:** On `#chocolate-drip`, double-click to reset the view and
    record 5 s in the Performance panel; do the same on the live site's
    `#chocolate-drip`.
    - **Expect:** Every frame within the display's 16.7 ms on both; note
      both in the Audit entry.
    - **Why:** The chocolate cake's coat and drips cost the most of any
      in this plan: in a port, 5.3 march steps a pixel at the view at
      load, against 4.6 on the live site (Decision 11).
11. **Do:** Turn on the device toolbar at 390 × 844 and reload
    `#chocolate-drip`.
    - **Expect:** The cake and its ganache render, a little softer than
      on the desktop, with no console error or warning.
12. **Do:** In `docs/src/cake/recipes.js`, set the custard pie's topping
    `coverage` to `0.25` and hard-reload `#custard-pie`; then set it to
    `0` and hard-reload. Restore `0.5` and hard-reload.
    - **Expect:** At 0.25, a centred disc of cream about half the
      custard's width, its side upright and its top edge rounded, with a
      low dome on it; at 0, no cream at all, and
      no speck or needle at the centre; at 0.5, as in step 3.
    - **Why:** No recipe is below coverage 0.5, and Plans 05 and 07
      spring the coverage through the dollop to 0 (Decision 3).
13. **Do:** In the console run
    `document.body.style.background = "cyan"`. On `#chocolate-drip`,
    zoom in fully and drag slowly round until one face of the cut points
    straight at the camera, so the cut narrows to a line down the
    middle; keep the pointer held, since a press pauses the turn, and
    drag a little up and down through level along that line. Then set
    the background back with `document.body.style.background = ""`.
    - **Expect:** No cyan anywhere inside the cake: no stripe down the
      cut through the ganache or the sponge.
    - **Do:** Repeat on `#cheesecake` at the load zoom and fully zoomed
      in.
    - **Expect:** The cut seen edge-on shows no holes: no cyan inside
      the cake.
    - **Why:** A cut face is a face a ray can crawl along
      ([Plan 03's Decision 7](./03-frame-budget.md#decisions)),
      and the coat makes each cut face larger.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: the cap, the pile and the skirt
  from one coverage, the drips with their step factor, the topping as a
  shell under the slice, the surface-height function for the
  decorations, and the five toppings.
- **2026-11-25T14:28:36Z** — **reviewed**: two Major findings open, not
  fixed, both measured in a port of the field and march that reproduces
  Plan 03's counts: (1) the cap unioned with the skirt (Decisions 4 to 6)
  leaves a groove 1.1 to 1.7 mm deep round the crown's edge at every
  coverage above 0.5, and the coat's lower rim jumps by up to 3.3 mm as
  the skirt switches on at 0.5; a cap cut from the skirt's own offset
  removes both; (2) the drip factor on the whole march (Decision 7) runs
  the chocolate cake's rays out of 768 steps at the cut seen edge-on, 88
  to 198 at the load zoom and up to 1,829 at the closest, where none ran
  out without it; the factor on the drip term alone measured none, and
  5.38 steps a pixel at load against 12.20. Minor fixes applied: the
  topping joins Plan 03's walk with the plate's distance raised by the
  thickness, proven exact; `bounds.stack` grows by the thickness in
  radius and the thickness plus the pile on top, with a JSON example;
  the topping skipped at coverage 0 or less; the cap's radius the cap
  fraction times the crown radius and thickness together, as the
  research has it; the drip term defined at the amplitude alone and the
  least radius, the gradient as √(1 + term²), `MAX_DRIP_TERM` 1.9 and
  whole wave counts validated, the shadow march without the factor; the
  crown radius defined once, over used layers; id 8 in the material
  lookups, metalness 0; Decision 2's table replaced by `recipes.js`;
  Decisions 4, 7 and 11 measured; Step 2's uniform count tightened;
  Step 3 gains three criteria and three Agent QA lines, mutation-tested;
  Step 2 one criterion; Manual QA 1, 3, 4, 7, 8 and 10 reworded against
  the live site, and 11 (phone), 12 (dollop and coverage 0) and 13 (cut
  edge-on) added.
- **2026-11-25T16:18:15Z** — **ruled**: the cap is cut from the
  skirt's own offset, limited to its radius, so cap and skirt share one
  surface (Decisions 4 to 6); `DRIP_STEP_FACTOR` scales the drip
  cut-off's term alone, the shadow march takes no factor, and rays may
  stop up to 0.22 mm short near drips (Decision 7); `MAX_MARCH_STEPS`
  rises from 768 to 1024 (Decision 11, Step 3), with a bare-cake edge-on
  line added to Manual QA 13.
- **2026-11-25T16:20:14Z** — **implemented**: Steps 1 to 3; added
  `docs/src/sdf/topping.js`; changed `docs/src/sdf/primitives.js`
  (ellipsoidDistance()), `docs/src/cake/resolve.js` (the `topping`
  block, the grown stack cylinder, `MAX_DRIP_TERM` and whole-wave
  checks), `docs/src/sdf/cake.js` (uniforms, writer, walk seed, union
  before the cut, id 8 lookups) and `docs/src/raymarch/fragment.js`
  (`MAX_MARCH_STEPS` 1024); every Agent QA block passes as written;
  Manual QA unchanged beyond the ruled line in step 13.
- **2026-11-25T16:20:14Z** — **verified**: agent checks pass: 17
  modules parse, no long lines in the changed files, `/` and each
  changed file served 200 by a server this check started (pid 29204,
  node 29225) and stopped, vendored checksums match; browser not run.
- **2026-11-25T16:43:36Z** — **ruled**: the Lead Developer's browser QA
  rulings, implemented: the cap and skirt grow from the layers joined by
  iq's smooth minimum (`SKIRT_BLEND_METERS` 4 mm), so the icing fills the
  channels, with the walk's skip widened by the blend, and the shell
  still subtracts the sharp stack (Decisions 1, 5, 6); the pile joins the
  cap by the smooth minimum (`PILE_BLEND_METERS` 5 mm), with
  toppingSurfaceHeight() approximating the fillet (Decisions 4, 10); the
  chocolate cake's fillings take `darkGanache`, `#24140b`; the cheesecake
  gains a `berryCoulis` glaze with slight drips, the orchestrator's
  default (Decision 2). Step 3's Agent QA Expects and Manual QA 1, 3, 4,
  8 and 13 and Done when updated to match. Decision 11's step counts
  predate these changes.
- **2026-11-25T17:02:05Z** — **ruled**: the Lead Developer's second
  browser QA rulings, implemented: the ellipsoid pile, whose bound left a
  1.1 mm step ring at 0.85 of the cap's radius (measured), becomes a
  bump h(1 − u²)² with a computed step factor, ellipsoidDistance()
  removed and toppingSurfaceHeight() exact (Decisions 4, 10, Step 1); the
  skirt's blend becomes the thickness, halving the channel's slope, with
  the stack's bound grown by a quarter of it (Decisions 5, 9); the key
  light 3 → 2 and the fill 1 → 1.6; the cheesecake's glaze 1.5 mm thick,
  0.75 mm rounding, translucency 0.5 through a new `toppingTranslucency`
  uniform, faked by one extra field read (Decisions 2, 9). Step 1, 2 and
  3 Agent QA and Manual QA 3, 6 and 8 updated to match.
- **2026-11-25T17:05:19Z** — **ruled**: the Lead Developer's ruling,
  implemented: the faked translucency and `BENEATH_DEPTH_PER_THICKNESS`
  go; a translucent topping refracts the ray by `GLAZE_IOR` 1.35,
  marches beneath through cakeFieldOf() without the topping
  (`GLAZE_MARCH_STEPS` 32, 4 thicknesses), shades with shadeAt(),
  absorbs by Beer–Lambert and weights by F_Schlick(); the cheesecake's
  translucency stays 0.5 (Decision 9, Step 3, Manual QA 8).
- **2026-11-25T17:11:57Z** — **ruled**: the Lead Developer asked for a much
  clearer glaze; the cheesecake's `translucency` rises from 0.5 to 0.9, a fifth
  of the absorption (Decision 2).
- **2026-11-25T17:16:43Z** — **ruled**: the Lead Developer asked for
  `translucency` 0.7 and a shallow cone in the middle of the cheesecake's glaze, darker at
  its centre: a 3 mm pile, which the absorption darkens by its depth; the
  glaze's second march now reaches the thickness plus the pile (Decision 2,
  Step 3 Agent QA 2's cheesecake bound top 0.0635).
- **2026-11-25T17:18:39Z** — **done**: the Lead Developer's manual QA
  passed, after three rounds of look rulings; no quality-check stage ran,
  by the Lead Developer's deadline instruction.
