import { LAYER_SLOTS } from "../cake/slots.js";
import {
  LAYER_BLEND_FADE_METERS,
  WONKY_DOME_OFFSET,
  WONKY_LUMP_METERS,
  WONKY_LUMP_RADIANS_PER_METER,
  WONKY_OOZE_METERS,
  WONKY_OUTLINE,
  WONKY_OUTLINE_FADE_FRACTION,
  WONKY_OUTLINE_WAVES,
  WONKY_OUTLINE_WEIGHTS,
  WONKY_RISE_METERS,
  WONKY_SHIFT_METERS,
} from "../cake/wonky.js";
import { toGlslFloat } from "./decorations.js";

/** #### The GLSL chunk of the layer stack's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and the crumb's,
 *   src/sdf/crumb.js, pasted before it.
 * - Each of the `LAYER_SLOTS` slots is a capped cone on the Y axis, of its
 *   bottom and top radii, standing on its bottom, with its edges rounded:
 *   iq's sdCappedCone with opRound, exact. A slot of zero height is
 *   skipped. Its surface is displaced by its irregularity, and its
 *   fractal holes are cut from it beneath a skin, as
 *   src/sdf/crumb.js sets out.
 * - The arrays hold one entry per slot, lengths in metres. `layerCrumbs`
 *   packs a slot's crumb: x its hole strength, 0 to 1, y its hole cell, z
 *   its inclusion cell and w its irregularity's amplitude, in metres;
 *   `layerInclusionWeights` its shares of chips, nuts and raisins; and
 *   `layerTranslucencies` its translucency, 0 to 1, which the shading
 *   reads; and `layerHoleFills`, above 0.5 where the layer's holes are
 *   filled, solid, with HOLE_FILL_COLOR rather than cut; and
 *   `layerCrusts`, 0 to 1, how far the layer browns to CRUST_COLOR near
 *   its outer surface, with `layerCrustSaturations` the saturation of
 *   that crust's colour, 0 grey to 1 full, and `layerScorches` its scorch
 *   marks, as scorchAt() in src/sdf/crumb.js unpacks them, with
 *   `layerScorchSeeds` their seed and `layerScorchClusterings` how far
 *   they gather in the middle, 0 to 1.
 * - The cake's `wonky`, 0 to 1, shapes every layer, as src/cake/wonky.js
 *   sets out: once per sample, wonkyOutlineAt() pulls the outline in or
 *   pushes it out by three hashed harmonics round the cake, scaled by
 *   `wonkyRadiusMeters`, the widest used layer's radius, and phased by
 *   `wonkyPhasesRadians`; each slot's top is domed or sagged and lumped by
 *   layerTopOffsetAt(), the offsets adding up the stack so the lowest
 *   layer's underside stays flat; and a soft slot is set off along its
 *   direction and cut back to the slot beneath it, grown by its ooze.
 *   `layerWonkies` packs a slot's numbers: x its rise, -1 sags to 1 domes,
 *   y its softness, 0 to 1, and z and w its direction's cosine and sine.
 * - A slot's frame, as layerFrameOf() gives it, holds what its distance
 *   reads of the wonky stack: x its radius, outlined and, if soft,
 *   shifted, y the outlined radius unshifted, and z and w the offsets of
 *   its bottom and its top, in metres. layerFrameAt() works one out from
 *   a point alone, for the readers of a layer away from the march.
 * - layerBoundDistance() is a cheap lower bound on a slot's distance, so
 *   layersField() can skip a slot that cannot be the nearest part. It
 *   takes the round point in the plane of revolution, q, its distance
 *   from the Y axis and its height, in metres.
 * - layersField() returns the distance in metres, negative inside a layer,
 *   the nearest layer's material id, its slot, 0 to `LAYER_SLOTS` − 1, and
 *   the smoothed stack's distance in metres, for the topping's coat.
 */
export const layersChunk = /* glsl */ `
  uniform float layerBottomRadiiMeters[${LAYER_SLOTS}];
  uniform float layerBottomsMeters[${LAYER_SLOTS}];
  uniform vec3 layerColors[${LAYER_SLOTS}];
  uniform vec4 layerCrumbs[${LAYER_SLOTS}];
  uniform float layerCrustSaturations[${LAYER_SLOTS}];
  uniform float layerCrusts[${LAYER_SLOTS}];
  uniform float layerScorchClusterings[${LAYER_SLOTS}];
  uniform float layerScorchSeeds[${LAYER_SLOTS}];
  uniform vec4 layerScorches[${LAYER_SLOTS}];
  uniform float layerHeightsMeters[${LAYER_SLOTS}];
  uniform float layerHoleFills[${LAYER_SLOTS}];
  uniform vec3 layerInclusionWeights[${LAYER_SLOTS}];
  uniform float layerRoughnesses[${LAYER_SLOTS}];
  uniform float layerRoundingsMeters[${LAYER_SLOTS}];
  uniform float layerTopRadiiMeters[${LAYER_SLOTS}];
  uniform float layerTranslucencies[${LAYER_SLOTS}];
  uniform vec4 layerWonkies[${LAYER_SLOTS}];
  uniform float wonky; // 0 perfect to 1 wonkiest
  uniform vec3 wonkyPhasesRadians;
  uniform float wonkyRadiusMeters;

  const int LAYER_SLOTS = ${LAYER_SLOTS};
  // The offsets of the slots' bottoms and the stack's top: one more than
  // the slots.
  const int LAYER_LEVELS = LAYER_SLOTS + 1;

  // How tall a slot must be to join the smoothed stack at the full blend,
  // in metres: half the thinnest layer any recipe holds, so every layer at
  // rest blends in full. A thinner slot, growing from nothing or vanishing,
  // blends in proportion, so its lift of the smoothed stack's top, up to a
  // quarter of its blend, fades as it does rather than vanishing in one
  // frame as its height crosses 0. The blend changes with time, not across
  // space, so the field keeps its bound. A slot's wonky top offset fades
  // in the same way, from src/cake/wonky.js.
  const float LAYER_BLEND_FADE_METERS = ${toGlslFloat(LAYER_BLEND_FADE_METERS)};
  // The least blend a slot joins with, in metres, since smoothMinDistance()
  // divides by its blend: a lift of at most 0.25 micrometres.
  const float MIN_LAYER_BLEND_METERS = 1e-6;
  // The wonky shapes' amplitudes and frequencies, from src/cake/wonky.js:
  // lengths in metres per unit of wonky, fractions of the widest radius
  // unitless, frequencies in radians per metre.
  const float WONKY_DOME_OFFSET = ${toGlslFloat(WONKY_DOME_OFFSET)};
  const float WONKY_LUMP_METERS = ${toGlslFloat(WONKY_LUMP_METERS)};
  const float WONKY_LUMP_RADIANS_PER_METER = ${toGlslFloat(
    WONKY_LUMP_RADIANS_PER_METER,
  )};
  const float WONKY_OOZE_METERS = ${toGlslFloat(WONKY_OOZE_METERS)};
  const float WONKY_OUTLINE = ${toGlslFloat(WONKY_OUTLINE)};
  const float WONKY_OUTLINE_FADE_FRACTION = ${toGlslFloat(
    WONKY_OUTLINE_FADE_FRACTION,
  )};
  const vec3 WONKY_OUTLINE_WAVES = vec3(${WONKY_OUTLINE_WAVES.map(
    toGlslFloat,
  ).join(", ")});
  const vec3 WONKY_OUTLINE_WEIGHTS = vec3(${WONKY_OUTLINE_WEIGHTS.map(
    toGlslFloat,
  ).join(", ")});
  const float WONKY_RISE_METERS = ${toGlslFloat(WONKY_RISE_METERS)};
  const float WONKY_SHIFT_METERS = ${toGlslFloat(WONKY_SHIFT_METERS)};
  // The least length the wonky shapes divide by, in metres, a radius or
  // the topping's base height, so a cake with no layer divides by no zero.
  const float WONKY_LEAST_LENGTH_METERS = 1e-6;

  // How far the wonky outline pulls a point's radius in, in metres, or
  // pushes it out, below 0: wonky x WONKY_OUTLINE x the widest radius x
  // three harmonics round the cake, 0.5 sin(2a + f1) + 0.35 sin(3a + f2) +
  // 0.15 sin(5a + f3), the phases hashed per cake, faded in by a
  // smoothstep from 0 at the axis, where the angle is undefined and never
  // read, to 1 at WONKY_OUTLINE_FADE_FRACTION of the widest radius. A
  // domain warp of the radius, after iq's domain operations,
  // https://iquilezles.org/articles/distfunctions/: it breaks the bound by
  // WONKY_OUTLINE_GRADIENT per unit of wonky, which the march's step
  // factor covers.
  float wonkyOutlineAt(vec3 p) {
    float radius = length(p.xz);
    float fade = smoothstep(
      0.0,
      max(
        WONKY_OUTLINE_FADE_FRACTION * wonkyRadiusMeters,
        WONKY_LEAST_LENGTH_METERS
      ),
      radius
    );
    if (fade <= 0.0) return 0.0;
    float angle = atan(p.z, p.x);
    float profile = dot(
      WONKY_OUTLINE_WEIGHTS,
      sin(WONKY_OUTLINE_WAVES * angle + wonkyPhasesRadians)
    );
    return wonky * WONKY_OUTLINE * wonkyRadiusMeters * profile * fade;
  }

  // The lumps over every layer's top at a point, -1 to 1: iq's product of
  // sines, his displacement example,
  // https://iquilezles.org/articles/distfunctions/, read once per sample.
  float wonkyLumpsAt(vec2 xz) {
    vec2 waves = sin(WONKY_LUMP_RADIANS_PER_METER * xz);
    return waves.x * waves.y;
  }

  // How far the slot's top rises at a point, in metres, below 0 where it
  // sags: wonky x (rise x WONKY_RISE_METERS x dome + WONKY_LUMP_METERS x
  // lumps), the dome max(1 - (d / r0)^2, 0) of the distance from its
  // centre, WONKY_DOME_OFFSET of the widest radius, r0, along the slot's
  // direction. It fades in with the slot's height over
  // LAYER_BLEND_FADE_METERS, as layersField() fades its blend, so a slot
  // growing from nothing lifts the layers above it gradually, and never
  // thins the slot below nothing. 0 for an unused slot. A height field, so
  // it breaks the bound by WONKY_TOP_GRADIENT per unit of wonky, which the
  // march's step factor covers.
  float layerTopOffsetAt(vec2 xz, float lumps, int slot) {
    float height = layerHeightsMeters[slot];
    if (height <= 0.0) return 0.0;
    vec4 wonkies = layerWonkies[slot];
    vec2 across = (xz - WONKY_DOME_OFFSET * wonkyRadiusMeters * wonkies.zw) /
      max(wonkyRadiusMeters, WONKY_LEAST_LENGTH_METERS);
    float dome = max(1.0 - dot(across, across), 0.0);
    float offset = wonky *
      (wonkies.x * WONKY_RISE_METERS * dome + WONKY_LUMP_METERS * lumps) *
      clamp(height / LAYER_BLEND_FADE_METERS, 0.0, 1.0);
    return max(offset, -height);
  }

  // The stack's top offset at a point, in metres: every slot's top
  // offset, added up the stack, as stackTopOffsetAt() in
  // src/cake/wonky.js adds them for the decorations' slots.
  float layerStackTopOffsetAt(vec2 xz) {
    float lumps = wonkyLumpsAt(xz);
    float offset = 0.0;
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      offset += layerTopOffsetAt(xz, lumps, slot);
    }
    return offset;
  }

  // The slot's frame at p, from the sample's outline shift and the
  // offsets of the slot's bottom and top, in metres: x its radius,
  // outlined and, for a soft slot, taken from p shifted along its
  // direction by wonky x WONKY_SHIFT_METERS times its softness, y the
  // outlined radius unshifted, z and w the offsets.
  vec4 layerFrameOf(
    vec3 p,
    int slot,
    float outline,
    float bottomOffset,
    float topOffset
  ) {
    float outlined = length(p.xz) - outline;
    vec4 wonkies = layerWonkies[slot];
    float shifted = outlined;
    if (wonkies.y > 0.0) {
      vec2 shift = wonky * WONKY_SHIFT_METERS * wonkies.y * wonkies.zw;
      shifted = length(p.xz - shift) - outline;
    }
    return vec4(shifted, outlined, bottomOffset, topOffset);
  }

  // The slot's frame at p, as layerFrameOf() gives it, worked out from the
  // point alone, for a reader of the layer away from cakeFieldOf(), which
  // works out the offsets once per sample for every slot. Every reader of
  // a layer must read the same wonky layer the march hit.
  vec4 layerFrameAt(vec3 p, int slot) {
    float lumps = wonkyLumpsAt(p.xz);
    float bottomOffset = 0.0;
    for (int beneath = 0; beneath < LAYER_SLOTS; beneath++) {
      if (beneath >= slot) break;
      bottomOffset += layerTopOffsetAt(p.xz, lumps, beneath);
    }
    return layerFrameOf(
      p,
      slot,
      wonkyOutlineAt(p),
      bottomOffset,
      bottomOffset + layerTopOffsetAt(p.xz, lumps, slot)
    );
  }

  // A lower bound on the distance to the slot's layer, in metres: the
  // greater of its slab's distance and its cylinder's, at the wider of its
  // two radii, less its irregularity's amplitude, at the round point in
  // the plane of revolution. The rounded cone lies wholly inside both, the
  // displacement reaches the amplitude beyond it at most, and the holes
  // only raise the distance, so the bound never exceeds the layer's own
  // distance, inside it or out. The wonky layer reaches further: its slab
  // grows by the most the offsets of its top and every slot beneath can
  // move it, wonky x (WONKY_RISE_METERS + WONKY_LUMP_METERS) a slot, and
  // its cylinder by the outline's reach and a soft slot's shift, as
  // writeCakeBounds() in src/cake/resolve.js grows the stack's.
  float layerBoundDistance(vec2 q, int slot) {
    float halfHeight = 0.5 * layerHeightsMeters[slot];
    float center = layerBottomsMeters[slot] + halfHeight;
    float rise = wonky * (WONKY_RISE_METERS + WONKY_LUMP_METERS) *
      float(slot + 1);
    float spread = wonky *
      (WONKY_OUTLINE * wonkyRadiusMeters + WONKY_SHIFT_METERS);
    return max(
      abs(q.y - center) - halfHeight - rise,
      q.x - max(layerBottomRadiiMeters[slot], layerTopRadiiMeters[slot]) -
        spread
    ) - layerCrumbs[slot].w;
  }

  // The distance to the slot's layer without its holes, in metres,
  // negative inside it: its rounded cone in its frame, its bottom and top
  // raised by the frame's offsets, displaced by its irregularity. A soft
  // slot is then cut back, by a smooth maximum over its own rounding, iq's
  // smooth intersection, https://iquilezles.org/articles/smin/, to the
  // column of the slot beneath at its top radius, outlined but unshifted,
  // grown by wonky x WONKY_OOZE_METERS, so it oozes past that slot's edge
  // rather than hanging in space; the cut mixes in with the softness and
  // with the slot beneath's height over LAYER_BLEND_FADE_METERS, so it
  // springs. The slot may be computed, not only a loop's index: GLSL ES
  // 3.00 allows any integer index into a uniform array that holds no
  // samplers (its issue 12.30), and leaves only an index outside 0 to
  // LAYER_SLOTS - 1 undefined (its section 4.1.9), which no caller passes.
  float layerPlainDistance(vec3 p, vec4 frame, int slot) {
    float halfHeight =
      0.5 * (layerHeightsMeters[slot] + frame.w - frame.z);
    float plain = roundedCappedConeDistance(
      vec2(frame.x, p.y - layerBottomsMeters[slot] - frame.z - halfHeight),
      layerBottomRadiiMeters[slot],
      halfHeight,
      layerRoundingsMeters[slot],
      layerTopRadiiMeters[slot]
    ) + irregularityAt(p, layerCrumbs[slot].w);
    float softness = layerWonkies[slot].y;
    if (slot > 0 && softness > 0.0) {
      int beneath = slot - 1;
      float column = frame.y - layerTopRadiiMeters[beneath] -
        wonky * WONKY_OOZE_METERS;
      float cut = softness * clamp(
        layerHeightsMeters[beneath] / LAYER_BLEND_FADE_METERS,
        0.0,
        1.0
      );
      plain = mix(
        plain,
        smoothMaxDistance(
          plain,
          column,
          max(layerRoundingsMeters[slot], MIN_LAYER_BLEND_METERS)
        ),
        cut
      );
    }
    return plain;
  }

  // The distance to the slot's layer, in metres, negative inside it: the
  // plain layer with its fractal holes cut from it beneath its skin, so
  // an outer surface shows fewer and narrower than a cut face, or left
  // whole where its holes are filled, as the shading colours them, or for
  // a shadow ray, which treats the crumb as solid, as no light passes
  // through it. It takes the slot's frame, as layerFrameOf() gives it.
  float layerDistance(vec3 p, vec4 frame, int slot, bool isShadowRay) {
    if (isShadowRay || layerHoleFills[slot] > 0.5) {
      return layerPlainDistance(p, frame, slot);
    }
    vec4 crumb = layerCrumbs[slot];
    return skinnedHolesDistance(
      p,
      crumb.y,
      layerPlainDistance(p, frame, slot),
      crumb.x
    );
  }

  // The field of the stack at p, its round q, for the bounds, its outline
  // shift and the offsets of every slot's bottom and the stack's top, as
  // cakeFieldOf() works them out once per sample, carried on from the
  // stack's field so far: x is the distance in metres to the nearest layer,
  // negative inside it, y that layer's slot as its material id, and z the
  // smoothed stack's distance in metres, the layers joined by
  // smoothMinDistance() with the blend, in metres, faded for a slot thinner
  // than LAYER_BLEND_FADE_METERS, which the topping's coat follows. It
  // walks the slots in order, folding every slot it reaches into z in slot
  // order, since the smooth minimum is not associative: the seed slot, -1
  // for none, already in x and y, joins z at its own place with its
  // distance as given, and any other slot whose
  // bound is the blend or more beyond the nearest distance so far, of any
  // part, is left out: such a slot cannot lower the cake's least distance,
  // and lies too far from the nearest layer to change the smoothed one.
  // The hidden slot, beneath a translucent layer, is left out entirely. A
  // shadow ray reads each layer without its holes, as layerDistance() says.
  vec3 layersField(
    vec3 p,
    vec2 q,
    float outline,
    float levels[LAYER_LEVELS],
    float blend,
    float nearest,
    int seedSlot,
    float seedDistance,
    int hiddenSlot,
    bool isShadowRay,
    vec3 stack
  ) {
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      float height = layerHeightsMeters[slot];
      if (height <= 0.0 || slot == hiddenSlot) continue;
      float layer = seedDistance;
      if (slot != seedSlot) {
        if (layerBoundDistance(q, slot) >= nearest + blend) continue;
        layer = layerDistance(
          p,
          layerFrameOf(p, slot, outline, levels[slot], levels[slot + 1]),
          slot,
          isShadowRay
        );
        if (layer < stack.x) stack.xy = vec2(layer, float(slot));
        nearest = min(nearest, layer);
      }
      float fade = clamp(height / LAYER_BLEND_FADE_METERS, 0.0, 1.0);
      float slotBlend = max(blend * fade, MIN_LAYER_BLEND_METERS);
      stack.z = smoothMinDistance(stack.z, layer, slotBlend);
    }
    return stack;
  }
`;
