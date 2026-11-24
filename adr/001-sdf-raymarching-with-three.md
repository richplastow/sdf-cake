# ADR 001: Render the cake by SDF raymarching on a Three.js full-screen quad

- **Status:** accepted, 24 November 2026
- **Decided by:** the Lead Developer, on research the agent verified against
  the Three.js r187 source on 24 November 2026

## Context

The app renders a cake that must take bites, grow fractal sponge holes and
blend smoothly from one style to another. A triangle mesh does all of that
badly: each is a geometry rebuild. A signed distance field (SDF) does all of
it by changing the function, or the parameters, that gives the distance to
the surface at any point, and a fragment shader can render such a field
directly by raymarching. The Lead Developer ruled that the scene uses no
triangles beyond the two that make the quad the fragment shader draws on.

The open question was whether Three.js, this repo family's one approved
dependency, still earns its place when it draws no mesh, and if so which of
its two renderers to use.

Three.js r187 ships no SDF or raymarching support of its own for the WebGL
renderer: its last GLSL raymarching example, `webgl_raymarching_reflect`,
was removed in r170
([PR #29774](https://github.com/mrdoob/three.js/pull/29774)), and
`SDFGeometryGenerator` turns a field into a mesh, which the ruling above
forbids. Its WebGPU renderer has a TSL helper, `RaymarchingBox`, used by
two volume examples. What the r169 example and the r187 source show is that
a plain `ShaderMaterial` on a `PlaneGeometry(2, 2)` with
`frustumCulled = false` reuses almost everything else:

- the `PerspectiveCamera`, through `cameraPosition` and `viewMatrix`, which
  the renderer declares for every material, plus the camera's world matrix
  and inverse projection matrix passed as uniforms by reference;
- the scene's lights, through `lights: true` and `UniformsLib.lights`, which
  the renderer fills every frame, in view space;
- physically based shading, through `#include <common>`,
  `<lights_pars_begin>` and `<lights_physical_pars_fragment>`: the same
  `PhysicalMaterial`, `BRDF_GGX`, `RE_Direct()` and `RE_IndirectDiffuse()`
  as `MeshStandardMaterial`, once the shader fills the struct and the
  view-space geometry itself, since `lights_fragment_begin` reads a mesh's
  varyings;
- tone mapping and the output colour space, through
  `<tonemapping_fragment>` and `<colorspace_fragment>`.

Shadow maps are the one thing the quad cannot reuse, as they need the
vertex shader's shadow coordinates; the field marches its own soft shadows
instead, which a mesh could not.

## Decision

Render the cake as an SDF, raymarched in a GLSL fragment shader on one
full-screen quad, drawn by Three.js's `WebGLRenderer` with a
`ShaderMaterial` that has `lights: true`, and shaded with Three.js's own
physical shading chunks. Keep Three.js vendored exactly as
pureland-simulator vendors it: the same r187 release, the same two build
files, the same rulings in CLAUDE.md.

## Alternatives considered

- **No Three.js: raw WebGL2.** About the same amount of boilerplate as the
  quad module, but every camera matrix, control, light, BRDF, tone mapper
  and colour-space conversion would be written and tested here, and the
  two repos would no longer share one set of rules. Rejected.
- **Three.js's `WebGPURenderer` with TSL.** It has first-class `normalNode`
  and `depthNode` slots, but no shipped example lights an SDF surface
  through them; it loads three build files, about 3.7 MB unminified
  against 2.05 MB for the WebGL pair; TSL has renamed or moved something
  in most releases from r167 to r187, not all of it in the migration
  guide; and on Firefox for Linux, Intel Macs, Safari before version 26
  and every Firefox for Android it falls back to WebGL2 anyway. Rejected
  for now; revisit if the scene ever needs compute shaders or must mix
  Three.js materials with the field.

## Consequences

- The scene's only object is the quad, and the per-frame cost is per pixel,
  not per triangle: the device pixel ratio cap and the field's size matter
  more than draw calls. CLAUDE.md's
  [SDF raymarching, not triangles](../CLAUDE.md#sdf-raymarching-not-triangles)
  section records the rules this implies.
- The shading code mirrors a Three.js chunk rather than including it, so
  an upgrade of Three.js must re-read `lights_fragment_begin` and
  `lights_physical_fragment` for changes to the struct or the loops. The
  r188 migration guide already renames an argument of
  `RE_IndirectSpecular()`.
- Camera controls, when added, come from `OrbitControls`, a single addon
  file with no relative imports, or a homegrown turntable as in
  pureland-simulator: both drive the camera the shader already reads.
- Textures and environment maps stay possible: a sampler is a uniform like
  any other, and `PMREMGenerator` output can feed an indirect specular
  term later.
