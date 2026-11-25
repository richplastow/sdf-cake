import { LAYER_SLOTS } from "../cake/slots.js";

/** #### The GLSL chunk of the layer stack's field
 * - Needs the primitives chunk, src/sdf/primitives.js, pasted before it.
 * - Each of the `LAYER_SLOTS` slots is a capped cone on the Y axis, of its
 *   bottom and top radii, standing on its bottom, with its edges rounded:
 *   iq's sdCappedCone with opRound, exact. A slot of zero height is
 *   skipped.
 * - The arrays hold one entry per slot, lengths in metres.
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

  // The field of the stack at p: x is the distance in metres to the nearest
  // layer, negative inside it, and y that layer's slot as its material id.
  vec2 layersField(vec3 p) {
    vec2 field = vec2(NO_SURFACE_METERS, 0.0);
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      float height = layerHeightsMeters[slot];
      if (height <= 0.0) continue;
      float halfHeight = 0.5 * height;
      float layer = roundedCappedConeDistance(
        p - vec3(0.0, layerBottomsMeters[slot] + halfHeight, 0.0),
        layerBottomRadiiMeters[slot],
        halfHeight,
        layerRoundingsMeters[slot],
        layerTopRadiiMeters[slot]
      );
      if (layer < field.x) field = vec2(layer, float(slot));
    }
    return field;
  }
`;
