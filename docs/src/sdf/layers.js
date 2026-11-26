import { LAYER_SLOTS } from "../cake/slots.js";

/** #### The GLSL chunk of the layer stack's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and the crumb's,
 *   src/sdf/crumb.js, pasted before it.
 * - Each of the `LAYER_SLOTS` slots is a capped cone on the Y axis, of its
 *   bottom and top radii, standing on its bottom, with its edges rounded:
 *   iq's sdCappedCone with opRound, exact. A slot of zero height is
 *   skipped. Its surface is displaced by its irregularity, and its
 *   fractal holes are cut from it, as src/sdf/crumb.js sets out.
 * - The arrays hold one entry per slot, lengths in metres. `layerCrumbs`
 *   packs a slot's crumb: x its hole strength, 0 to 1, y its hole cell, z
 *   its inclusion cell and w its irregularity's amplitude, in metres;
 *   `layerInclusionWeights` its shares of chips, nuts and raisins; and
 *   `layerTranslucencies` its translucency, 0 to 1, which the shading
 *   reads; and `layerHoleFills`, above 0.5 where the layer's holes are
 *   filled, solid, with HOLE_FILL_COLOR rather than cut; and
 *   `layerCrusts`, 0 to 1, how far the layer browns to CRUST_COLOR near
 *   its outer surface, with `layerCrustSaturations` the saturation of
 *   that crust's colour, 0 grey to 1 full.
 * - Every function takes the point in the plane of revolution, q, its
 *   distance from the Y axis and its height, in metres, and those that
 *   need it the point itself, p.
 * - layerBoundDistance() is a cheap lower bound on a slot's distance, so
 *   layersField() can skip a slot that cannot be the nearest part.
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
  uniform float layerHeightsMeters[${LAYER_SLOTS}];
  uniform float layerHoleFills[${LAYER_SLOTS}];
  uniform vec3 layerInclusionWeights[${LAYER_SLOTS}];
  uniform float layerRoughnesses[${LAYER_SLOTS}];
  uniform float layerRoundingsMeters[${LAYER_SLOTS}];
  uniform float layerTopRadiiMeters[${LAYER_SLOTS}];
  uniform float layerTranslucencies[${LAYER_SLOTS}];

  const int LAYER_SLOTS = ${LAYER_SLOTS};

  // A lower bound on the distance to the slot's layer, in metres: the
  // greater of its slab's distance and its cylinder's, at the wider of its
  // two radii, less its irregularity's amplitude. The rounded cone lies
  // wholly inside both, the displacement reaches the amplitude beyond it
  // at most, and the holes only raise the distance, so the bound never
  // exceeds the layer's own distance, inside it or out.
  float layerBoundDistance(vec2 q, int slot) {
    float halfHeight = 0.5 * layerHeightsMeters[slot];
    float center = layerBottomsMeters[slot] + halfHeight;
    return max(
      abs(q.y - center) - halfHeight,
      q.x - max(layerBottomRadiiMeters[slot], layerTopRadiiMeters[slot])
    ) - layerCrumbs[slot].w;
  }

  // The distance to the slot's layer without its holes, in metres,
  // negative inside it: its rounded cone, displaced by its irregularity.
  // The slot may be computed, not only a loop's index: GLSL ES 3.00 allows
  // any integer index into a uniform array that holds no samplers (its
  // issue 12.30), and leaves only an index outside 0 to LAYER_SLOTS - 1
  // undefined (its section 4.1.9), which no caller passes.
  float layerPlainDistance(vec3 p, vec2 q, int slot) {
    float halfHeight = 0.5 * layerHeightsMeters[slot];
    return roundedCappedConeDistance(
      q - vec2(0.0, layerBottomsMeters[slot] + halfHeight),
      layerBottomRadiiMeters[slot],
      halfHeight,
      layerRoundingsMeters[slot],
      layerTopRadiiMeters[slot]
    ) + irregularityAt(p, layerCrumbs[slot].w);
  }

  // The distance to the slot's layer, in metres, negative inside it: the
  // plain layer with its fractal holes cut from it, or left whole where
  // its holes are filled, as the shading colours them.
  float layerDistance(vec3 p, vec2 q, int slot) {
    if (layerHoleFills[slot] > 0.5) return layerPlainDistance(p, q, slot);
    vec4 crumb = layerCrumbs[slot];
    return holesDistance(p, crumb.y, layerPlainDistance(p, q, slot), crumb.x);
  }

  // How tall a slot must be to join the smoothed stack at the full blend,
  // in metres: half the thinnest layer any recipe holds, so every layer at
  // rest blends in full. A thinner slot, growing from nothing or vanishing,
  // blends in proportion, so its lift of the smoothed stack's top, up to a
  // quarter of its blend, fades as it does rather than vanishing in one
  // frame as its height crosses 0. The blend changes with time, not across
  // space, so the field keeps its bound.
  const float LAYER_BLEND_FADE_METERS = 0.002;
  // The least blend a slot joins with, in metres, since smoothMinDistance()
  // divides by its blend: a lift of at most 0.25 micrometres.
  const float MIN_LAYER_BLEND_METERS = 1e-6;

  // The field of the stack at p, and its q, carried on from the stack's field
  // so far: x is the distance in metres to the nearest layer, negative inside
  // it, y that layer's slot as its material id, and z the smoothed stack's
  // distance in metres, the layers joined by smoothMinDistance() with the
  // blend, in metres, faded for a slot thinner than LAYER_BLEND_FADE_METERS,
  // which the topping's coat follows. It walks the slots in order, folding
  // every slot it reaches into z in slot order, since the smooth minimum is
  // not associative: the seed slot, -1 for none, already in x and y, joins z
  // at its own place with its distance as given, and any other slot whose
  // bound is the blend or more beyond the nearest distance so far, of any
  // part, is left out: such a slot cannot lower the cake's least distance,
  // and lies too far from the nearest layer to change the smoothed one.
  // The hidden slot, beneath a translucent layer, is left out entirely.
  vec3 layersField(
    vec3 p,
    vec2 q,
    float blend,
    float nearest,
    int seedSlot,
    float seedDistance,
    int hiddenSlot,
    vec3 stack
  ) {
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      float height = layerHeightsMeters[slot];
      if (height <= 0.0 || slot == hiddenSlot) continue;
      float layer = seedDistance;
      if (slot != seedSlot) {
        if (layerBoundDistance(q, slot) >= nearest + blend) continue;
        layer = layerDistance(p, q, slot);
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
