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
  [the research's architecture, section 2](01-presentation-mode-research.md#2-the-parts-as-fields),
  with Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/) for
  the cap, the ellipsoid and the offset.
- Depends on [Plan 02](../done/02-plate-and-layers.md) for the recipes, the
  resolver, the stack and the uniforms; feeds
  [Plan 05](05-transitions.md), whose springs animate the coverage, and
  [Plan 06](06-decorations.md), which sits decorations on the topping's
  surface.
- Needed because the recipes already name their toppings and every cake
  shows bare without them.

## Decisions

1. **Module.** `docs/src/sdf/topping.js` exports `toppingChunk`, holding
   toppingField(), which returns a distance and the topping's material
   id, and toppingSurfaceHeight(), the height of the topping's top at a
   radius, for Plan 06. `docs/src/sdf/cake.js` unions the topping with
   the stack before the slice is cut, so the cut passes through both.
2. **The toppings**, first guesses to tune by eye; the cheesecake has
   `null`:

   | Cake | Material | Coverage | Thickness | Rounding | Pile | Drip, waves |
   | --- | --- | --- | --- | --- | --- | --- |
   | victoria-sponge | strawberryIcing | 1 | 5 mm | 6 mm | 0 | 0 |
   | chocolate-drip | ganache | 0.8 | 5 mm | 4 mm | 4 mm | 20 mm, 11 |
   | custard-pie | cream | 0.5 | 8 mm | 8 mm | 25 mm | 0 |
   | black-forest | cream | 1 | 7 mm | 7 mm | 4 mm | 0 |
   | fruit-cake | marzipan | 1 | 6 mm | 5 mm | 0 | 0 |

3. **Coverage splits at 0.5**, `COVERAGE_TOP`: below it the cap fraction
   is coverage ÷ 0.5, and the skirt fraction 0; above it the cap fraction
   is 1 and the skirt fraction is (coverage − 0.5) ÷ 0.5. A transition
   from 1 to 0 therefore passes through a full cap, then a shrinking
   dollop, as the brief asks.
4. **The cap** is a rounded cylinder, iq's sdRoundedCylinder as the
   existing roundedCylinderDistance(), standing on the topping's base
   with the topping's thickness as its height and a radius of the cap
   fraction times the crown radius plus the thickness; its rounding is
   the least of the recipe's rounding, half its height and its radius.
   The **pile** is the upper half of an ellipsoid, iq's sdEllipsoid, a
   bound, on the cap's top: semi-axes of `PILE_RADIUS_FRACTION`, 0.8, of
   the cap's radius across and the pile height times the cap fraction up,
   unioned with the cap and skipped when the pile is 0.
5. **The skirt** is the stack offset outwards by the thickness, iq's
   opRound on the stack's union, cut off below a height that falls from
   the topping's base to the plate's top as the skirt fraction rises,
   lowered further by the drips: the drip amplitude times the skirt
   fraction times a smooth wave, ½ + ½ sin(waves × angle + phase), round
   the cake, with `DRIP_PHASE_RADIANS` 0.7 so no drip aligns with the
   slice at +X. The cut-off is clamped at the plate's top. The skirt is
   skipped while the skirt fraction is 0.
6. **The topping is a shell**: the union of cap and skirt, minus the
   stack, as the proof of concept's icing was, so a cut face shows the
   layers inside the coat. Where the stack is absent the topping is
   absent too, since there is nothing to coat.
7. **The drips break the bound** by about ½ × amplitude × waves ÷ the
   crown radius, 1.3 for the chocolate cake, so while the drip amplitude
   is above 0 the march multiplies each step by `DRIP_STEP_FACTOR`, 0.45,
   which keeps a gradient of up to 1.2 safe. The validator refuses a
   recipe whose drip term exceeds 1.2.
8. **The topping's base and radius** come from the resolver: the base is
   the highest top of any layer, the radius that layer's top radius. Plan
   05 replaces both with continuous values while layers move; the
   shader reads them as two uniforms either way.
9. **Uniforms**: `toppingBaseMeters`, `toppingRadiusMeters`,
   `toppingCoverage`, `toppingThicknessMeters`, `toppingRoundingMeters`,
   `toppingPileMeters`, `toppingDripMeters`, `toppingDripWaves`,
   `toppingColor` and `toppingRoughness`; the material id
   `MATERIAL_TOPPING` is 8. The resolved cake gains a `topping` object of
   the same names, all zeros for a `null` topping, and the bound grows by
   the thickness and the pile.
10. **toppingSurfaceHeight(r)** returns, for a radius from the axis, the
    height of the topping's top there: the base plus the thickness plus
    the pile's ellipse where the pile reaches, the base plus the thickness
    under the rest of the cap, and the base beyond the cap. Written here,
    since this plan owns the shape, and read by Plan 06.
11. **Performance** is measured against Plan 02's baseline: the topping
    adds a rounded cylinder, an ellipsoid and an offset of the stack per
    sample, and the drip factor roughly doubles the chocolate cake's
    steps.

## Steps

### Step 1: The ellipsoid primitive [P]

Changes `docs/src/sdf/primitives.js`: adds the ellipsoid, marked as a
bound with its article cited.

- _(no observable behaviour)_ until Step 2 draws with it.

**Agent QA**

- Do: `node --check docs/src/sdf/primitives.js && grep -c "ellipsoid" docs/src/sdf/primitives.js`
- Expect: no parse error, and a count of at least 1.

### Step 2: The topping chunk

Adds `docs/src/sdf/topping.js` per Decisions 1 and 3 to 6, 9 and 10.

- It should draw a dollop below coverage 0.5, a full cap at 0.5 and a
  skirt above it (Manual QA steps 1, 3, 4 and 6).
- It should drip only where the recipe gives an amplitude (Manual QA
  steps 4 and 5).

**Agent QA**

- Do: `node --check docs/src/sdf/topping.js && grep -c "uniform" docs/src/sdf/topping.js && grep -n "COVERAGE_TOP\|PILE_RADIUS_FRACTION\|DRIP_PHASE_RADIANS" docs/src/sdf/topping.js | wc -l`
- Expect: no parse error, `10` uniforms, and at least `3` named
  constants.

### Step 3: The resolver, the uniforms, the assembly and the drip factor

Changes `docs/src/cake/resolve.js` (the `topping` block, the bound and
the drip check of Decision 7), `docs/src/sdf/cake.js` (the uniforms, the
writer, the union before the cut and the material lookups) and
`docs/src/raymarch/fragment.js` (the step factor while
`toppingDripMeters` is above 0).

- It should resolve a `null` topping to all zeros and a bound that
  ignores it (Agent QA below).
- It should cut the slice through the topping and show the layers inside
  the coat (Manual QA step 2).
- It should keep the plate bare (Manual QA step 7).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; const c = RECIPES.map(resolveRecipe); console.log(c.map((x) => x.topping.coverage).join(","), c[2].topping.thicknessMeters, c[1].topping.dripWaves, RECIPES.map((r) => validateRecipe(r).length).join(","));'`
- Expect: `1,0.8,0,0.5,1,1 0 11 0,0,0,0,0,0`
- Do: `for f in docs/src/cake/resolve.js docs/src/sdf/cake.js docs/src/raymarch/fragment.js; do node --check "$f"; done; grep -c "DRIP_STEP_FACTOR" docs/src/raymarch/fragment.js`
- Expect: no parse error, and at least `2`: the constant's declaration
  and its use.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and the
five topped cakes show their toppings in the browser as Decision 2
describes, the cheesecake stays bare, and the console shows no error or
warning.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/` in Chrome on the M4 MacBook, open the dev tools
console, and hard-reload.

1. **Do:** Look at the page after the reload.
   - **Expect:** The Victoria sponge wears pink icing over its top and
     all the way down its sides to the plate, with rounded edges, as the
     proof of concept did; the console shows no error, warning or shader
     log.
2. **Do:** Drag the cut to face the camera and zoom in on it.
   - **Expect:** The icing shows as a thin pink rind round the cut face,
     with the sponge and the jam seam inside it.
3. **Do:** Change the hash to `#custard-pie` and reload.
   - **Expect:** A tall dome of cream piled on the custard, covering the
     top but not the sides; its top is rounded and its edge sits at the
     custard's rim.
4. **Do:** Change the hash to `#chocolate-drip` and reload, and let it
   turn a full lap.
   - **Expect:** Ganache covers the top and runs part way down the sides,
     ending in eleven drips of differing length round the cake; the lower
     third of the sides is bare.
5. **Do:** Zoom in on the drips.
   - **Expect:** Each drip's end is smooth, with no steps, banding or
     flicker along its edge.
   - **Why:** The drip breaks the distance bound; the step factor must
     keep the march from piercing it.
6. **Do:** Change the hash to `#black-forest` and reload.
   - **Expect:** Cream covers the whole cake with a slight pile on top.
7. **Do:** Tilt the cake to look along the plate's surface.
   - **Expect:** The plate is bare: no topping lies on it beyond the
     cake's foot.
8. **Do:** Change the hash to `#cheesecake` and reload.
   - **Expect:** Bare layers, exactly as in Plan 02.
9. **Do:** Change the hash to `#fruit-cake` and reload.
   - **Expect:** Yellow marzipan covers the cake top and sides, and the
     cake still has no plate.
10. **Do:** With `#chocolate-drip`, record 5 s in the Performance panel
    at the load zoom, and compare with Plan 02's baseline.
    - **Expect:** A steady frame time; note its value in the Audit entry.
    - **Why:** The drip factor costs the most of anything in this plan.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: the cap, the pile and the skirt
  from one coverage, the drips with their step factor, the topping as a
  shell under the slice, the surface-height function for the
  decorations, and the five toppings.
