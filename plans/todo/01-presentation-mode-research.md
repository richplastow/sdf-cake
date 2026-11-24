---
title: Presentation Mode research
description: The brief for Presentation Mode, a cake that changes style, takes bites and shows its sponge, measured against a port of the field in Node, with an outline of how it could be built as the first plans and the questions to settle before drafting them.
type: research
---

## Context

- The repo was scaffolded on 2026-11-24 from pureland-simulator, with the
  same rules, and a proof of concept that
  [ADR 001](../../adr/001-sdf-raymarching-with-three.md) records: one
  cake, in one style, with a slice cut out, raymarched on a full-screen
  quad while the camera circles it. The Lead Developer's manual QA passed
  the same day. The app has one mode, Presentation Mode, with nothing
  behind its radio yet.
- This file brings together the brief for Presentation Mode, records what
  the code does today, measures the march and the techniques the brief
  needs against a port of the field, and outlines how the mode could be
  built. Nothing here is a plan: the plans it proposes are listed in
  [The plans](#9-the-plans), and this file is their reference, as the
  Sandbox Mode research was for pureland-simulator's Plans 15 to 21.
- Each claim below is one of four kinds, and says which:
  - **Code**: checked in this repo's source on 2026-11-24, at commit
    a402f03, or, where it says so, in pureland-simulator's.
  - **Measured**: run on 2026-11-24 in Node 25.8.0 on the Lead Developer's
    Mac, by two scripts kept at the repo root, which git ignores:
    `node tmp-presentation-mode-march.mjs` marches a 320 by 240 frame from
    the proof of concept's camera over a JavaScript port of the cake's
    field and seven variants of it, and samples each field's worst
    gradient; `node tmp-presentation-mode-budget.mjs` marches the same
    frames under different step limits, epsilons and relaxations, and
    runs the soft-shadow march on every hit. Both are ports of the GLSL
    in `docs/src/sdf/` and `docs/src/raymarch/`, not the shader itself,
    which is the source of truth. The GPU was not measured: no browser
    automation is available to an agent on this machine.
  - **Source**: read in Inigo Quilez's articles, in the pinned Three.js
    release's unminified source, r187 on GitHub, or in a paper, linked
    where cited.
  - **Derived**: worked out, not prototyped and not seen in a browser.
- Terms in title case keep it: Presentation Mode, Sandbox Mode, Gameplay
  Mode.

## The brief

The Lead Developer's words, given on 2026-11-24 when the repo was created,
with what each implies:

- **The same shape as pureland-simulator**, with the same skills and rules
  and the same GitHub Pages hosting. Done: the scaffold is committed and
  the site is live.
- **It starts out with a Presentation Mode**, and may later gain Sandbox
  and Gameplay Modes. In pureland-simulator, Presentation Mode is the
  mode for looking: a radio chooses a design, the paper folds into it,
  a drag turns the paper and a double-click eases it back, swatches
  colour it, and Escape hides the toolbar (**Code**, pureland-simulator's
  `docs/src/main.js` on 2026-11-24). The cake's Presentation Mode is its
  counterpart: a radio chooses a cake, the cake becomes it, and the
  viewer turns it to look.
- **An SDF scene, with no triangles beyond the quad's two, raymarched**,
  because a signed distance field suits "parameter-based cake rendering,
  that can have bites taken out of it, render fractal sponge-holes, and
  transform smoothly between cake styles". Those four are the features:
  1. **Parameters, not models.** A cake is a set of numbers the field
     reads, so every cake the app shows is made by the same shader.
  2. **Bites.** Pieces taken out of the cake, which show the sponge where
     the icing is pierced.
  3. **Fractal sponge holes.** The crumb's air holes, self-similar across
     sizes, visible wherever the sponge is exposed: the cut faces of the
     slice, and the inside of a bite.
  4. **Smooth transitions between styles.** Choosing another cake morphs
     the one on screen into it, rather than swapping it.
- **Three.js stays**, for its camera, lights and shading, as ADR 001
  settled.

## What the code does today

All **Code**, checked on 2026-11-24 at commit a402f03.

- `docs/src/main.js` makes a transparent `WebGLRenderer` with
  antialiasing off, sets `NeutralToneMapping`, a `PerspectiveCamera` of
  35° field of view 0.4 m from the origin at 22° above the table, and one
  `Scene` holding the lights and the quad. Each frame it moves the camera
  round the cake at 12° per second, unless the viewer prefers reduced
  motion, and renders. A `ResizeObserver` keeps the camera's aspect and
  the renderer's size to the canvas, with the device pixel ratio capped
  at 2.
- `docs/src/scene/quad.js` makes the one `Mesh`: a `PlaneGeometry(2, 2)`
  with frustum culling off and a `ShaderMaterial` with `lights: true`,
  whose uniforms are `UniformsLib.lights` and `dfgLUT` merged with the
  cake's, plus the camera's world matrix and inverse projection matrix by
  reference.
- `docs/src/scene/lights.js` makes a warm white `DirectionalLight` of
  intensity 3 at (0.5, 1, 0.8), shining at the origin, and a
  `HemisphereLight` of intensity 1, pale blue above and warm dark below.
- `docs/src/sdf/primitives.js` is a GLSL chunk of five functions: a capped
  cylinder, a half-space, a rounded cylinder, subtraction and a wedge.
- `docs/src/sdf/cake.js` is a GLSL chunk and a uniforms factory. The
  field, cakeField(), is a sponge cylinder, an icing shell one thickness
  out with rounded edges, and a wedge subtracted from both, and returns
  the distance and a material id, sponge or icing. Its seven uniforms are
  the cake's height and radius, the icing's colour, rounding and
  thickness, the slice's angle, and the sponge's colour, with their
  starting values as constants: an 18 cm cake 7 cm high, 5 mm of icing
  rounded by 6 mm, a 48° slice, pink icing and golden sponge. Three more
  functions give a material's albedo, metalness and roughness.
- `docs/src/raymarch/fragment.js` assembles the fragment shader: Three.js's
  `common`, `lights_pars_begin` and `lights_physical_pars_fragment` chunks,
  the two GLSL chunks above, then the march. A ray that misses the cake's
  bounding sphere is discarded at once; the rest march up to 96 steps,
  stopping within 0.1 mm of the surface or 2 m out. A hit's normal comes
  from four field reads 0.5 mm apart, its shadow from a march of up to 48
  steps towards each directional light, and its shading from the same
  `RE_Direct()` and `RE_IndirectDiffuse()` as `MeshStandardMaterial`, on
  a `PhysicalMaterial` the shader fills by hand, before Three.js's tone
  mapping and colour-space chunks.
- `docs/src/raymarch/vertex.js` passes the quad's corners straight to
  clip space and hands each fragment its normalised device coordinates.
- `docs/index.html` has the canvas, a mode radio group with one radio,
  Presentation, checked, and nothing wired to it. `docs/styles/main.css`
  styles the toolbar and the choices as pureland-simulator does.
- Nothing responds to a drag, a key or a radio. The shader takes no
  texture.

## Measurements

### The march today, and the fields the brief needs

**Measured** by `tmp-presentation-mode-march.mjs`: two 320 by 240 frames
from the proof of concept's camera, at azimuths 0° and 70° round the cake,
76,800 rays each. The bounding sphere skips 49% of the rays in both. "Worst
gradient" is the largest change of the field over 0.5 mm, sampled 300,000
times in the cake's box: a distance function that never overestimates has a
gradient of at most 1, and a march over one that does must multiply its
steps by the step factor, 1 over that gradient. "Exhausted" is the rays
that ran out of 96 steps without hitting or escaping.

| Field | Worst gradient | Mean steps 0° / 70° | p95 | Exhausted |
| --- | --- | --- | --- | --- |
| Proof of concept | 1.00 | 11.1 / 12.9 | 22 / 25 | 11 / 22 |
| 3 bites, hard subtraction | 1.00 | 11.1 / 12.8 | 22 / 25 | 10 / 22 |
| 3 bites, smooth subtraction, 5 mm | 1.00 | 11.2 / 12.9 | 22 / 26 | 9 / 22 |
| Half-way blend into a square cake | 1.00 | 11.1 / 13.0 | 23 / 26 | 36 / 19 |
| Displaced 1 mm at 40 waves per metre | 1.03 | 11.5 / 13.3 | 22 / 26 | 10 / 21 |
| Displaced 5 mm at 200 waves per metre | 1.97 | 20.5 / 22.6 | 41 / 46 | 58 / 128 |
| Sponge holes, own cell only | 12.84 | 90.7 / 92.6 | 96 / 96 | 26,156 / 29,959 |
| Sponge holes, 27 cells | 1.00 | 11.4 / 13.0 | 22 / 25 | 7 / 15 |

The variants: three 2 cm spherical bites on the top rim away from the
slice, subtracted hard or with a 5 mm fillet; a blend of the round cake
into a rounded box of the same size at half way, `mix(round, square, 0.5)`;
the cake displaced by `a × sin(f x) sin(f y) sin(f z)`, Inigo Quilez's
example of displacement, at two strengths; and 3 mm spherical holes on an
8 mm grid, each jittered by up to 30% of the grid within its cell by a
hash, found either in the sample's own cell alone or in the 27 cells
around it, and subtracted from the cake.

What this says:

- **The cake is cheap.** A ray that reaches the cake takes 11 to 13 steps
  on average and 25 at the 95th percentile, far short of the 96 allowed.
- **Bites cost nothing extra, and keep the bound**, hard or filleted: the
  worst gradient stays 1.00. Each bite adds one sphere evaluation per
  field sample, so the cost grows with the number of bites, not the
  steps.
- **Blending two fields keeps the bound.** A convex combination of two
  functions that never overestimate never overestimates, and the march
  is no longer mid-blend.
- **Displacement breaks the bound by about its amplitude times its
  frequency.** The gentle one barely matters; the strong one doubles the
  steps and the exhausted rays, once the step factor of 0.51 that keeps
  it safe is applied.
- **Jittered repetition that looks in one cell only is unusable.** The
  field jumps at cell boundaries, so the gradient is effectively
  unbounded, the step factor that keeps it safe is 0.08, and most rays run
  out of steps. Looking in the 27 neighbouring cells restores the bound
  and the step count, at 27 sphere evaluations per sample instead of one.
  Inigo Quilez's repetition article does it in 8, by checking only the
  neighbour on each axis that the sample's side of the cell points at
  (**Source**, read on 2026-11-24), and his fractal construction below
  avoids the jitter altogether.

### The hole construction the research recommends

**Measured** by the same script, added the same day: Inigo Quilez's
fractal distance field, from his fbm SDF article. Its base is eight
spheres at the corners of an 8 mm cubic cell, each with a random radius
under half the cell's edge, which keeps the field exact; octaves of it,
each half the size and rotated, are subtracted from the cake by a smooth
maximum of 0.2 cell widths. "Clipped" evaluates the holes only where the
plain cake's distance is within 1 cm, and returns the plain distance
elsewhere, which only ever underestimates.

| Field | Worst gradient | Mean steps 0° / 70° | p95 | Exhausted |
| --- | --- | --- | --- | --- |
| Base field alone, hard subtraction | 1.00 | 11.2 / 12.9 | 22 / 25 | 11 / 18 |
| Two octaves, smooth | 1.00 | 17.4 / 18.4 | 41 / 44 | 10 / 29 |
| Two octaves, smooth, clipped | 1.00 | 17.4 / 18.4 | 41 / 44 | 10 / 29 |
| Three octaves, smooth, clipped | 1.00 | 22.0 / 22.5 | 56 / 60 | 65 / 153 |

- **The construction keeps the bound** at every octave count: the worst
  gradient stays 1.00, so the step factor is 1.
- **The smooth maximum slows the march, never breaks it.** Two octaves
  raise the mean steps by half and the 95th percentile from 25 to 44;
  three octaves double the mean and leave several times more rays out of
  steps at 96, so three need a higher limit.
- **The clip changes no step count**, since the march's steps depend on
  the field near the surface, where the clip is off. It spares the cost
  of a sample where the clip is on: 35% of the samples over both frames,
  since 65% of a march's samples fall within 1 cm of the surface. A
  cheaper per-sample cost, not a shorter march.
- The holes were carved from the whole cake here, icing included, which
  overstates their cost: in the app they live in the sponge term only.

### The march's budget

**Measured** by `tmp-presentation-mode-budget.mjs` over the 79,032 rays of
both frames that reach the bounding sphere. "Footprint epsilon" stops the
march within half a pixel's width at the ray's distance, 0.1 mm at least,
rather than within a fixed 0.1 mm; "over-relaxed" is sphere tracing with
steps of omega times the distance, retreating to a plain step when the
spheres fail to overlap, after Keinert and others' Enhanced Sphere Tracing
(2014), with the footprint epsilon.

| March | Hit | Exhausted | Mean steps | p95 |
| --- | --- | --- | --- | --- |
| Plain, 0.1 mm epsilon, 48 steps | 41,585 | 504 | 11.9 | 23 |
| Plain, 0.1 mm epsilon, 64 steps | 41,824 | 109 | 12.0 | 23 |
| Plain, 0.1 mm epsilon, 96 steps, as today | 41,840 | 33 | 12.0 | 23 |
| Plain, 0.1 mm epsilon, 128 steps | 41,840 | 12 | 12.0 | 23 |
| Plain, 0.1 mm epsilon, 256 steps | 41,840 | 0 | 12.0 | 23 |
| Plain, footprint epsilon, 48 steps | 42,330 | 92 | 10.3 | 20 |
| Plain, footprint epsilon, 64 steps | 42,330 | 6 | 10.3 | 20 |
| Plain, footprint epsilon, 96 steps | 42,330 | 0 | 10.3 | 20 |
| Over-relaxed, omega 1.2, footprint, 96 steps | 42,330 | 0 | 9.7 | 19 |
| Over-relaxed, omega 1.4, footprint, 96 steps | 42,325 | 0 | 9.4 | 18 |
| Over-relaxed, omega 1.6, footprint, 96 steps | 42,324 | 0 | 10.2 | 21 |

- **The exhausted rays graze the silhouette.** At 96 steps, 33 of 79,032
  rays run out; their final distance to the surface has a median of
  0.7 mm, so they are creeping along the cake's edge. The shader
  discards them, which leaves a pixel of background in the silhouette,
  about one in 2,400 of the rays that reach the sphere. Treating an
  exhausted ray as a hit would shade them instead.
- **A footprint epsilon ends the creep.** No ray runs out at 96 steps or
  64, and 490 grazing rays become hits, with the mean steps down from
  12.0 to 10.3: the stop is looser only where a pixel cannot show the
  difference.
- **Over-relaxation buys little here.** Omega 1.4 saves another 9% of
  steps; 1.6 loses it again. The cake is convex enough that plain
  marching is already close to its best.
- **The shadow march is as dear as the march.** On the 41,840 hits it
  averages 11.4 steps, 17 at the 95th percentile, and 7% of hits are
  fully shadowed, 93% fully lit. Each hit pixel therefore costs about 23
  field samples for the two marches plus 4 for the normal, before any
  bite, hole or blend multiplies the cost of a sample.

## An outline of the implementation

**Derived** throughout, unless marked. An exploration, not a plan: each
part names its options and a recommendation, for discussion.

### 1. A cake is a recipe of uniforms

- Today's seven uniforms are the start of a **recipe**: the numbers and
  colours that make one cake. A style is a recipe with a name and an id,
  held as data in JavaScript, as pureland-simulator holds its designs
  (**Code**, its `docs/src/designs/`). Choosing a style writes its
  recipe's values into the uniforms, and the shader never changes.
- A recipe's shape, with one example, so the plan that builds it has a
  concrete field list to commit to:

  ```json
  {
    "family": "round",
    "holes": { "cellMeters": 0.004, "octaves": 2, "strength": 1 },
    "icing": {
      "color": "#f2a1bb",
      "roundingMeters": 0.006,
      "thicknessMeters": 0.005
    },
    "id": "victoria-sponge",
    "name": "Victoria sponge",
    "sliceAngleRadians": 0.8378,
    "spongeColor": "#e9c46a",
    "tiers": [
      {
        "bottomRadiusMeters": 0.09,
        "heightMeters": 0.07,
        "roundingMeters": 0,
        "topRadiusMeters": 0.09
      }
    ]
  }
  ```

  The `family` picks the field's construction, round here; `tiers` is
  a fixed-length array in the shader, filled to its length with tiers of
  no height; `holes` is section 4's construction; and the bites are not
  in a recipe, since they are what the viewer does to a cake.
- The field reads the recipe through uniforms only, so a change to any
  value, by a tween or a slider, animates with no new shader: CLAUDE.md's
  "parameters are uniforms" rule.
- **Arrays in uniforms** (**Source**, r187's `WebGLUniforms.js`, read on
  2026-11-24): a GLSL `float radii[8]` takes a plain array or a
  `Float32Array` as its value; a `vec3 colors[8]` an array of `Vector3`,
  which Three.js flattens into a `Float32Array` it caches, so nothing is
  allocated per frame; and an array of structs, such as `Tier tiers[4]`,
  an array of objects keyed by the struct's fields. Every active element
  must be supplied, and with a loop whose bound is a uniform the compiler
  keeps them all, so a short JavaScript array of `Vector3` or of structs
  throws. The arrays are therefore filled to their GLSL length with inert
  entries, beside an `int` count, and mutated in place, never rebuilt.

### 2. Styles, and the blend between them

- **Families.** Inigo Quilez's primitives give every cake shape the brief
  could want, each marked exact in his article (**Source**, the distance
  functions article, read on 2026-11-24): the capped cylinder and its
  rounded form; the capped cone, a frustum, for cupcakes and tapered
  tiers; the torus; the box and rounded box for square cakes; the
  hexagonal prism; the cut sphere for a dome; and a 2D profile revolved
  about the axis, exact when the profile is, for a bundt or a drip edge,
  with the article's exact 2D rounded box, which rounds each corner on
  its own, and trapezoid as profiles. Of the operators, onion, a shell of
  a given thickness, and rounding are exact; union is exact; subtraction,
  intersection and their smooth forms are bounds, which the march
  tolerates; and the Ln-norm shortcut to a rounded square is a poor bound
  the article advises against.
- **Three ways from one style to another**:
  1. **Tween the recipe** when the two styles share a family. Families
     join at degenerate parameters: a rounded cylinder with no rounding is
     the capped cylinder term for term, and a frustum with equal radii is
     the cylinder, so round cake, tapered tier and cupcake are one recipe;
     a ring and a disc are one revolved profile, whose offset from the
     axis closes the hole as it falls; and a tier count tweens by
     shrinking a tier's height to nothing against the face below
     (**Derived**, checked against the quoted formulas). The field stays
     one exact field, as long as every intermediate value is valid: a
     rounding no larger than the radius or the half height, say.
  2. **Blend two fields**, `mix(dA, dB, t)`, across families: round into
     square or hexagonal, or one cake into a cluster. A convex combination
     of two functions that never overestimate never overestimates, by
     Hart's theorem on Lipschitz bounds and the rule that bounds add
     (**Source**, Hart's sphere tracing paper, with the same derivation
     in a distance-field library's review), so the march stays safe while
     `t` is the same everywhere; the measurements show a steady gradient
     and step count half-way between round and square. Turk and O'Brien
     found linear interpolation of distance fields gives "very plausible
     intermediate shapes", across a change of topology included
     (**Source**). Mid-blend, where the two solids do not overlap, one part
     shrinks away while the other grows from a seed, so pieces can be
     disconnected for a moment (**Derived**). A weight that varied over
     space could break the bound unless the field were rescaled
     (**Source**, the same review), so the weight is one uniform.
  3. **Blend the sponge fields only**, then apply the exact operators once
     to the result: the icing shell, the slice, the bites and the holes.
     The icing's thickness and the cut stay crisp through the blend, and
     the operators keep the bound (**Derived**).
- **Recommendation**: one cakeField() that reads one recipe, evaluated for
  both recipes only while a transition runs and mixed by a uniform weight
  that eases from 0 to 1 over a named duration, with the recipe tween
  where the families match, which the app decides per transition. The
  camera's distance tweens alongside, from section 5.
- **Styles to start with**, a proposal for open question 4: the Victoria
  sponge of the proof of concept; a tall tapered tier, chocolate; a bundt
  ring by revolution; a square cake; and a cupcake with a domed top.
  Three would exercise all three mechanisms: a tween within the round
  family, a ring opening by revolution, and a blend into a square.

### 3. Bites

- A bite is a shape subtracted from both the sponge and the icing, so the
  sponge's own surface shows wherever the bite reaches below the shell.
  With the icing as the outer shell minus the sponge, and the cake as the
  union of the two, carving one bite field from each term leaves the
  exposed sponge as the nearer surface, and the material follows it. The
  same construction cuts today's slice (**Code**).
- **The shape.** A sphere is exact. An ellipsoid, flatter as a mouth is,
  is a lower bound, which the march tolerates (**Source**, Inigo Quilez
  marks sdEllipsoid as a bound). Tooth marks are a few small spheres
  repeated round the bite's rim by angular repetition, unioned into the
  bite before it is subtracted; the repetition evaluates its instance
  twice, for the two nearest sectors, since one evaluation cracks the
  field (**Source**, the repetition article).
- **The edge.** Hard subtraction leaves a knife-sharp rim. Smooth
  subtraction with a kernel of a few millimetres rounds it, and the
  quadratic kernel never overestimates, so the step factor stays 1
  (**Source**, the smooth minimum article; **Measured**, a worst gradient
  of 1.00 with 5 mm fillets). Displacing the rim by noise, for crumb,
  would break the bound by about amplitude times frequency, and is not
  needed once the holes of section 4 pit the exposed sponge.
- **The list.** The bites are a uniform array of centres and radii with a
  count, looped with a constant bound and an early break: one sphere per
  bite per field sample, or three with tooth marks, for every ray near
  the cake. Three hard or filleted bites change neither the steps nor
  the bound (**Measured**). The array's size is a define, a choice the
  shader cannot change at runtime, as CLAUDE.md allows; how Three.js
  uploads such an array is in section 1.
- **Where a bite lands** is open question 5. A tap on the cake needs the
  point under the pointer, which the shader knows and the page does not.
  Marching the field again in JavaScript would make a second copy of it,
  against the single source of truth; the cheap route is to intersect
  the pointer's ray with the recipe's own cylinder in JavaScript, which
  the camera's maths already allows, and bite the rim nearest that
  point. Undo puts a bite back by shortening the list.

### 4. Sponge holes

- The holes live in the sponge term only, never the icing, so they show
  where the sponge is exposed: the slice's faces and the inside of a
  bite.
- **The construction** is Inigo Quilez's fractal distance field: a base
  field of eight spheres at the corners of a cubic grid cell, each with a
  random radius under half the cell's edge, which is exact, since no
  sphere reaches beyond its own cell's corners; subtracted from the
  sponge in octaves, each half the size of the last and rotated, by a
  smooth maximum. Self-similar across sizes, which is the "fractal" of the
  brief (**Source**, the fbm SDF article, which names a working Shadertoy
  example of a box carved this way, and the smooth minimum article for
  the kernel). Thresholded noise does not work: noise is not a distance,
  as the same article says (**Source**).
- **Cost.** Eight sphere and eight hash evaluations per octave per field
  sample, as measured above: two octaves raise the mean steps from 12 to
  18, three to 22, and the clip to within 1 cm of the surface spares a
  third of the samples their cost. The holes' shape and scale are tuning
  numbers for the plan: 8 mm cells were a first guess, and a Victoria
  sponge's crumb is finer.
- **Alternatives.** Jittered repetition gives the cellular look of bread
  and is safe only when each sample checks the neighbouring cells, which
  the eight-cell trick does, where the single-cell version breaks the
  field (**Source**, the repetition article; **Measured**, a worst
  gradient of 12.84 in one cell and 1.00 with the neighbours). The Menger
  sponge is a true fractal of straight edges, and reads as machined, not
  baked (**Source**, the Menger article; the look is **Derived**). Holes
  in the shading only, from one base-field read at the hit that darkens
  and tilts the surface, cost eight spheres per hit instead of per step,
  but leave the silhouette, the cut's profile, the shadows and the inside
  of a bite smooth: open question 6.
- **The recipe** gains the holes' cell size, depth and octave count, so a
  dense crumb and an open one are styles, and a transition tweens them.

### 5. Turning the cake, and the camera

- pureland-simulator turns the paper, not the camera: a drag on the
  canvas turns a yaw and a clamped pitch, and a double-click eases both
  back, through `docs/src/input/drag.js`, 167 lines of pointer handling
  with capture and slop, and `docs/src/input/spin.js`, 107 lines of pure
  maths over a `{ pitchRadians, yawRadians }` spin, which import nothing
  from Three.js (**Code**, pureland-simulator on 2026-11-24). Both are
  the Lead Developer's own code under the same licence, so Presentation
  Mode can port them as they are.
- Two ways to apply the spin to a field:
  - **A. Turntable: turn the cake under fixed lights**, as the paper
    turns. The field rotates its sample point by the inverse spin before
    evaluating, one 3 by 3 matrix multiply per sample, which keeps every
    distance exact, since a rotation preserves them. The slice, the bites
    and the holes turn with the cake, and the key light stays over the
    viewer's shoulder, so features pass through the light as the cake
    turns, as pureland-simulator's paper does.
  - **B. Orbit: move the camera round a fixed cake**, as the proof of
    concept's slow circle does today. Free in the shader, since the quad
    already reads the camera, and `OrbitControls` would do it in one
    vendored addon file with no relative imports (**Source**, r187's
    `examples/jsm/controls/OrbitControls.js`, read on 2026-11-24). But
    the lights are fixed to the world, so the lit side of the cake stays
    put and the viewer orbits round to the shadowed side.
  - Recommendation: **A**, for the same feel as pureland-simulator and
    the same lighting from every angle, with the ported drag and spin
    modules. The slow idle circle of the proof of concept can stay as a
    slow idle turn of the turntable, stopping on the first drag, or go:
    an open question.
- The camera fits the cake's bounding sphere once per style, through a
  port of pureland-simulator's `distanceToFitSphere()`, 22 lines of pure
  maths (**Code**), and tweens its distance as the style blends, so a
  taller cake never leaves the frame.

### 6. The toolbar and the modes

- The toolbar keeps pureland-simulator's shape: the mode radios first,
  then the group the mode shows, then anything else. Presentation Mode's
  group is the **style radios**, one per recipe, as the design radios
  are, and their handler module can be a port of
  `docs/src/ui/design-radios.js` (**Code**, pureland-simulator). The
  Presentation radio stays alone in its group until a second mode lands,
  as pureland-simulator's did.
- **Icing colour swatches**, as the paper-colour swatches are, would
  recolour the icing by writing one uniform, with pureland-simulator's
  `docs/src/ui/color-swatches.js` as the port (**Code**). Whether a
  style's recipe fixes its colours, or the swatches override them, is an
  open question.
- **A Bite button** takes a bite from the cake where the viewer is
  looking, or at a random place on the rim; **Undo** puts it back. How
  bites are placed is an open question.
- **Escape** hides and shows the toolbar, through a port of
  `docs/src/ui/controls-toggle.js`, 58 lines of DOM (**Code**).
- **The status line** of pureland-simulator, a polite live region, is
  not needed until something happens that a screen reader should hear,
  such as a bite taken; its port is 32 lines when it is.

### 7. Lighting, shading and the silhouette

- The shading stays as ADR 001 settled it: Three.js's physical chunks on a
  struct the shader fills, lit by the scene's lights, with the field's
  own soft shadows (**Code**).
- **Ambient occlusion** in the crumb of a bite or a cut face would make
  the holes read as holes: Inigo Quilez's five-tap occlusion along the
  normal costs five field samples per hit. Not in the first plans.
- **An environment map** for reflections in glossy icing is possible
  later through `PMREMGenerator` and the chunks' indirect specular term;
  the page's background is plain colour, so there is nothing to reflect
  yet. Not in the first plans.
- **The silhouette is not antialiased**: the renderer's antialiasing
  smooths triangle edges only, and the quad's lie off screen (**Code**).
  The options are weighed in section 8.

### 8. The performance budget

- **What a frame costs.** The shader runs once per pixel of the drawing
  buffer, the canvas's CSS pixels times the pixel ratio squared. Each ray
  that reaches the bounding sphere marches about 12 steps today, and each
  hit pays about 23 field samples for the march and the shadow, plus 4
  for the normal (**Measured**). A bite adds a sphere to every sample,
  two octaves of holes add 16 spheres and 16 hashes to every sample
  within the clip, and a blend evaluates two fields. The cost grows with
  the field more than with the march.
- **The levers, cheapest first** (**Source** throughout, read on
  2026-11-24 and listed under Sources, with the measurements above where
  they bear):
  1. **Fewer pixels.** `setPixelRatio()` accepts any value, 0.75 or 0.5
     included, and `setSize(w, h, false)` leaves the CSS size alone, so
     the browser stretches a smaller drawing buffer: no new class, and the
     cost falls with the square of the ratio (r187's `WebGLRenderer.js`).
     The Hobbit site's WebGL doubled a tablet's frame rate at 50%, with
     thin lines the casualty (web.dev). The cap is already a named
     constant; a lower one on narrow viewports is a line.
  2. **Stop by the pixel's footprint**, and keep the best candidate when
     the steps run out: Keinert and others' termination, which ends the
     creeping rays and saves 14% of steps (**Measured**). The shader needs
     the pixel's angle, from the camera's field of view and the buffer's
     height, as one uniform.
  3. **Lower the step cap** from 96 towards 64 once the footprint stop is
     in: six rays in 79,000 run out at 64 (**Measured**).
  4. **Shorten the shadow march.** Skip it where the surface faces away
     from the light, clamp its step, and use Inigo Quilez's improved
     penumbra, which cures banding at no extra sample (the soft shadows
     article), so 24 to 32 steps can replace 48: the mean is 11 today
     (**Measured**).
  5. **Over-relaxation** at 1.2 to 1.4: 9% fewer steps here
     (**Measured**), 14 to 18% in Keinert's scenes, for a branch in the
     inner loop and a parameter that is "challenging" to tune, in the
     paper's word.
  6. **Precision.** Keep `highp` for the march, which compares distances
     of a tenth of a millimetre; mobile GPUs run `mediump` as 16-bit
     floats at up to twice the throughput, so the colour and lighting
     maths could drop to it (the GLSL ES 3.00 specification and
     Imagination's guide). Three.js declares `highp` by default, and
     `highp` in a fragment shader is core to GLSL ES 3.00, so no phone
     that runs WebGL 2 lacks it (r187's `WebGLCapabilities.js`, the
     specification).
  7. **The normal once per hit**, with the loop trick that stops the
     compiler inlining the field four times, which has crashed WebGL
     compilers (the normals article).
- **The silhouette.** Three options, dearest last. **Coverage alpha**: a
  ray that misses records its closest approach, against the pixel's
  footprint at that distance, and writes a partial alpha shaded there,
  near free, and the idea of Inigo Quilez's "antialias, sort of", with
  wrong coverage only where several shapes share a pixel. **FXAA**: the
  quad renders into a `WebGLRenderTarget` without a depth buffer and a
  second quad filters it, with `FXAAShader.js` the one addon file to
  vendor, importing only `Vector2` (r187). **Supersampling**: a pixel
  ratio above the device's, for desktops only, since its cost is the
  ratio squared.
- **Measuring.** `renderer.info` counts draws, not time: one call and
  two triangles for this scene, which only confirms the frame is one draw
  (r187's `WebGLInfo.js`). GPU timer queries work in desktop Chrome
  alone (Khronos's extension registry and a usage survey). A phone's
  Manual QA therefore times frames with `performance.now()` in the
  animation loop, and the test for being fragment-bound is halving the
  pixel ratio: a frame time that halves with it is the shader's.
- **What smooth means**, on which phone, is open question 8. No published
  frame rate for a simple raymarched scene on a mid-range phone was found,
  only hearsay of heavy cloud shaders at a few frames per second on 2015
  devices and of a cheap phone recovering from 18 to 55 frames per second
  at a pixel ratio of 1.

### 9. The plans

Five plans, proposed in this order, each ending in something the Lead
Developer can QA in the browser; the seam between each pair is where one
could be accepted and the next rejected. Each is drafted by `/draft-plan`
once the open questions it rests on are ruled.

1. **Plan 02, Turning the cake, and the toolbar**: the drag and spin
   modules ported, the turntable applied in the field, Escape hiding the
   toolbar, the camera fitted to the cake's sphere, and the idle turn as
   ruled. Visible proof: a drag turns the cake, and a double-click eases
   it back.
2. **Plan 03, Styles and the transition**: the recipe as data with its
   JSON shape, the first styles as radios, the field reading a recipe,
   the tween within a family and the blend across families by one
   weight, and the camera's distance tweening. Visible proof: choosing a
   style morphs the cake into it.
3. **Plan 04, Bites**: the bite array as a uniform array with a count,
   smooth subtraction with tooth marks, the Bite and Undo buttons, and
   placement as ruled, with the sponge showing inside. Visible proof: a
   bite taken, and put back.
4. **Plan 05, Sponge holes**: the fractal field in the sponge term,
   clipped near the surface, its recipe fields, and a crumb tuned by eye.
   Visible proof: a pitted cut face and a pitted bite.
5. **Plan 06, The silhouette and the phone budget**: the footprint stop
   with a best candidate, the step cap, the shorter shadow march, the
   pixel-ratio cap on narrow viewports, and the silhouette treatment as
   ruled, each measured before and after by frame time in Manual QA.
   Visible proof: smooth on the phone the ruling names.
6. Then Sandbox Mode or Gameplay Mode, after research of their own.

## Open questions

For `/feed-me`, easiest first. Each names what the brief leaves open; the
outline above gives the background.

1. **Idle turn.** Keep the proof of concept's slow turn when nothing is
   happening, stop it on the first drag, or drop it for a still cake that
   turns only when dragged, as the paper does?
2. **Turntable or orbit.** Turn the cake under fixed lights, as the paper
   turns, or orbit the camera round a fixed, fixedly lit cake?
3. **Icing colour.** Does each style fix its colours in its recipe, do
   swatches recolour the icing of any style, or both, with the recipe's
   colour as the swatch chosen when the style is?
4. **Which styles first.** Section 2 proposes five, a Victoria sponge, a
   tall chocolate tier, a bundt ring, a square cake and a cupcake, and
   suggests three to begin with, one per transition mechanism; which, and
   how many?
5. **How a bite is placed.** By a button that bites where the viewer is
   looking, by a tap on the cake, or at random along the rim? And does
   Undo put it back, or does choosing a style heal the cake?
6. **Where the holes show.** In the field, so a bite's inside and the cut
   faces are truly pitted, or only in the shading of those faces, which
   is cheaper and flatter?
7. **The silhouette.** Accept the aliased edge, write coverage alpha from
   each missed ray's closest approach, which is nearly free, add FXAA for
   a render target and one vendored file, or supersample on desktops
   only?
8. **The phone budget.** Which phone, and what frame rate on it, counts as
   smooth enough; and is the first lever a lower pixel ratio on narrow
   viewports?

## Sources

- Inigo Quilez,
  [distance functions](https://iquilezles.org/articles/distfunctions/),
  [normals for SDFs](https://iquilezles.org/articles/normalsSDF/),
  [raymarching distance fields](https://iquilezles.org/articles/raymarchingdf/)
  and [soft shadows](https://iquilezles.org/articles/rmshadows/), the
  formulas the proof of concept follows, read on 2026-11-24.
- Keinert, Schäfer, Korndörfer, Ganse and Stamminger,
  [Enhanced Sphere Tracing](https://diglib.eg.org/handle/10.2312/stag.20141233),
  Smart Tools and Apps for Graphics, 2014, read in
  [a mirror of the paper](https://kev.town/raymarching-toolkit/media/enhanced_sphere_tracing.pdf),
  for over-relaxed sphere tracing, its fallback and the pixel-footprint
  stop with a best candidate; and Bán and Valasek,
  [a 2023 Eurographics short paper](https://diglib.eg.org/bitstream/handle/10.2312/egs20231014/057-060.pdf),
  for measured step counts under relaxation.
- Inigo Quilez,
  [terrain marching](https://iquilezles.org/articles/terrainmarching/),
  for the error that grows with distance, and the "antialias, sort of"
  coverage idea described on the raymarching page above, with
  [a worked implementation](https://godotshaders.com/shader/fullscreen-sdf-raymarching-with-smooth-csg-and-depth/).
- [web.dev, the Hobbit case study](https://web.dev/case-studies/hobbit),
  for the half-resolution canvas.
- [The GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf),
  sections 4.5.1 to 4.5.4, and
  [Imagination's precision guide](https://docs.imgtec.com/performance-guides/graphics-recommendations/html/topics/demystifying-precision.html),
  for `highp` and `mediump` on phones.
- Three.js r187 unminified source, read on 2026-11-24:
  [`src/renderers/WebGLRenderer.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/WebGLRenderer.js)
  (setPixelRatio() and setSize()),
  [`src/renderers/webgl/WebGLCapabilities.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLCapabilities.js),
  [`src/renderers/webgl/WebGLInfo.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLInfo.js)
  and
  [`examples/jsm/shaders/FXAAShader.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/jsm/shaders/FXAAShader.js).
- [EXT_disjoint_timer_query_webgl2](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
  and
  [its usage survey](https://web3dsurvey.com/webgl2/extensions/EXT_disjoint_timer_query_webgl2),
  for where GPU timing is available.
- Three.js r187 unminified source, read on 2026-11-24:
  [`examples/jsm/controls/OrbitControls.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/jsm/controls/OrbitControls.js),
  which imports from `three` only.
- Inigo Quilez,
  [2D distance functions](https://iquilezles.org/articles/distfunctions2d/),
  for the profiles a revolution can turn, and
  [the smooth minimum](https://iquilezles.org/articles/smin/),
  [the fbm SDF](https://iquilezles.org/articles/fbmsdf/),
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/) and
  [the Menger sponge](https://iquilezles.org/articles/menger/), for the
  bites and the holes.
- Hart,
  [Sphere tracing: a geometric method for the antialiased ray tracing of implicit surfaces](https://graphics.stanford.edu/courses/cs348b-20-spring-content/uploads/hart.pdf),
  The Visual Computer, 1996, Theorem 1 and the sum rule for Lipschitz
  bounds; and
  [a review in the sdfx library](https://github.com/deadsy/sdfx/pull/93),
  for the convex-combination argument and the failure of a weight that
  varies over space.
- Turk and O'Brien,
  [Shape transformation using variational implicit functions](https://faculty.cc.gatech.edu/~turk/my_papers/schange.pdf),
  SIGGRAPH 1999, for linear interpolation of distance fields as a morph.
- Three.js r187 unminified source, read on 2026-11-24:
  [`src/renderers/webgl/WebGLUniforms.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLUniforms.js),
  for arrays and structs in uniforms, with
  [glGetActiveUniform](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGetActiveUniform.xhtml)
  and
  [glUniform](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glUniform.xhtml)
  for which elements are active and what a short upload does.
- pureland-simulator's `docs/src/input/drag.js`, `docs/src/input/spin.js`,
  `docs/src/camera/fit.js`, `docs/src/ui/design-radios.js`,
  `docs/src/ui/color-swatches.js`, `docs/src/ui/controls-toggle.js` and
  `docs/src/ui/status.js`, read on 2026-11-24, for what Presentation Mode
  can port.

## Decision record

None yet: the open questions above await `/feed-me`.

## Audit

- **2026-11-24T17:23:45Z** — **drafted**: the brief recorded and the proof of
  concept surveyed; the march measured over a port of the field, with
  bites, a blend, displacement and three hole constructions, and its
  budget under step limits, a footprint epsilon, over-relaxation and the
  shadow march; an outline of recipes, styles and blends, bites, holes,
  turning, the toolbar, shading and the budget, with the techniques,
  primitives and Three.js uniform rules verified against their sources;
  five plans proposed; eight open questions, with the agent's
  recommendations where it has one.
