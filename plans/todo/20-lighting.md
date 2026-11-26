---
title: Lighting for dark glazes and metal plates
description: Adds an environment sheen and an unshadowed back light, so dark chocolate reads on a white page and metal plates shine at the view at load.
type: plan
---

## Context

- Delivers lighting that lets a dark chocolate cake be read on the light
  page, and a metal plate shine from the view at load, not only when
  tipped towards the key light.
- The causes, read in shadeAt() in `docs/src/raymarch/fragment.js` and
  `docs/src/scene/lights.js` on 2026-11-26 and not yet confirmed in the
  browser: shadeAt() calls RE_Direct() for the key light and
  RE_IndirectDiffuse() for the hemisphere, and never
  RE_IndirectSpecular(), so a surface gets specular light from the key
  light's direction alone. A metal's diffuse is 0, its
  `diffuseContribution` being the albedo times 1 less the metalness, so
  a metal plate is black wherever the key light's highlight does not
  fall, and a glossy dark glaze shows one small highlight and no sheen.
  At the view at load, 22° above the table, a flat plate mirrors the
  space behind the cake at 22°, where no light is: the key light sits in
  front, 47° up.
- Builds on [Plan 02](../done/02-plate-and-layers.md)'s lights and
  [Plan 11](../done/11-cast-shadows.md)'s marched shadows; follows
  [Plan 19](19-plate-textures.md), so the sheen is judged over the wear.
- Rests on Three.js r187's
  [lights_physical_pars_fragment.glsl.js](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js),
  whose RE_IndirectSpecular_Physical(radiance, irradiance,
  clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir,
  geometryClearcoatNormal, material, reflectedLight) adds the radiance
  times the single scattering as indirect specular, and the diffuse times
  the irradiance over π as indirect diffuse (verified 2026-11-26); and on
  [WebGLLights.js](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgl/WebGLLights.js),
  which sorts shadow-casting and textured lights first and otherwise
  keeps scene order (verified 2026-11-26).

## Decisions

1. **A procedural environment, no texture.** environmentRadianceAt() in
   the fragment shader gives the light a reflected ray sees: the
   hemisphere's sky and ground colours mixed by the reflected direction's
   height, in the rig's frame as the lights are, blurred towards their
   mean by the roughness, plus a window: `ENVIRONMENT_WINDOW_RADIANCE`
   1.5 times `pow(max(dot(reflected, window), 0), sharpness)`, the
   sharpness `ENVIRONMENT_WINDOW_SHARPNESS`, 8, the window above and
   behind the viewer along the key light. A broad highlight metals and
   glazes show from most angles. No environment map, so no asset and no
   PMREM, per CLAUDE.md's
   [minimum dependencies](../../CLAUDE.md#critical-absolute-minimum-dependencies).
   First guesses, to tune by eye.
2. **It is handed to Three.js's own chunk.** shadeAt() calls
   RE_IndirectSpecular() with that radiance, an irradiance of
   `vec3(0.0)` and a clearcoat radiance of `vec3(0.0)`: the hemisphere's
   irradiance already goes to RE_IndirectDiffuse(), and passing it again
   would count the diffuse twice. The reflected direction is in the
   rig's frame: a `rigInverseRotation` mat3 uniform, written each frame
   from the rig's rotation into a scratch Matrix3 in `docs/src/main.js`,
   turns the world reflection into it.
3. **A back light.** A second DirectionalLight, `BACK_LIGHT_COLOR`
   `0xcfe0f5`, `BACK_LIGHT_INTENSITY` 1.2, at `BACK_LIGHT_POSITION`
   `[-0.6, 0.45, -1]` in the rig: left, low and behind the cake, so a
   flat plate mirrors it towards the viewer at the view at load, and it
   rims a dark cake. Only the first directional light marches a shadow:
   the shadow call is guarded by `UNROLLED_LOOP_INDEX == 0`, which
   Three.js's loop unroller replaces with the index (r187
   WebGLProgram.js, verified 2026-11-26); the key light is added to the
   rig before the back light, so it is index 0 by Decision 3's sort.
4. **Tone mapping and exposure stay.** If the scene brightens too far,
   the fill's intensity is the lever, by eye.
5. **No performance step.** The environment adds a few operations at
   the hit, and the back light one RE_Direct() per hit with no shadow
   march.

## Steps

### Step 1: The back light

- `docs/src/scene/lights.js`: the back light, after the key.
- `docs/src/raymarch/fragment.js`: the shadow march for index 0 alone.
- It should rim the chocolate drip cake and light the china plate's far
  side a little (Manual QA 1).
- It should keep the key light's shadows as they are (Manual QA 4).

**Agent QA**

- Do: `grep -c "UNROLLED_LOOP_INDEX == 0" docs/src/raymarch/fragment.js`
- Expect: `1`.
- Do: `grep -c "new DirectionalLight" docs/src/scene/lights.js`
- Expect: `2`.

### Step 2: The environment sheen

- `docs/src/raymarch/fragment.js`: environmentRadianceAt() and the
  RE_IndirectSpecular() call of Decision 2.
- `docs/src/scene/quad.js` and `docs/src/main.js`: the
  `rigInverseRotation` uniform, written each frame without allocating.
- It should give the Sachertorte's glaze and the chocolate drips a
  sheen that shows their shape on the light page (Manual QA 1, 2).
- It should make the gold and copper plates shine at the view at load
  (Manual QA 3).
- It should not double the hemisphere's diffuse (Manual QA 5).

**Agent QA**

- Do: `grep -c "RE_IndirectSpecular(" docs/src/raymarch/fragment.js`
- Expect: `1`.
- Do: `for f in docs/src/raymarch/fragment.js docs/src/scene/lights.js docs/src/scene/quad.js docs/src/main.js; do node --check "$f"; done`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
Sachertorte reads on the light page while the gold plate shines at the
view at load.

## Manual QA

Preconditions: set the system to the light colour scheme, from the repo
root run `npx serve docs -p 2222`, open
`http://localhost:2222/#sachertorte` in Chrome with the dev tools
console open, and hard-reload. Keep the live site,
`https://richplastow.com/sdf-cake/`, in a second window of the same size.
Every step also expects no error, warning or shader log in the console.

1. **Do:** Press Up until the cake is whole, double-click to reset the
   view, and compare with the live site.
   - **Expect:** The glaze shows a soft sheen that reveals the top's
     curve and the sides, and a cool rim along the edge away from the
     key light; the cake is no longer a flat dark disc on the white
     page.
2. **Do:** Reload at `#4` and `#bolo-formigueiro` in turn, press Up
   until each is whole.
   - **Expect:** The drips' ridges and ends read in the sheen.
3. **Do:** Reload at `#artemis-offering` and `#pepionkh-honey-cake` in
   turn, press Up once, and double-click to reset the view.
   - **Expect:** The gold and the copper shine from this view, a broad
     soft highlight across the plate, not the dull flat colour of the
     live site.
4. **Do:** Reload at `#2`, press Up until it is whole, and drag to look
   straight down on its shadow.
   - **Expect:** One soft shadow from the key light, as on the live
     site; no second shadow.
5. **Do:** Reload at `#3` and compare its cream and icing with the live
   site.
   - **Expect:** About as bright as before, with a gentle sheen; not
     washed out.
   - **Why:** A doubled irradiance brightens every diffuse surface.
6. **Do:** Switch the system to the dark colour scheme and repeat
   steps 1 and 3.
   - **Expect:** The sheen and the shine read on the dark page too.
7. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools'
   device mode.
   - **Expect:** As step 1.

## Audit

- **2026-11-26T18:16:00Z** — **drafted**: split from the visual
  refinements brief, the last of Plans 14 to 20. Proposed by the agent:
  the causes in Context, the procedural environment and its constants,
  the back light's colour, intensity and position, and shadowing the key
  light alone.
