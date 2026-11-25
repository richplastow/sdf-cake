---
title: Presentation Mode research
description: The brief for Presentation Mode, a cake of plate, layers, topping and decorations that walks through a loop of cakes, is eaten slice by slice and reveals its parts, measured against a port of the field in Node, with the architecture the plans share.
type: research
---

## Context

- The repo was scaffolded on 2026-11-24 from pureland-simulator, with the
  same rules, and a proof of concept that
  [ADR 001](../../adr/001-sdf-raymarching-with-three.md) records: one
  cake, in one style, with a slice cut out, raymarched on a full-screen
  quad. The turntable, the drag and the zoom followed the same day. The
  app has one mode, Presentation Mode, and will keep only that mode until
  a later research file proposes another.
- This file holds the brief for Presentation Mode, records what the code
  does today, measures the march and the techniques the brief needs
  against a port of the field, and sets out the architecture that Plans
  02 to 08 share, so each plan can reference it rather than restate it.
  Nothing here is a plan: the plans are listed in
  [The plans](#the-plans).
- Each claim below is one of four kinds, and says which:
  - **Code**: checked in this repo's source on 2026-11-25, at commit
    57cd916, or, where it says so, in pureland-simulator's.
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

Presentation Mode shows one cake at a time from a loop of cakes, turns it
under the lights, and lets the viewer eat it slice by slice and take it
apart. Every cake is cylindrical, with rounding and irregularity but never
a square, a hexagon or a ring. The app is used on the Lead Developer's M4
MacBook, in a desktop browser, with little other load; phones are a later
consideration.

### A cake is a recipe of four parts

A cake is a recipe: data that the shader reads through uniforms, so every
cake is drawn by the same shader, and any two cakes blend smoothly, since
every recipe has the same shape and a transition tweens its values.

1. **The plate**: a dish the cake sits on, revolved from a profile with a
   flat base, an angled sweep and a vertical lip, in china, paper or foil.
   A cake with no plate has a plate of zero radius, so a transition to it
   shrinks the plate away.
2. **The layers**: seven slots, stacked from the plate up, each a rounded
   frustum of its own height, radii and material, such as sponge, jam,
   cream, ganache, custard, pastry or biscuit. A cake with fewer layers
   leaves the upper slots empty, at zero height and radius. In a
   transition, a layer that stays may change from a thick wodge of sponge
   to a thin seam of jam. Each layer can hold inclusions: nuts, raisins
   and chocolate chips, as well as the sponge's own holes.
3. **The topping**: one coat over the stack, placed by a coverage from 0
   to 1. At 0 there is none; up to 0.5 a dollop grows from the centre
   until it covers the top; from 0.5 to 1 a skirt descends the sides,
   with drips, until the cake is covered top and sides. Thickness,
   rounding, the pile on top and the material are parameters. A
   transition from covered to bare passes through the stages between.
4. **The decorations**: scattered shapes, never writing or drawing. A
   countable kind, such as cherries, candles, orange slices and almonds,
   has a count: 1 sits at the centre, the classic cherry on top; 2 or
   more are scattered deterministically over the top, avoiding one
   another and the other kinds. A scattered kind, such as sprinkles and
   flakes, has a count in the dozens or hundreds and is drawn by a
   repeated cell, since one primitive per sprinkle would cost every pixel
   the whole frame. Each item varies by a hash in its yaw, its tilt, its
   size and how deep it sits in the topping, and ends a transition sitting
   on the surface or comfortably embedded, never floating. Candles are
   unlit.

### Transitions are choreographed

A transition to another cake is not one eased weight. Each part has a
presence from 0 to 1 and its own motion: the old decorations sink into
the cake first; the plate, layers and topping then tween, with a layer's
height on a spring and its position following the stack beneath it on a
lagging spring, so upper layers hang in the air a moment when the layers
under them shrink, and bounce up when those layers grow; the new
decorations fall into place last, from above. A second change mid
transition retargets every spring from where it is, never snapping.

### Two sliders and the arrow keys

- **The eaten slider**, horizontal along the bottom of the viewport, sets
  how much of the cake has been eaten, as the angle of the slice cut out,
  which the plate never shares. It is stepped: each cake sets its number
  of steps, usually 4 to 7, rarely 1 or 200, and its least and greatest
  fraction eaten. Moving between steps transitions the angle. Left and
  Right walk it; Left at the least step goes to the previous cake at its
  greatest, Right at the greatest step to the next cake at its least, and
  the loop of cakes has no ends. A simple arrow icon at each end of the
  slider does what the key does, and nothing in the UI shows a word or a
  name.
- **The reveal slider**, vertical up the right side of the viewport, takes
  the cake apart: at the top everything the cake has is shown; each stop
  down removes the decorations, then the topping, then each layer from
  the top, until the bottom shows the plate alone, or the bottom layer
  alone where the cake has no plate. A cake's stops are the parts it has,
  so every recipe needs at least two parts. Up and Down walk it, and do
  nothing past either end. On a change of cake the slider keeps its ends,
  and between them snaps to the nearest stop by fraction of travel,
  preferring the higher when exactly half way.
- The four arrow keys do only this, whatever has keyboard focus, so
  nothing else in the page may use them. Escape hides and shows the UI,
  which keeps working while hidden, for screen sharing.

## What the code does today

All **Code**, checked on 2026-11-25 at commit 57cd916.

- `docs/src/main.js` makes a transparent `WebGLRenderer` with
  antialiasing off, sets `NeutralToneMapping`, a `PerspectiveCamera` of
  35° field of view 0.4 m from the origin at 22° above the table, and one
  `Scene` holding a rig `Group` of the camera and the lights, and the
  quad. The rig turns round the cake by the inverse of the cake's turn,
  so the field stays put in the shader: a drag turns and tilts the cake
  through `docs/src/input/drag.js` and `docs/src/input/view.js`, pausing
  the slow turn of 12° per second while held; the scroll wheel, a
  trackpad's scroll or pinch, a touch pinch and a Cmd-drag zoom between
  0.15 m and 1.2 m through `docs/src/input/zoom.js`; a double-click eases
  the view back. With reduced motion the slow turn holds still. A
  `ResizeObserver` keeps the camera's aspect and the renderer's size to
  the canvas, with the device pixel ratio capped at 2. Nothing responds
  to a key, apart from the modifier tracking the zoom needs.
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
  [Plan 02](../done/02-plate-and-layers.md) replaces the wedge, once the
  intersection of two half-spaces, with an exact one: iq's sdPie with no
  radius, about +X in the xz plane. The old bound fell below the surface
  epsilon behind a thin wedge's apex and stopped rays short there. A
  slice up to 180° subtracts the wedge from the layers; past 180° the
  layers are intersected with the complementary wedge about −X, and both
  forms agree at 180°.
- `docs/src/sdf/cake.js` is a GLSL chunk and a uniforms factory. The
  field, cakeField(), is a sponge cylinder centred on the origin, an icing
  shell one thickness out with rounded edges, and a wedge about +X
  subtracted from both, and returns the distance and a material id,
  sponge or icing. Its seven uniforms are the cake's height and radius,
  the icing's colour, rounding and thickness, the slice's angle, and the
  sponge's colour. Three more functions give a material's albedo,
  metalness and roughness; metalness is 0 for both.
- `docs/src/raymarch/fragment.js` assembles the fragment shader: Three.js's
  `common`, `lights_pars_begin` and `lights_physical_pars_fragment` chunks,
  the two GLSL chunks above, then the march. A ray that misses the cake's
  bounding sphere about the origin is discarded at once; the rest march
  up to 96 steps, stopping within 0.1 mm of the surface or 2 m out. A
  hit's normal comes from four field reads 0.5 mm apart, its shadow from
  a march of up to 48 steps towards each directional light, and its
  shading from the same `RE_Direct()` and `RE_IndirectDiffuse()` as
  `MeshStandardMaterial`, on a `PhysicalMaterial` the shader fills by
  hand, before Three.js's tone mapping and colour-space chunks.
- `docs/src/raymarch/vertex.js` passes the quad's corners straight to
  clip space and hands each fragment its normalised device coordinates.
- `docs/index.html` has the canvas and a mode radio group with one radio,
  Presentation, checked, wired to nothing. `docs/styles/main.css` styles
  the toolbar and the choices as pureland-simulator does.

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

## The architecture

**Derived** throughout, unless marked. The shape the plans share; each
plan's Decisions settle the values and names it introduces.

### 1. Recipes, materials and the resolver

- The cakes live as data in `docs/src/cake/recipes.js`, an array in walk
  order, each with an assigned id, as CLAUDE.md asks of anything saved
  that other things point at. The loop of cakes is that array's order,
  and the page's location hash names the cake shown, so a cake can be
  linked to.
- A recipe names materials rather than colours and roughnesses: a layer
  is "sponge" or "jam", a plate "china" or "foil". A palette in
  `docs/src/cake/materials.js` maps each name to its colour, roughness,
  metalness and crumb settings, so authoring stays readable and a
  material's look is set in one place. Foil is the first use of the
  shader's metalness, which is 0 for everything else.
- A pure resolver, `docs/src/cake/resolve.js`, turns a recipe into the
  **resolved cake**: the plain numbers and colours every uniform needs,
  with the seven layer slots filled to their length with inert entries,
  as the uniform rules in
  [section 8](#8-uniform-arrays-and-the-budget) require. Transitions tween
  resolved numbers, never names, so a sponge wodge blends into a jam seam
  by colour, roughness and crumb at once. The same module validates a
  recipe: at least two parts, at most seven layers, every rounding within
  its radius and half height, the eaten steps and fractions consistent.
  Node can run both, since they import nothing from Three.js.
- The field reads the resolved cake through uniforms only, so a change to
  any value, by a spring or a slider, animates with no new shader:
  CLAUDE.md's "parameters are uniforms" rule. The recipe's exact field
  list is in [Plan 02](../done/02-plate-and-layers.md#decisions).

### 2. The parts as fields

Everything cylindrical means one field construction, one recipe shape and
no blend between fields: a transition is a tween of values, and the field
stays exact at every intermediate value, which keeps the march at the
step counts measured above. The parts, with their primitives, all exact
unless marked, from Inigo Quilez's
[distance functions](https://iquilezles.org/articles/distfunctions/) and
[2D distance functions](https://iquilezles.org/articles/distfunctions2d/)
(**Source**, read on 2026-11-24 and 2026-11-25):

- **The origin** is the centre of the plate's top surface. The stack
  rises from y = 0, and the camera looks at a height the current stack
  sets.
- **The plate** is a 2D profile revolved about the Y axis: a polyline of
  three segments, the flat base from the axis out to the base radius, the
  sweep rising to the rim radius, and the lip rising vertically, stroked
  to the plate's thickness. The 2D segment is exact, a stroke is an
  offset, and revolving an exact 2D field is exact, so the plate costs
  three segment evaluations per sample. Its edges are rounded by half its
  thickness, which is the look of china, paper and rolled foil alike; a
  separate rounding is not needed. A presence from 0 to 1 scales every
  one of its lengths, so it shrinks to a point.
- **A layer** is a capped cone, a frustum with its own bottom and top
  radii, rounded by its rounding: iq's sdCappedCone, exact, under opRound.
  Its bottom sits at a height the motion of section 3 sets; its height,
  radii and rounding are scaled by its presence. The stack is the union
  of the seven slots.
- **The topping** is a shell between an outer shape and the stack, as the
  proof of concept's icing is: the outer shape minus the stack, so the
  cut faces show the layers inside the coat. The outer shape is the union
  of a **cap** and a **skirt**, both driven by the coverage:
  - the cap is a rounded cylinder of the topping's thickness over the top
    of the stack, whose radius grows from nothing at coverage 0 to the
    crown's radius plus the thickness at coverage 0.5, with a half
    ellipsoid of the pile height on top of it for the pile, a bound the
    march tolerates (iq marks sdEllipsoid as a bound);
  - the skirt, from coverage 0.5 to 1, is the stack offset outwards by the
    thickness, cut off below a height that descends from the crown to the
    plate, with that height varied round the cake by a smooth function of
    the angle for drips. The drip is the one part of the topping that
    breaks the distance bound, by about its amplitude times its wave count
    over the radius, so the march multiplies its steps by a named factor
    while a drip is present, as CLAUDE.md requires.
  - the cap's base is the highest top of any layer, which is continuous
    while layers hang and fall, and its radius is a value of its own that
    tweens to the top present layer's radius, so a vanishing top layer
    hands the topping to the layer below without a jump.
- **The slice** is cut from the layers, the topping and the decorations,
  never the plate, as a wedge about +X. Up to 180° it is subtracted; past
  180° the remaining cake is intersected with the complementary wedge
  about −X, which is continuous at 180°. A slider at 100% eaten leaves a
  sliver of one degree, since a wedge of zero width would leave a sheet
  the march could still hit.
- **A countable decoration** is one primitive per slot in a uniform array
  of placements: a sphere for a cherry, a capped cylinder for a candle, a
  thin cylinder for an orange slice, an ellipsoid, a bound, for an
  almond. Its rest height is computed in the shader from the topping's
  surface at its radius, so it rides the topping and the crown as they
  move, and JavaScript supplies only its position on the top, its yaw,
  tilt, size, embedding and colour.
- **A scattered decoration** is a jittered 2D cell repeated over the top,
  with one capsule, a sprinkle, or one thin box, a flake, per cell,
  checking the nearest neighbour on each axis as iq's
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/)
  does, four evaluations per sample, where the single-cell version broke
  the field (**Measured**, a worst gradient of 12.84). Its count becomes
  the cell size over the top's area. It sits only where the cap is.
- **The crumb** is the fractal hole construction measured above, in the
  sponge term of each layer whose material has holes, clipped to within
  1 cm of the surface. **Inclusions** are volumes of material, not
  geometry: at a hit inside a layer, on a cut face, a jittered grid of
  ellipsoids decides whether the point lies in a raisin, a nut or a chip
  and colours it so, at eight evaluations per hit rather than per step;
  a cut through a raisin is flat anyway. **Irregularity** is a
  low-frequency displacement of a layer's surface by a named amplitude,
  which breaks the bound by its amplitude times its frequency, with its
  own step factor.
- **Materials** reach the shader as an id the field returns with the
  distance, which indexes uniform arrays of colour, roughness and
  metalness: one entry per layer slot, one for the plate, one for the
  topping, one per decoration slot, and fixed ids for the scattered kinds
  and the inclusion kinds, whose colours are uniforms or hashes.

### 3. Presence and motion

- **Presence** is the one idea that unifies cake transitions with the
  reveal slider. Every part has a presence from 0 to 1 that scales its
  lengths: a plate's profile, a layer's height and radii, the topping's
  coverage, a decoration's size. A part's target presence is 1 when the
  cake has it and the reveal slider shows it, else 0. The shrink to
  nothing, the sink and the fall are therefore written once.
- **Springs, not tweens**, for lengths: a damped spring per value,
  retargeted by setting its goal, which handles a second change mid
  transition from wherever the value is. A layer's height is a spring
  near critical damping; its bottom is a spring that follows the top of
  the stack beneath it, underdamped and slow enough to lag, which gives
  the hang on shrink and the bounce on growth from one model. The analytic
  damped-spring step keeps it frame-rate independent at any time step
  (**Source**, Ryan Juckett's
  [Damped Springs](https://www.ryanjuckett.com/damped-springs/), read on
  2026-11-25). A spring can overshoot below zero, so the uniform writer
  clamps every length at zero.
- **Eased tweens** for the slice angle and for a decoration's fall and
  sink, which need no overshoot: a quadratic ease-in for the fall, as a
  drop under gravity, and an ease-out for the sink.
- **The choreography** of a cake change, from the moment it starts:
  decorations present sink over a short interval, staggered by slot; the
  springs of the plate, layers, topping, slice and camera retarget a
  beat later; the new decorations drop once the body has mostly settled,
  staggered by slot. A change during any of this cancels the pending
  drops, sinks what is present and retargets the springs.
- **The camera** follows the cake: its distance springs to fit the
  resolved cake's bounding sphere, through a port of pureland-simulator's
  `distanceToFitSphere()`, 22 lines of pure maths (**Code**), with the
  viewer's zoom applied on top, and the rig's height springs to half the
  stack's height, so the cake stays framed and centred as it grows.
- **Reduced motion** completes a transition at once, as the slow turn
  already holds still under it.

### 4. The sliders, the keys and the UI

- Both sliders are native `<input type="range">` elements, which gives
  labels, a pointer, a focus ring and a screen reader for free, with the
  vertical one laid out by CSS writing mode. Their arrow-key handling is
  overridden: one window listener, in the capture phase, takes the four
  arrow keys for the sliders and prevents their default, so the sliders
  move the same way whatever has focus and a focused range input never
  double-steps.
- The arrow keys clash with a radio group, which moves between options by
  the same keys, so the mode radio goes: the cake is chosen by the walk
  alone. A `<button>` with an arrow icon at each end of the eaten slider
  does what Left and Right do at the ends, for the pointer.
- The eaten slider's value is a step index; a pure module maps it to the
  angle from the cake's steps and fractions. A cake with one step has a
  disabled slider at its one angle.
- The reveal slider's value is a stop index over the cake's present
  parts, in the order plate, layers from the bottom, topping,
  decorations; a pure module lists the parts and snaps a value across
  cakes by fraction of travel.
- Escape toggles the UI's visibility, through a port of
  pureland-simulator's `docs/src/ui/controls-toggle.js`, 58 lines of DOM
  (**Code**); the keys keep working while it is hidden.

### 5. Decoration placement

- A pure function in JavaScript places a recipe's countable decorations
  once per cake, deterministically from a hash seeded by the cake's id,
  the kind and the index: a count of 1 at the centre; 2 or more by
  rejection sampling over the top's disc, inset from the rim, keeping
  each item clear of every item already placed, across kinds, with the
  later kinds in the recipe taking the spots that remain. Yaw is free;
  tilt, size and embedding vary within named ranges per kind.
- Counts are whole numbers and never tween: old decorations sink and new
  ones fall, so no cake ever shows a fraction of a cherry.
- The slots are a fixed uniform array of a named size, filled to its
  length with inert entries and mutated in place, as section 8 requires.

### 6. The crumb and the budget

- The hole construction, its clip and its octave costs are measured
  above: two octaves in the sponge term only, clipped to 1 cm, is the
  starting point, with the cell size per material.
- Every part costs every pixel on every step. A cheap bound per part
  skips its evaluation where a sample is far from it: the plate's
  bounding ring, each layer's bounding cylinder, the topping's slab, the
  decorations' slab above the stack, the crumb's clip. The levers of
  section 8 stay available, and a Manual QA step in each plan measures
  the frame time on the M4 MacBook in Chrome's Performance panel, so the
  cost of each part is known as it lands, though no budget gates a plan.

### 7. Lighting, shading and the silhouette

- The shading stays as ADR 001 settled it: Three.js's physical chunks on a
  struct the shader fills, lit by the scene's lights, with the field's
  own soft shadows (**Code**). The plate receives the cake's shadow from
  the same march.
- **Ambient occlusion** in the crumb of a cut face would make the holes
  read as holes: Inigo Quilez's five-tap occlusion along the normal costs
  five field samples per hit. Not in the first plans.
- **An environment map** for reflections in glossy icing and foil is
  possible later through `PMREMGenerator` and the chunks' indirect
  specular term; the page's background is plain colour, so there is
  nothing to reflect yet. Not in the first plans.
- **The silhouette is not antialiased**: the renderer's antialiasing
  smooths triangle edges only, and the quad's lie off screen (**Code**).
  Coverage alpha from a missed ray's closest approach is nearly free;
  FXAA needs a render target and one vendored addon; supersampling costs
  the ratio squared. All wait in the backlog.

### 8. Uniform arrays and the budget

- **Arrays in uniforms** (**Source**, r187's `WebGLUniforms.js`, read on
  2026-11-24): a GLSL `float radii[7]` takes a `Float32Array` as its
  value; a `vec3 colors[7]` an array of objects with a `toArray()`
  method, such as `Vector3` or `Color`, which Three.js flattens into a
  `Float32Array` it caches, so nothing is allocated per frame. Every
  active element must be supplied, and with a loop whose bound is a
  constant the compiler keeps them all, so a short JavaScript array
  throws. The arrays are therefore filled to their GLSL length with inert
  entries and mutated in place, never rebuilt.
- **The levers, cheapest first**, should the frame time on the M4 ever
  need them (**Source** throughout, read on 2026-11-24): fewer pixels by
  `setPixelRatio()` below 1, which `setSize(w, h, false)` lets the browser
  stretch; a stop by the pixel's footprint with a best candidate, which
  ended the creeping rays and saved 14% of steps (**Measured**); a step
  cap of 64 once that is in; a shorter shadow march with iq's improved
  penumbra; over-relaxation at 1.2 to 1.4, 9% here (**Measured**); and
  `mediump` for the colour maths alone, never the march.
- **Measuring.** `renderer.info` counts draws, not time: one call and
  two triangles for this scene. GPU timer queries work in desktop Chrome
  alone. Frame time is therefore read in Chrome's Performance panel over
  a set interaction, and the test for being fragment-bound is halving the
  pixel ratio: a frame time that halves with it is the shader's.

## The plans

Seven plans, in this order, each ending in something the Lead Developer can
QA in the browser; the seam between each pair is where one could be
accepted and the next rejected.

1. [Plan 02, The recipe, the plate and the layer stack](../done/02-plate-and-layers.md):
   the six recipes as data, the materials palette, the resolver and its
   validation, the plate and the seven layer slots in the field, the
   slice past 180°, and the cake chosen by the location hash. Visible
   proof: each cake's plate and layers, bare, with the slice showing the
   layers.
2. [Plan 03, The frame budget](03-frame-budget.md): the pixel-ratio
   cap, a cheap bound per part, and marches that end where nothing is left
   to hit, so the heaviest cake holds 60 fps with room for the parts to
   come. Visible proof: the same cakes as Plan 02, at a steady frame time.
3. [Plan 04, The topping](04-topping.md): the cap, the pile, the skirt
   and the drips driven by the coverage, with the topping's materials.
   Visible proof: a pink Victoria sponge again, piled cream on the custard
   pie, drips down the chocolate cake, and a bare cheesecake.
4. [Plan 05, Transitions and the cake walk](05-transitions.md): the
   springs, the motion state, the choreography of the plate, layers,
   topping and slice, Left and Right with the arrow buttons walking the
   loop, and the camera following the cake. Visible proof: one cake
   becomes the next, layers hanging and bouncing, and a second press mid
   transition retargets.
5. [Plan 06, Decorations](06-decorations.md): the countable and scattered
   kinds, their placement, their fields and their sink and fall. Visible
   proof: cherries, candles, orange slices, almonds, sprinkles and flakes
   that fall into place last and sink away first.
6. [Plan 07, The eaten and reveal sliders](07-sliders.md): the two range
   inputs, the stepped eaten angle, the reveal of the parts, the four
   keys and Escape. Visible proof: the cake eaten step by step and taken
   apart stop by stop.
7. [Plan 08, The crumb](08-crumb.md): sponge holes, inclusions and
   irregularity. Visible proof: a pitted cut face with raisins and chips
   in it, and a lumpy top.
8. Then Sandbox Mode or Gameplay Mode, after research of their own.

## Sources

- Inigo Quilez,
  [distance functions](https://iquilezles.org/articles/distfunctions/),
  [2D distance functions](https://iquilezles.org/articles/distfunctions2d/),
  [normals for SDFs](https://iquilezles.org/articles/normalsSDF/),
  [raymarching distance fields](https://iquilezles.org/articles/raymarchingdf/)
  and [soft shadows](https://iquilezles.org/articles/rmshadows/), the
  formulas the proof of concept and the parts follow, read on 2026-11-24
  and 2026-11-25.
- Inigo Quilez,
  [the smooth minimum](https://iquilezles.org/articles/smin/),
  [the fbm SDF](https://iquilezles.org/articles/fbmsdf/),
  [domain repetition](https://iquilezles.org/articles/sdfrepetition/) and
  [the Menger sponge](https://iquilezles.org/articles/menger/), for the
  crumb, the inclusions and the scattered decorations.
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
- Ryan Juckett,
  [Damped Springs](https://www.ryanjuckett.com/damped-springs/), for the
  analytic step of a damped spring at any time step.
- [The GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf),
  sections 4.5.1 to 4.5.4, for `highp` and `mediump`.
- Three.js r187 unminified source, read on 2026-11-24:
  [`src/renderers/WebGLRenderer.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/WebGLRenderer.js)
  (setPixelRatio() and setSize()),
  [`src/renderers/webgl/WebGLInfo.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLInfo.js)
  and
  [`src/renderers/webgl/WebGLUniforms.js`](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLUniforms.js),
  for arrays in uniforms, with
  [glGetActiveUniform](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGetActiveUniform.xhtml)
  and
  [glUniform](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glUniform.xhtml)
  for which elements are active and what a short upload does.
- [EXT_disjoint_timer_query_webgl2](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
  and
  [its usage survey](https://web3dsurvey.com/webgl2/extensions/EXT_disjoint_timer_query_webgl2),
  for where GPU timing is available.
- MDN,
  [Creating vertical form controls](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_writing_modes/Vertical_controls),
  for a vertical range input by writing mode.
- pureland-simulator's `docs/src/camera/fit.js` and
  `docs/src/ui/controls-toggle.js`, read on 2026-11-24, for what
  Presentation Mode can still port.

## Decision record

- **Turntable, not orbit.** The cake turns under lights that keep their
  place beside the viewer; built.
- **The slow turn stays**, paused while a press holds the cake; built.
- **Zoom by the standard inputs**: the scroll wheel and a trackpad's
  scroll, with every pinch, and a Cmd-drag on Apple devices or a Ctrl-drag
  on others; built.
- **Every cake is cylindrical.** No square, hexagonal or ring cakes, so
  one recipe shape and no blend between fields.
- **Four parts**: plate, seven layer slots, topping, decorations, each
  with a presence, as [the brief](#the-brief) sets out.
- **A layer is a frustum**, with its own top and bottom radii.
- **Decorations are countable or scattered**, and candles are unlit.
- **A transition retargets** from the current state when interrupted.
- **The camera follows the cake**: distance to fit, height to the stack's
  middle, with the origin at the plate's top.
- **Reveal snaps by fraction of travel**, preferring the higher stop,
  and a cake's stops are exactly the parts it has.
- **Desktop first**: the M4 MacBook in Chrome is the only target for now,
  with no announcements or live region.
- **No mode radio, no words in the UI**: an arrow icon at each end of the
  eaten slider, and nothing names the cake.
- **The first six cakes**: a Victoria sponge, a chocolate cake with drips
  and candles, a cheesecake on a paper base with no topping, a custard pie
  with piled cream, a Black Forest gateau with cherries, and a fruit cake
  with almonds.
- **Bites and icing swatches** are out of the plans: the eaten slider
  replaces bites, and colours live in each recipe.

No open questions remain.

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
- **2026-11-24T22:42:50Z** — **ruled**: the Lead Developer ruled open
  questions 1 and 2, the slow turn paused while held and the turntable,
  and asked for zoom by scroll, every pinch and Cmd-drag; built directly,
  without a plan, and passed the Lead Developer's manual QA the same day.
  Section 5, Plan 02 and the decision record updated; the open questions
  renumbered.
- **2026-11-25T01:20:27Z** — **ruled**: the Lead Developer gave the full
  brief for Presentation Mode, four parts with presence, choreographed
  transitions, the eaten and reveal sliders and the arrow keys, and ruled
  every open question: all cakes cylindrical, frustum layers, no rings,
  retarget mid transition, the camera following the cake, reveal snapping
  by fraction, stops as the parts a cake has, unlit candles, desktop only,
  no announcements, no mode radio and no words in the UI. The brief, the
  code survey, the architecture, the plans, the sources and the decision
  record rewritten; the measurements kept; families, field blending,
  bites and swatches removed; Plans 02 to 07 drafted.
