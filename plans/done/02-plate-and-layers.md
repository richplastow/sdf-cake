---
title: The recipe, the plate and the layer stack
description: Holds the six cakes as recipes of named materials, resolves them to uniforms, and raymarches each cake's plate and layer stack with the slice cut from the layers alone.
type: plan
---

## Context

- Delivers the data model every later plan reads, and the first two of the
  four parts in the field: the plate and the seven layer slots, stacked
  from the plate's top, with the slice cut from the stack and never the
  plate. The topping is not drawn until
  [Plan 04](./04-topping.md), so each cake shows bare for now.
- Implements sections 1 and 2 of
  [the research's architecture](../todo/01-presentation-mode-research.md#the-architecture),
  under [ADR 001](../../adr/001-sdf-raymarching-with-three.md). The
  primitives follow Inigo Quilez's
  [distance functions](https://iquilezles.org/articles/distfunctions/)
  and [2D distance functions](https://iquilezles.org/articles/distfunctions2d/).
- Depends on nothing; feeds [Plan 04](./04-topping.md) and every plan after.
- Needed because the proof of concept's field is one cylinder with seven
  uniforms, and the brief wants a loop of cakes that share one shape.

## Decisions

1. **Module layout.** Cake data and pure logic live in `docs/src/cake/`:
   `materials.js` (the palette), `recipes.js` (the six cakes, in walk
   order), `resolve.js` (the resolver and the validator), `select.js`
   (which cake a location hash names), `slots.js` (the slot counts).
   GLSL chunks live beside the field in `docs/src/sdf/`: `plate.js`,
   `layers.js`, and `cake.js` as the assembly that owns the uniforms.
   Nothing in `docs/src/cake/` imports from `three`, so Node can run it.
2. **Slot counts** in `slots.js`, templated into the GLSL: `LAYER_SLOTS`
   is 7. The `DECORATION_SLOTS` of [Plan 06](./06-decorations.md) joins it
   there.
3. **The recipe.** An object per cake, with an assigned `id` that the
   location hash and later features quote. Materials are names from the
   palette, lengths are metres, colours are sRGB `#rrggbb` strings, and
   `plate` or `topping` is `null` where the cake has none, as a
   decoration's `color` is for a kind that takes its colours elsewhere,
   such as sprinkles. The fields `topping`, `decorations`, `inclusions`
   and `irregularityMeters` are data for Plans 04, 06 and 08, held here
   so the shape is complete from the start:

   ```json
   {
     "id": "black-forest",
     "plate": {
       "material": "china",
       "baseRadiusMeters": 0.11,
       "rimRadiusMeters": 0.14,
       "sweepHeightMeters": 0.012,
       "lipHeightMeters": 0.004,
       "thicknessMeters": 0.005
     },
     "layers": [
       {
         "material": "chocolateSponge",
         "heightMeters": 0.028,
         "bottomRadiusMeters": 0.095,
         "topRadiusMeters": 0.095,
         "roundingMeters": 0.004,
         "irregularityMeters": 0.0015,
         "inclusions": { "chocolateChips": 0, "nuts": 0, "raisins": 0 }
       },
       {
         "material": "cream",
         "heightMeters": 0.008,
         "bottomRadiusMeters": 0.093,
         "topRadiusMeters": 0.093,
         "roundingMeters": 0.003,
         "irregularityMeters": 0,
         "inclusions": { "chocolateChips": 0, "nuts": 0, "raisins": 0 }
       }
     ],
     "topping": {
       "material": "cream",
       "coverage": 1,
       "thicknessMeters": 0.007,
       "roundingMeters": 0.007,
       "pileMeters": 0.004,
       "dripMeters": 0,
       "dripWaves": 0
     },
     "decorations": [
       { "kind": "cherry", "count": 8, "color": "#b3121f" },
       { "kind": "flake", "count": 120, "color": "#3b2314" }
     ],
     "eaten": { "steps": 7, "minFraction": 0.1, "maxFraction": 0.9 }
   }
   ```

   The example shows two of the Black Forest's five layers; the full
   recipe repeats the sponge and cream pattern. `eaten.minFraction` and
   `eaten.maxFraction` are fractions of a full turn.
4. **The palette**, first guesses to tune by eye: `MATERIALS`, an object
   keyed by material name, each entry holding every column below, with
   the hole cell in metres. Roughness as Three.js's physical shading
   takes it, metalness 0 unless given; the crumb columns are read by
   [Plan 08](./08-crumb.md):

   ```json
   {
     "sponge": {
       "color": "#e9c46a",
       "roughness": 0.9,
       "metalness": 0,
       "holeStrength": 1,
       "holeCellMeters": 0.004
     }
   }
   ```

   | Material | Colour | Roughness | Metalness | Hole strength | Hole cell |
   | --- | --- | --- | --- | --- | --- |
   | sponge | #e9c46a | 0.9 | 0 | 1 | 4 mm |
   | chocolateSponge | #5a3a22 | 0.9 | 0 | 1 | 4 mm |
   | fruitCake | #4a2c14 | 0.9 | 0 | 0.6 | 3 mm |
   | jam | #a8182e | 0.3 | 0 | 0 | 0 |
   | cream | #fff4e0 | 0.6 | 0 | 0 | 0 |
   | ganache | #3b2314 | 0.25 | 0 | 0 | 0 |
   | custard | #f4c842 | 0.5 | 0 | 0 | 0 |
   | pastry | #d9a861 | 0.85 | 0 | 0.3 | 2 mm |
   | biscuit | #b88a4a | 0.95 | 0 | 0.5 | 2 mm |
   | cheesecake | #f5e6c8 | 0.7 | 0 | 0 | 0 |
   | strawberryIcing | #f2a1bb | 0.35 | 0 | 0 | 0 |
   | marzipan | #f0d98a | 0.5 | 0 | 0 | 0 |
   | china | #f7f3ea | 0.15 | 0 | 0 | 0 |
   | paper | #f2efe6 | 0.9 | 0 | 0 | 0 |
   | foil | #c9c9cc | 0.3 | 1 | 0 | 0 |

5. **The six cakes**, in walk order, first guesses to tune by eye. Layers
   run from the bottom; a radius pair is bottom then top where they
   differ. The toppings and decorations are listed in
   [Plan 04](./04-topping.md#decisions) and
   [Plan 06](./06-decorations.md#decisions):

   | Id | Plate | Layers (material, height, radius) | Eaten steps, min, max |
   | --- | --- | --- | --- |
   | victoria-sponge | china, base 0.105, rim 0.13, sweep 0.012, lip 0.004, 5 mm | sponge 30 mm 90 mm; jam 4 mm 88 mm; sponge 30 mm 90 mm | 5, 0.1, 0.7 |
   | chocolate-drip | china, base 0.105, rim 0.13, sweep 0.012, lip 0.004, 5 mm | chocolateSponge 25 mm 85 mm, ganache 4 mm 83 mm, chocolateSponge, ganache, chocolateSponge | 6, 0.12, 0.8 |
   | cheesecake | paper, base 0.10, rim 0.115, sweep 0.006, lip 0, 1.5 mm | biscuit 12 mm 100 mm; cheesecake 45 mm 100 mm, rounding 6 mm | 200, 0, 1 |
   | custard-pie | paper, base 0.11, rim 0.13, sweep 0.005, lip 0, 2 mm | pastry 8 mm 85 to 100 mm; custard 22 mm 95 to 98 mm | 4, 0.2, 0.75 |
   | black-forest | china, base 0.11, rim 0.14, sweep 0.012, lip 0.004, 5 mm | chocolateSponge 28 mm 95 mm, cream 8 mm 93 mm rounding 3 mm, chocolateSponge, cream, chocolateSponge | 7, 0.1, 0.9 |
   | fruit-cake | none | fruitCake 70 mm 85 mm, rounding 6 mm | 1, 0.25, 0.25 |

   Roundings not given are 2 mm for a seam of jam or ganache and 4 mm
   for every other layer, biscuit, pastry and custard included; the
   `irregularityMeters` and `inclusions` of each layer are listed in
   [Plan 08](./08-crumb.md#decisions). The fruit cake has no plate so the
   plate's shrink to nothing is exercised; the cheesecake's 200 steps and
   the fruit cake's single step exercise the slider's extremes in
   [Plan 07](./07-sliders.md).
6. **Validation** returns a list of problems, empty when the recipe is
   valid: at least two parts (a plate, each layer, a topping with coverage
   above 0, decorations whose counts total above 0); at most
   `LAYER_SLOTS` layers; every layer's rounding at most the least of its
   radii and half its height; every material name in the palette, the
   plate's and the topping's as well as each layer's; `eaten.steps` at
   least 1, `minFraction` at most `maxFraction`, both within 0 and 1,
   and equal when `steps` is 1.
7. **The resolved cake** is the resolver's output: plain numbers in the
   shape the uniforms take, so the writer that uploads it and, in
   [Plan 05](05-transitions.md), the springs that animate it share one
   shape. Its layer array always has `LAYER_SLOTS` entries, the unused
   ones inert at zero height, radii and rounding, their colour `#000000`
   and roughness 0; this example leaves four inert entries out:

   ```json
   {
     "plate": {
       "baseRadiusMeters": 0.105,
       "rimRadiusMeters": 0.13,
       "sweepHeightMeters": 0.012,
       "lipHeightMeters": 0.004,
       "thicknessMeters": 0.005,
       "color": "#f7f3ea",
       "roughness": 0.15,
       "metalness": 0
     },
     "layers": [
       {
         "bottomMeters": 0,
         "heightMeters": 0.03,
         "bottomRadiusMeters": 0.09,
         "topRadiusMeters": 0.09,
         "roundingMeters": 0.004,
         "color": "#e9c46a",
         "roughness": 0.9
       },
       {
         "bottomMeters": 0.03,
         "heightMeters": 0.004,
         "bottomRadiusMeters": 0.088,
         "topRadiusMeters": 0.088,
         "roundingMeters": 0.002,
         "color": "#a8182e",
         "roughness": 0.3
       },
       {
         "bottomMeters": 0.034,
         "heightMeters": 0.03,
         "bottomRadiusMeters": 0.09,
         "topRadiusMeters": 0.09,
         "roundingMeters": 0.004,
         "color": "#e9c46a",
         "roughness": 0.9
       }
     ],
     "eatenAngleRadians": 0.6283,
     "boundCenterYMeters": 0.0295,
     "boundRadiusMeters": 0.1445
   }
   ```

   A cake without a plate resolves to a plate of all zeros, its colour
   `#000000`. Each layer's `bottomMeters` is the sum of the heights
   beneath it, so an inert entry's bottom is the stack's top; the eaten
   angle is `minFraction` of a full turn, clamped to `EATEN_MAX_RADIANS`
   (Decision 11), until Plans 05 and 07 set it otherwise; the bound is
   the sphere on the axis centred half way between the plate's underside,
   one plate thickness below the origin, and the stack's top, of radius
   the square root of the greatest of the plate's rim radius and the
   layers' radii squared plus half that height squared, plus the fragment
   shader's existing 1 cm margin, `BOUND_MARGIN_METERS`, which moves to
   the resolver. The margin also covers the plate's rounded edge and a
   lip that rises above a short stack: before it, the custard pie's first
   plate, a foil tin, poked its lip 0.6 mm out of the sphere (measured
   2026-11-25, across the six cakes and part-way between every pair).
8. **The origin** is the centre of the plate's top surface, so the stack
   rises from y = 0 and the plate hangs below it. The rig of the camera
   and the lights sits at half the stack's height, so the camera looks at
   the cake's middle; its distance stays at 0.4 m until Plan 05 fits it.
9. **The plate** is a profile of three 2D segments, from the axis to the
   base radius along y = −thickness ÷ 2, up the sweep to the rim radius,
   then up the lip, stroked by half the thickness and revolved: iq's
   sdSegment, opRevolution and opRound, exact. Its edges are therefore
   rounded by half its thickness, which suits china, paper and rolled foil
   alike, so it carries no rounding of its own. A plate whose rim radius
   is 0 is skipped in the shader.
10. **A layer** is iq's sdCappedCone, exact, with its rounding by opRound:
    the cone of half the height less the rounding and each radius less
    the rounding, offset by the rounding. A slot whose height is 0 is
    skipped in the shader.
    - **Zero divisors.** sdSegment and sdCappedCone each divide by a
      squared length that can be 0 here: a layer whose rounding is half
      its height and whose radii are equal, as the Victoria sponge's jam
      and the chocolate cake's ganache are, leaves a cone of zero height
      and slope, and the cheesecake's plate has a lip of 0. Unguarded,
      0 ÷ 0 is NaN, which spreads through every min() of the field
      (measured 2026-11-25 in a port of the field). Each divisor is
      therefore at least `MIN_DIVISOR_METERS_SQUARED`, 1e-12 m², which
      gives the exact distance to the degenerate disc or point, and
      elsewhere errs by at most a micrometre, a hundredth of
      `SURFACE_EPSILON_METERS`.
11. **The slice** is cut from the stack by a wedge about +X up to 180°,
    and past 180° by intersecting the stack with the complementary wedge
    about −X, which wedgeDistance() gives when `p.x` is negated. Both
    forms agree at 180°. wedgeDistance() is exact, iq's 2D sdPie with no
    radius, extruded along Y, because a max of two half-spaces falls
    below `SURFACE_EPSILON_METERS` behind a thin wedge's apex and draws a
    fin as tall as the stack, up to 11 mm into the eaten side at the
    greatest angle (measured 2026-11-25 in a port of the field). The
    greatest angle is a full turn less 1°, `EATEN_MAX_RADIANS`, exported
    by `docs/src/cake/resolve.js`, which clamps the eaten angle to it, so
    100% eaten leaves a sliver rather than a zero-width sheet the march
    could hit. An angle of 0 cuts nothing, and the shader skips the cut:
    at a half angle of 0, the wedge is the half-plane z = 0 on the +X
    side, which bends the normals by up to 25° in a band about 2 mm wide
    across that side of the cake (measured 2026-11-25 in a port of the
    field).
12. **Material ids** are floats the field returns with the distance: a
    layer's id is its slot, 0 to 6; the plate is 7; ids 8 and up are
    reserved for the topping, the decorations, the scattered kinds and the
    inclusions, which Plans 04, 06 and 08 assign. The albedo and
    roughness lookups branch on the id into the layers' arrays, one entry
    per slot, or the plate's uniforms; the metalness lookup gives the
    plate's metalness for the plate and 0 for a layer, which has none.
13. **Uniforms**, replacing the proof of concept's seven: the plate's five
    lengths, colour, roughness and metalness, declared in `plate.js`;
    five `float` arrays of `LAYER_SLOTS` entries for the layers' bottoms,
    heights, bottom radii, top radii and roundings, a `vec3` array for
    their colours and a `float` array for their roughnesses, declared in
    `layers.js`; `eatenAngleRadians`, `boundCenterYMeters` and
    `boundRadiusMeters`, declared in `cake.js`. The arrays are
    `Float32Array`s and arrays of `Color`, which r187's
    [`WebGLUniforms.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLUniforms.js)
    passes straight to `uniform1fv()` and flattens through `toArray()`
    into a cached `Float32Array` respectively, created once and written in
    place by `writeCakeUniforms()`. A colour is written by `Color.set()`
    from its `#rrggbb` string, which r187's
    [`Color.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/math/Color.js)
    parses through `setStyle()` and `setHex()` as sRGB into the working
    colour space (checked 2026-11-25). r187's
    [`UniformsUtils.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/shaders/UniformsUtils.js)
    `merge()` clones each `Color` in an array but passes a
    `Float32Array` by reference (checked 2026-11-25), so the writer
    writes into the material's own `uniforms`, never into the object
    createCakeUniforms() returned.
14. **The location hash** names the cake: `#black-forest` shows that
    cake, and a missing or unknown hash shows the first in walk order.
    Plan 05 writes the hash as the walk moves.
15. **Performance** is measured, not gated: Manual QA records the frame
    time of the heaviest cake as the baseline every later plan compares
    with, since the field now runs up to eight primitives per sample
    instead of two.

## Steps

### Step 1: The palette, the recipes, the resolver and the selector [P]

Adds `docs/src/cake/materials.js`, `docs/src/cake/recipes.js`,
`docs/src/cake/resolve.js`, `docs/src/cake/select.js` and
`docs/src/cake/slots.js`, per Decisions 1 to 7, 11 and 14. Each recipe
is complete: its plate and layers from Decision 5, its `topping` from
[Plan 04's Decision 2](./04-topping.md#decisions) (`null` for the
cheesecake), its `decorations` from
[Plan 06's Decision 3](./06-decorations.md#decisions) (`[]` for the
Victoria sponge and the cheesecake), and each layer's
`irregularityMeters` and `inclusions` from
[Plan 08's Decision 5](./08-crumb.md#decisions). The fruit cake, with no
plate and one layer, is valid under Decision 6 only through its topping
and decorations.

- It should hold the six recipes of Decision 5 in walk order, each valid
  under Decision 6 (Agent QA below).
- It should refuse a recipe that breaks any rule of Decision 6, and
  accept one at each rule's limit (Agent QA below).
- It should resolve a recipe to a resolved cake of exactly `LAYER_SLOTS`
  layers, with each layer's bottom the sum of the heights beneath it
  (Agent QA below).
- It should take each part's colour, roughness and metalness from the
  palette, and resolve a cake with `null` for its plate to a plate of
  all zeros (Agent QA below).
- It should resolve the eaten angle, clamped to `EATEN_MAX_RADIANS`, and
  the bound of Decision 7 (Agent QA below).
- It should pick the cake a hash names, and the first cake for an empty
  or unknown hash (Agent QA below).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; console.log(RECIPES.map((r) => validateRecipe(r).length).join(","));'`
- Expect: `0,0,0,0,0,0`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; const f = RECIPES[5]; const l = f.layers[0]; const v = (o) => (validateRecipe({ ...f, ...o }).length > 0 ? 1 : 0); console.log([v({ decorations: [] }), v({ decorations: [], topping: null }), v({ decorations: [], topping: { ...f.topping, coverage: 0 } }), v({ layers: Array(7).fill(l) }), v({ layers: Array(8).fill(l) }), v({ layers: [{ ...l, roundingMeters: 0.035 }] }), v({ layers: [{ ...l, roundingMeters: 0.036 }] }), v({ layers: [{ ...l, topRadiusMeters: 0.005 }] }), v({ layers: [{ ...l, material: "gravel" }] }), v({ eaten: { maxFraction: 0.25, minFraction: 0.25, steps: 0 } }), v({ eaten: { maxFraction: 0.4, minFraction: 0.5, steps: 2 } }), v({ eaten: { maxFraction: 1.1, minFraction: 0.5, steps: 2 } }), v({ eaten: { maxFraction: 0.5, minFraction: -0.1, steps: 2 } }), v({ eaten: { maxFraction: 0.3, minFraction: 0.2, steps: 1 } })].join(""));'`
- Expect: `01101011111111`: 1 where the fruit cake, so changed, has a problem.
  The two parts of a layer and a topping pass, one part fails, and a
  topping of coverage 0 is no part; seven layers pass and eight fail; a
  rounding of half the height passes and more fails, as does one above
  the top radius; then an unknown material, no steps, a least fraction
  above the greatest, fractions outside 0 to 1, and one step with two
  fractions each fail.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { validateRecipe } from "./docs/src/cake/resolve.js"; const f = RECIPES[5]; const l = f.layers[0]; const p = RECIPES[0].plate; const v = (o) => (validateRecipe({ ...f, ...o }).length > 0 ? 1 : 0); console.log([v({ topping: null }), v({ decorations: [], plate: p, topping: null }), v({ decorations: [{ ...f.decorations[0], count: 0 }], topping: null }), v({ layers: [{ ...l, bottomRadiusMeters: 0.005 }] }), v({ plate: { ...p, material: "gravel" } }), v({ topping: { ...f.topping, material: "gravel" } })].join(""));'`
- Expect: `001111`: the fruit cake's layer passes with its decorations alone
  and with a plate alone, so each counts as a part, but not with
  decorations whose counts total 0; a rounding above the bottom radius
  fails, as do an unknown material for the plate and for the topping.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const v = resolveRecipe(RECIPES[0]); const c = resolveRecipe(RECIPES[3]); const f = resolveRecipe(RECIPES[5]); const n = resolveRecipe({ ...RECIPES[3], plate: null }); const m = resolveRecipe({ ...RECIPES[3], plate: { ...RECIPES[3].plate, material: "foil" } }); console.log(v.plate.color, v.plate.roughness, m.plate.metalness, v.layers[1].color, v.layers[1].roughness, c.layers[0].bottomRadiusMeters, c.layers[0].topRadiusMeters, f.plate.color, f.plate.metalness, f.layers[6].color, f.layers[6].roughness, n.boundCenterYMeters.toFixed(4), n.boundRadiusMeters.toFixed(4));'`
- Expect: `#f7f3ea 0.15 1 #a8182e 0.3 0.085 0.1 #000000 0 #000000 0 0.0150 0.1111`:
  the china, a foil plate (which no cake uses, so the line swaps one in)
  and the jam as the palette gives them, the pastry's radii
  as the recipe gives them, the missing plate and an inert slot
  coloured `#000000`, and the bound of the custard pie without its
  plate, whose widest radius is the pastry's top.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; const c = RECIPES.map(resolveRecipe); console.log(c.map((x) => x.layers.length).join(","), c.map((x) => x.layers.filter((l) => l.heightMeters > 0).length).join(","), c[0].layers[2].bottomMeters.toFixed(3), c[5].plate.rimRadiusMeters);'`
- Expect: `7,7,7,7,7,7 3,5,2,2,5,1 0.034 0`
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { EATEN_MAX_RADIANS, resolveRecipe } from "./docs/src/cake/resolve.js"; const v = resolveRecipe(RECIPES[0]); const z = resolveRecipe(RECIPES[5]).layers[6]; const all = resolveRecipe({ ...RECIPES[2], eaten: { maxFraction: 1, minFraction: 1, steps: 2 } }); const w = resolveRecipe({ ...RECIPES[5], layers: [{ ...RECIPES[5].layers[0], bottomRadiusMeters: 0.1 }] }); console.log(v.eatenAngleRadians.toFixed(4), v.boundCenterYMeters.toFixed(4), v.boundRadiusMeters.toFixed(4), z.bottomMeters.toFixed(3), z.bottomRadiusMeters + z.topRadiusMeters + z.roundingMeters, all.eatenAngleRadians === EATEN_MAX_RADIANS, EATEN_MAX_RADIANS.toFixed(4), w.boundRadiusMeters.toFixed(4));'`
- Expect: `0.6283 0.0295 0.1445 0.070 0 true 6.2657 0.1159`: the Victoria
  sponge's angle and bound as Decision 7's example gives them, the fruit
  cake's last inert slot at the stack's top with no radii or rounding, a
  full turn clamped to a full turn less 1°, and the bound of a fruit cake
  whose layer is wider at its bottom than its top, which only the bottom
  radius sets.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { cakeIndexForHash } from "./docs/src/cake/select.js"; console.log(cakeIndexForHash("#black-forest", RECIPES), cakeIndexForHash("", RECIPES), cakeIndexForHash("#no-such-cake", RECIPES));'`
- Expect: `4 0 0`

### Step 2: The primitives the plate and the layers need [P]

Changes `docs/src/sdf/primitives.js`: adds the 2D segment, the
revolution of a 2D point, the capped cone and its rounded form, each
citing its article as the chunk's rule requires, with the segment and
the cone guarding their divisors by `MIN_DIVISOR_METERS_SQUARED` per
Decision 10, and keeps the existing functions, but for
halfSpaceDistance(), which the exact wedge of Decision 11 no longer
needs.

- _(no observable behaviour)_ until Step 4 draws with them; the browser
  compile log in Manual QA step 1 is the only check of the GLSL, and
  Manual QA steps 1 and 6 show the guarded seams and plate.

**Agent QA**

- Do: `node --check docs/src/sdf/primitives.js && grep -c "iquilezles.org" docs/src/sdf/primitives.js`
- Expect: no parse error, and a count of at least 2: the existing
  citation of the distance functions article and a new one of the 2D
  distance functions article.
- Do: `grep -c "MIN_DIVISOR_METERS_SQUARED" docs/src/sdf/primitives.js`
- Expect: at least 3: the constant and the two divisors it guards.

### Step 3: The plate and the layers chunks

Adds `docs/src/sdf/plate.js`, exporting `plateChunk` with plateField(),
and `docs/src/sdf/layers.js`, exporting `layersChunk` with
layersField(), per Decisions 9, 10 and 12; each declares the uniforms
Decision 13 gives it and returns a distance and a material id. Both
call Step 2's primitives, and `layers.js` templates `LAYER_SLOTS` from
Step 1's `slots.js` into its array lengths and loop.

- It should skip a plate of zero rim radius and a layer of zero height
  (Manual QA steps 5 and 6).

**Agent QA**

- Do: `node --check docs/src/sdf/plate.js && node --check docs/src/sdf/layers.js && grep -c "^ *uniform " docs/src/sdf/plate.js docs/src/sdf/layers.js`
- Expect: no parse error; `plate.js` declares 8 uniforms and `layers.js`
  7, as Decision 13 lists. The pattern counts declarations only, not
  comments that mention uniforms.

### Step 4: The field assembled, the uniforms and the writer

Changes `docs/src/sdf/cake.js`: `cakeChunk` pastes `plateChunk` and
`layersChunk` ahead of its own GLSL, so `fragment.js` still pastes the
primitives and then `cakeChunk` alone; cakeField() becomes the union of
the plate and the stack, with the slice of Decision 11 cut from the
stack alone; the material lookups branch on the ids of Decision 12;
createCakeUniforms() makes the uniforms of Decision 13; a new
`writeCakeUniforms(uniforms, values)` copies a resolved cake into the
material's uniforms in place. Changes `docs/src/raymarch/fragment.js`:
the bounding sphere takes its centre and radius from the two bound
uniforms, and `BOUND_MARGIN_METERS` and cakeBoundRadius() go, the
margin to the resolver. Changes `docs/src/scene/quad.js`: its doc
comment, which says merge() clones every value it is given, now says
that a `Float32Array` passes by reference (Decision 13); its code
changes only if its merge of the uniforms needs it.

- It should cut the slice from the layers and never from the plate, and
  cut nothing at an angle of 0 (Manual QA steps 2 and 6).
- It should leave a sliver, not a sheet, at the greatest angle (Manual QA
  step 8).
- It should skip no part of a cake whose bound the camera is inside
  (Manual QA step 9).

**Agent QA**

- Do: `for f in docs/src/sdf/cake.js docs/src/raymarch/fragment.js docs/src/scene/quad.js; do node --check "$f"; done; grep -c "cakeHeightMeters\|cakeRadiusMeters\|icingColor\|spongeColor\|cakeBoundRadius\|BOUND_MARGIN_METERS" docs/src/sdf/cake.js docs/src/raymarch/fragment.js`
- Expect: no parse error, and `0` for both files: the proof of concept's
  uniforms and bound are gone.
- Do: `grep -c "^ *uniform " docs/src/sdf/cake.js`
- Expect: `3`: `eatenAngleRadians`, `boundCenterYMeters` and
  `boundRadiusMeters`, as Decision 13 lists.

### Step 5: The page shows the hash's cake

Changes `docs/src/main.js`: resolves the cake the hash names, writes it
into the quad's uniforms once at load, and places the rig at half the
stack's height per Decision 8; its comments no longer mention the
icing. Changes `docs/index.html`: removes the mode radio group and its
`.choices` wrapper, leaving the `.controls` container for Plan 07; the
canvas's label no longer mentions icing. Changes
`docs/styles/main.css`: removes the `.choices` rules and their comments
and the `--choice-*` custom properties in `:root`, which nothing else
uses, so no line mentions a choice; its header comment says the cake's
colours come from `src/cake/materials.js`.

- It should show the first cake, bare, with the slice cut at its least
  fraction, on load with no hash (Manual QA step 1).
- It should show the cake a hash names after a reload (Manual QA steps 3
  to 6).

**Agent QA**

- Do: `node --check docs/src/main.js && grep -c 'type="radio"' docs/index.html; grep -c "choice" docs/styles/main.css`
- Expect: no parse error, `0` radios, and `0` lines mentioning a choice.
- Do: `grep -ciw "icing\|iced" docs/index.html docs/src/main.js; grep -c "src/cake/materials.js" docs/styles/main.css`
- Expect: `0` for both files, then `1`: the canvas's label and the
  comments no longer mention icing, and the CSS header names the
  palette.
- Do: `awk 'length > 80 { print FILENAME ":" FNR }' docs/src/cake/*.js docs/src/sdf/*.js docs/src/raymarch/fragment.js docs/src/scene/quad.js docs/src/main.js docs/styles/main.css docs/index.html`
- Expect: nothing but the favicon's line in `docs/index.html`.

## Done when

Every Agent QA block passes, the agent checks in CLAUDE.md pass, and each
of the six cakes shows its plate and bare layers in the browser with no
console error or warning, the slice showing the layers' seams.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/` in Chrome on the M4 MacBook, open the dev tools
console, and hard-reload.

1. **Do:** Look at the page after the reload.
   - **Expect:** A pale golden cake of three layers, a thin red seam
     between two thick sponge layers, on a white china plate with a short
     angled rim, with a slice cut out; the console shows no error or
     warning, and no shader compile log.
2. **Do:** Drag the cake so the cut faces the camera, then zoom in on the
   cut with the scroll wheel.
   - **Expect:** The cut shows the jam seam running across both faces, and
     the plate under the cut is whole: nothing is cut from it.
3. **Do:** Change the URL to `http://localhost:2222/#black-forest` and
   reload.
   - **Expect:** Five layers, three dark and two cream, on a larger plate,
     with a slice cut out.
4. **Do:** Change the hash to `#custard-pie` and reload.
   - **Expect:** A plate of thick white card, nearly flat and sloping up
     a little at its edge, with no lip, wider than the pastry all round,
     so nothing pokes through it, even seen from below. On it, a flat
     pastry layer with rounded edges and a yellow custard layer, with a
     fifth cut out.
   - **Why:** The pastry's 4 mm rounding is half its 8 mm height, which
     leaves its cone no height, so its 85 to 100 mm taper does not show:
     a first guess in Decision 5 for the Lead Developer to tune.
5. **Do:** Change the hash to `#fruit-cake` and reload.
   - **Expect:** One tall dark layer with rounded edges and no plate at
     all; a quarter of it is cut out.
   - **Why:** A plate of zero rim radius must be skipped, not drawn as a
     dot or a ring.
6. **Do:** Change the hash to `#cheesecake` and reload.
   - **Expect:** A thin biscuit layer under a tall pale layer, on an
     off-white paper plate, flat under the cake and sloping up a little
     at its edge, with no lip, no slice cut out, and no thin line across
     the top or down the side, however the cake turns.
   - **Why:** A least fraction of 0 means no wedge (Decision 11);
     nothing may be missing, and a wedge of 0 left in would bend the
     normals along a line. The paper plate's lip of 0 is a segment of
     zero length,
     which must not blank the field.
7. **Do:** Change the hash to `#no-such-cake` and reload.
   - **Expect:** The Victoria sponge of step 1.
8. **Do:** Temporarily edit `eaten.minFraction` of the cheesecake in
   `docs/src/cake/recipes.js` to `1`, reload with `#cheesecake`, and look
   from the side the cut faces.
   - **Expect:** A thin sliver of one degree remains on the plate, with
     nothing else; no flicker or stray sheet across the plate. Restore the
     recipe afterwards.
9. **Do:** With `#black-forest`, zoom in with the scroll wheel until the
   camera is inside the cake's bound, about 5 cm from the rim.
   - **Expect:** The layers still render where the camera looks; nothing
     vanishes when the camera crosses the bound.
10. **Do:** Drag the cake to tilt it and look at the plate from below.
    - **Expect:** The plate's underside is smooth and the same colour, and
      the rim's edge is rounded.
11. **Do:** Resize the window while the cake turns, then switch the OS to
    dark mode and back, then turn on the dev tools' device toolbar at a
    phone-sized 390 × 844 viewport and reload.
    - **Expect:** The cake neither stretches nor blurs, keeps its own
      colours in both schemes, and on the phone-sized viewport stays
      centred, with no console error or warning.
12. **Do:** With `#black-forest`, open the Performance panel, record 5 s
    at the load zoom with the cake turning, and read the frame time.
    - **Expect:** A steady frame time; note its value as the baseline in
      the plan's Audit entry.
    - **Why:** Every later plan compares with this number.

Looks wrong, but isn't: no cake has icing, cream or decorations in this
plan, so every cake shows bare layers until Plans 04 and 06 land. On the
phone-sized viewport the cake and its plate run off the sides, as the
proof of concept's cake does today: the view is about 12 cm wide at the
camera's 0.4 m distance, which Plan 05 fits to the cake.

## Audit

- **2026-11-25T01:20:27Z** — **drafted**: the recipe, the palette, the
  six cakes, the resolver and the validator, the plate as a revolved
  stroked profile, the layers as rounded frustums in seven slots, the
  slice past 180°, the location hash, and the frame-time baseline.
- **2026-11-25T08:50:41Z** — **reviewed**: Color.set(), uniform arrays
  and merge() checked against r187; field ported and tested (no
  overestimate, seams closed, bound holds); guarded zero divisors that
  NaN the jam, ganache and lipless plate; recipe data sources, cream
  rounding, sprinkle colour, palette JSON, eaten clamp, inert bottoms
  and bound radius made explicit; writer arguments A-Z; validator and
  resolver Agent QA added from mutation tests; uniform greps, citation
  count, choice removal and phone viewport fixed. Open: the custard
  pie's pastry and custard pass through the foil tin's wall by up to
  12 mm, a Decision 5 tuning for the Lead Developer.
- **2026-11-25T09:01:32Z** — **reviewed**: round 2; r187's merge(),
  array setters and Color.set() rechecked; slice at angle 0 skipped,
  as its wedge is the whole plane z = 0 and bent normals in a 1 mm
  band; decoration parts, material checks and inert slot colours made
  explicit; two Step 1 Agent QA lines added from mutation tests, which
  now catch all 24; quad.js comment, icing grep and Manual QA steps 4
  and 6 fixed. Open for the Lead Developer, with the custard pie's
  overlap: the foil, a metal with no environment to reflect, shows dark
  but for highlights, and the pastry's 4 mm default rounding, half its
  height, erases its 85 to 100 mm taper.
- **2026-11-25T09:11:51Z** — **implemented**: Steps 1 to 5; added
  `docs/src/cake/{materials,recipes,resolve,select,slots}.js` and
  `docs/src/sdf/{plate,layers}.js`; changed `docs/src/sdf/{primitives,cake}.js`,
  `docs/src/raymarch/fragment.js` (sphereEntry() takes the bound's
  centre), `docs/src/scene/quad.js` (comment only), `docs/src/main.js`,
  `docs/index.html` and `docs/styles/main.css`; every Agent QA line
  passes, each seen failing first; Manual QA unchanged. A port of the
  field predicts a fin about 6 mm wide, in the plane z = 0 from the axis
  into the eaten side, at `EATEN_MAX_RADIANS`: the complementary
  wedge's half-space bound falls below `SURFACE_EPSILON_METERS` behind
  its apex. Manual QA step 8 looks for it; an exact wedge would remove
  it, a Decision 11 change for the Lead Developer.
- **2026-11-25T09:11:51Z** — **verified**: agent checks pass: 12
  changed modules parse, no long lines but the favicon's, `/` and every
  changed file served with 200, vendored checksums match; browser not
  run.
- **2026-11-25T09:17:58Z** — **ruled**: by the orchestrator, by
  default, open for the Lead Developer to overturn: wedgeDistance()
  becomes exact, iq's sdPie with no radius, extruded along Y, keeping
  its name, signature and "about +X" convention, to remove the fin at
  `EATEN_MAX_RADIANS`; Decision 11 says so.
- **2026-11-25T09:17:58Z** — **implemented**: round 2, the ruling;
  `docs/src/sdf/primitives.js`: wedgeDistance() exact, citing sdPie,
  halfSpaceDistance() removed as nothing else used it;
  `docs/src/sdf/cake.js`: the comment on the skipped angle of 0. Plan:
  Decision 11 and Step 2's prose; no criterion or QA line changed. A
  port of the field at `EATEN_MAX_RADIANS`, all six cakes: the fin
  reached 11.45 mm along z = 0 with the old wedge and 0.09 mm, the
  apex, with the exact one; of 4,000 rays marched per cake, 268 to 297
  hit it before (3 for the custard pie, whose tin hides it), 0 after.
  Gradient at most 0.99998 at
  0, 0.01 rad, 1°, 180° ∓ 0.001 rad, 350° and the greatest angle; the
  field changes by at most 1.5e-8 m across 180° ± 1e-7 rad. Step 2, 3
  and 4 Agent QA and the long-line check pass; Manual QA unchanged.
- **2026-11-25T09:17:58Z** — **verified**: agent checks pass: 12
  changed modules parse, no long lines but the favicon's, `/` and every
  changed file served with 200, vendored checksums match; browser not
  run.
- **2026-11-25T09:24:34Z** — **quality-checked**: Fixed: no fix-tier
  finding; first-run polish of new code: the custard pie's one-item
  `decorations` array collapsed to one line as Prettier would
  (`recipes.js`), and roundedCappedConeDistance()'s comment no longer
  claims a tapered side keeps its radii (`primitives.js`); Step 1's
  sixth Agent QA line gains the bound of a fruit cake wider at its
  bottom, as a mutant dropping the bottom radius from the bound's widest
  radius survived every line (no recipe tapers inwards); Manual QA step
  6 no longer calls the paper plate flat, as its edge sweeps up 6 mm.
  Deferred: `MATERIAL_PLATE` is 7 by hand, not templated from
  `LAYER_SLOTS`, as Decision 12 and Plans 04 to 08 fix the ids as
  numbers; swapping the writer's bottom and top radii is caught by no
  check, the custard's 3 mm taper being the only one that shows, and the
  writer imports `three`, so Node cannot run it; plan 01 lines 150 to
  152 describe the old two-half-space wedge, a dated snapshot under
  "What the code does today", out of this plan's scope. Verified fine:
  sdPie's port (`abs()` fold, `sign()`, no radius) against a brute-force
  2D distance at 7 half angles, error 0, and both branches agree at 180°
  to 3e-17 m; r187's cloneUniforms() (Color arrays cloned, Float32Array
  by reference), Color.set() strings, uniform1fv() and uniform3fv()
  array setters and `PI_HALF` rechecked; 37 mutants of `resolve.js` and
  `select.js`, all killed but the one fixed and one equivalent
  (`hash.slice(1)` unconditionally, as `location.hash` is empty or
  starts with `#`); recipes against Decision 5 and Plans 04, 06 and 08;
  resources (one geometry, one material, never removed), per-frame path
  (unchanged, writer at load only), motion and resize untouched; rig
  raised by half the stack, turning about the cake's axis; the key
  light's target stays the world origin, the plate's top; GLSL
  identifiers clear of reserved words; no new dependency; agent checks
  pass, server started as pid 37117 and stopped; browser not run.
- **2026-11-25T10:13:39Z** — **ruled**: the Lead Developer, at Manual QA,
  saw the custard pie's pastry poke through the foil tin's wall from
  below, and ruled a plate of thick white card in its place: paper,
  base 0.11 m, rim 0.13 m, sweep 5 mm, no lip, 2 mm thick. Decision 5,
  Manual QA 4 and Step 1's palette Agent QA line (which now swaps in a
  foil plate to keep the metalness lookup tested) follow. Foil stays in
  the palette.
- **2026-11-25T10:31:36Z** — **done**: Manual QA passed by the Lead Developer
  (frame time 24.0 ms at pixel ratio 2 on the Black Forest, the
  baseline; the custard pie on white card); moved to `plans/done/`.
