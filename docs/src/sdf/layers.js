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
 *   and the nearest layer's material id, its slot, 0 to `LAYER_SLOTS` − 1.
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

  // The field of the stack at q, carried on from the stack's field so far:
  // x is the distance in metres to the nearest layer, negative inside it,
  // and y that layer's slot as its material id. It walks the slots in
  // order, leaving out the skipped slot, already in the stack, and any
  // slot whose bound is no nearer than the nearest distance so far, of
  // any part, which then cannot lower the cake's least distance.
  vec2 layersField(vec2 q, float nearest, int skippedSlot, vec2 stack) {
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      if (slot == skippedSlot || layerHeightsMeters[slot] <= 0.0) continue;
      if (layerBoundDistance(q, slot) >= nearest) continue;
      float layer = layerDistance(q, slot);
      if (layer < stack.x) stack = vec2(layer, float(slot));
      nearest = min(nearest, layer);
    }
    return stack;
  }
`;
