import { LAYER_SLOTS } from "../cake/slots.js";

/** #### The GLSL chunk of the layer stack's field
 * - Needs the primitives chunk, src/sdf/primitives.js, pasted before it.
 * - Each of the `LAYER_SLOTS` slots is a capped cone on the Y axis, of its
 *   bottom and top radii, standing on its bottom, with its edges rounded:
 *   iq's sdCappedCone with opRound, exact. A slot of zero height is
 *   skipped.
 * - The arrays hold one entry per slot, lengths in metres.
 * - Every function takes the point in the plane of revolution, q, its
 *   distance from the Y axis and its height, in metres.
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
  uniform float layerHeightsMeters[${LAYER_SLOTS}];
  uniform float layerRoughnesses[${LAYER_SLOTS}];
  uniform float layerRoundingsMeters[${LAYER_SLOTS}];
  uniform float layerTopRadiiMeters[${LAYER_SLOTS}];

  const int LAYER_SLOTS = ${LAYER_SLOTS};

  // A lower bound on the distance to the slot's layer, in metres: the
  // greater of its slab's distance and its cylinder's, at the wider of its
  // two radii. The rounded cone lies wholly inside both, so the bound
  // never exceeds the layer's own distance, inside it or out.
  float layerBoundDistance(vec2 q, int slot) {
    float halfHeight = 0.5 * layerHeightsMeters[slot];
    float center = layerBottomsMeters[slot] + halfHeight;
    return max(
      abs(q.y - center) - halfHeight,
      q.x - max(layerBottomRadiiMeters[slot], layerTopRadiiMeters[slot])
    );
  }

  // The distance to the slot's layer, in metres, negative inside it. The
  // slot may be computed, not only a loop's index: GLSL ES 3.00 allows any
  // integer index into a uniform array that holds no samplers (its issue
  // 12.30), and leaves only an index outside 0 to LAYER_SLOTS - 1 undefined
  // (its section 4.1.9), which no caller passes.
  float layerDistance(vec2 q, int slot) {
    float halfHeight = 0.5 * layerHeightsMeters[slot];
    return roundedCappedConeDistance(
      q - vec2(0.0, layerBottomsMeters[slot] + halfHeight),
      layerBottomRadiiMeters[slot],
      halfHeight,
      layerRoundingsMeters[slot],
      layerTopRadiiMeters[slot]
    );
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

  // The field of the stack at q, carried on from the stack's field so far:
  // x is the distance in metres to the nearest layer, negative inside it,
  // y that layer's slot as its material id, and z the smoothed stack's
  // distance in metres, the layers joined by smoothMinDistance() with the
  // blend, in metres, faded for a slot thinner than
  // LAYER_BLEND_FADE_METERS, which the topping's coat follows. It walks
  // the slots in order, folding every slot it reaches into z in slot
  // order, since the smooth minimum is not associative: the seed slot, -1
  // for none, already in x and y, joins z at its own place with its
  // distance as given, and any other slot whose bound is the blend or more
  // beyond the nearest distance so far, of any part, is left out: such a
  // slot cannot lower the cake's least distance, and lies too far from the
  // nearest layer to change the smoothed one.
  vec3 layersField(
    vec2 q,
    float blend,
    float nearest,
    int seedSlot,
    float seedDistance,
    vec3 stack
  ) {
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      float height = layerHeightsMeters[slot];
      if (height <= 0.0) continue;
      float layer = seedDistance;
      if (slot != seedSlot) {
        if (layerBoundDistance(q, slot) >= nearest + blend) continue;
        layer = layerDistance(q, slot);
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
