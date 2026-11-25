/**
 * @fileoverview
 * The cake's signed distance field, a plate under a stack of layers with
 * the eaten slice cut from the stack, as a GLSL chunk, the uniforms it
 * reads, and the writer that copies a resolved cake into them.
 */

import { Color } from "three";
import { LAYER_SLOTS } from "../cake/slots.js";
import { layersChunk } from "./layers.js";
import { plateChunk } from "./plate.js";

/** #### The GLSL chunk of the cake's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and Three.js's
 *   `common` chunk, for `PI` and `PI_HALF`, pasted before it. It pastes the
 *   plate's and the layers' chunks itself.
 * - Reads the uniforms createCakeUniforms() declares, so a change to any
 *   of them reshapes or recolours the cake with no new shader.
 * - cakeField() returns the distance in metres, negative inside the cake,
 *   and the id of the material at the nearest surface: a layer's slot, 0
 *   to 6, or the plate's 7, which the other functions map to the
 *   surface's albedo, roughness and metalness.
 */
export const cakeChunk = /* glsl */ `
  ${plateChunk}
  ${layersChunk}

  uniform float eatenAngleRadians;
  // The two cylinders on the Y axis that bound the cake, the plate's and
  // the stack's, from bottom to top, in metres. A cylinder of zero radius
  // holds nothing, as the plate's does for a cake with none.
  uniform float plateBoundBottomMeters;
  uniform float plateBoundRadiusMeters;
  uniform float plateBoundTopMeters;
  uniform float stackBoundBottomMeters;
  uniform float stackBoundRadiusMeters;
  uniform float stackBoundTopMeters;

  const float LAYER_METALNESS = 0.0; // no layer is a metal

  vec3 cakeAlbedoOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      return layerColors[int(materialId + 0.5)];
    }
    return plateColor;
  }

  // The stack's distance with the eaten slice cut from it. Up to half a
  // turn the cut is a wedge about +X. Past it, the stack is intersected,
  // by iq's opIntersection, a bound, with the complementary wedge about
  // -X, which wedgeDistance() gives with p.x negated; both forms agree at
  // half a turn. An angle of 0 cuts nothing and is skipped, as its wedge
  // would be the half-plane z = 0 on the +X side, which bends the normals
  // along it.
  float eatenStackDistance(vec3 p, float stack) {
    if (eatenAngleRadians <= 0.0) return stack;
    float halfAngle = 0.5 * eatenAngleRadians;
    if (halfAngle <= PI_HALF) {
      return subtractDistance(wedgeDistance(p.xz, halfAngle), stack);
    }
    return max(wedgeDistance(vec2(-p.x, p.z), PI - halfAngle), stack);
  }

  // The field at p: x is the distance to the cake in metres, negative
  // inside it, and y the id of the material at its nearest surface. The
  // slice is cut from the stack alone, never from the plate.
  //
  // Every part is a solid of revolution about the Y axis, so the parts take
  // p in their plane of revolution, q: iq's opRevolution, with o = 0,
  // https://iquilezles.org/articles/distfunctions/.
  //
  // The part whose bound is least is evaluated first, then the layers in
  // slot order, each skipped where its bound is no nearer than the nearest
  // distance so far, then the plate, unless it went first, skipped where
  // its bound is no nearer than the cut stack's distance. A part whose
  // bound is no nearer cannot be nearer, so the field's value is that of
  // every part evaluated, and needs no step factor. The plate's gate reads
  // the stack's distance after the cut, never before it: the cut only
  // raises the stack's distance, so a point in the cut, inside an uncut
  // layer, would skip the plate beneath it.
  vec2 cakeField(vec3 p) {
    vec2 q = vec2(length(p.xz), p.y);

    // The part whose bound is least: a layer's slot, or -1 for the plate.
    float plateBound = plateBoundDistance(q);
    float leastBound = plateBound;
    int firstSlot = -1;
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      if (layerHeightsMeters[slot] <= 0.0) continue;
      float bound = layerBoundDistance(q, slot);
      if (bound < leastBound) {
        leastBound = bound;
        firstSlot = slot;
      }
    }

    vec2 plate = vec2(NO_SURFACE_METERS, MATERIAL_PLATE);
    vec2 stack = vec2(NO_SURFACE_METERS, 0.0);
    if (firstSlot < 0) {
      plate = plateField(q);
    } else {
      stack = vec2(layerDistance(q, firstSlot), float(firstSlot));
    }
    stack = layersField(q, min(plate.x, stack.x), firstSlot, stack);
    stack.x = eatenStackDistance(p, stack.x);
    if (firstSlot >= 0 && plateBound < stack.x) plate = plateField(q);
    return plate.x < stack.x ? plate : stack;
  }

  float cakeMetalnessOf(float materialId) {
    return materialId < MATERIAL_PLATE - 0.5 ? LAYER_METALNESS : plateMetalness;
  }

  float cakeRoughnessOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      return layerRoughnesses[int(materialId + 0.5)];
    }
    return plateRoughness;
  }
`;

/** #### Creates the cake's uniforms, empty until a cake is written in
 * - Each is a parameter the field reads: lengths in metres, angles in
 *   radians, and colours as Color, which Three.js uploads in linear space.
 * - The layers' numbers are Float32Arrays and their colours an array of
 *   Color, `LAYER_SLOTS` entries each, made once and written in place.
 * - Every value starts at zero, which draws nothing, as both bounding
 *   cylinders' radii are 0: writeCakeUniforms() fills them.
 * @returns The uniforms, keyed by the names the chunks declare.
 */
export const createCakeUniforms = () => ({
  eatenAngleRadians: { value: 0 },
  layerBottomRadiiMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerBottomsMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerColors: {
    value: Array.from({ length: LAYER_SLOTS }, () => new Color()),
  },
  layerHeightsMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerRoughnesses: { value: new Float32Array(LAYER_SLOTS) },
  layerRoundingsMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerTopRadiiMeters: { value: new Float32Array(LAYER_SLOTS) },
  plateBaseRadiusMeters: { value: 0 },
  plateBoundBottomMeters: { value: 0 },
  plateBoundRadiusMeters: { value: 0 },
  plateBoundTopMeters: { value: 0 },
  plateColor: { value: new Color() },
  plateLipHeightMeters: { value: 0 },
  plateMetalness: { value: 0 },
  plateRimRadiusMeters: { value: 0 },
  plateRoughness: { value: 0 },
  plateSweepHeightMeters: { value: 0 },
  plateThicknessMeters: { value: 0 },
  stackBoundBottomMeters: { value: 0 },
  stackBoundRadiusMeters: { value: 0 },
  stackBoundTopMeters: { value: 0 },
});

/** #### Copies a resolved cake into the cake's uniforms, in place
 * - Writes into the arrays and Color objects the uniforms already hold, so
 *   it must be given the material's own `uniforms`: UniformsUtils.merge()
 *   cloned each Color when the material was made, and the object
 *   createCakeUniforms() returned is no longer read.
 * - Each colour is set by Color.set() from its sRGB `#rrggbb` string, which
 *   Three.js converts into its linear working colour space.
 * - Allocates nothing but what Color.set() spends parsing each string.
 * @param uniforms The material's uniforms, as createCakeUniforms() made
 *   them and UniformsUtils.merge() copied them.
 * @param values The resolved cake, as resolveRecipe() returns it.
 */
export const writeCakeUniforms = (uniforms, values) => {
  const { bounds, layers, plate } = values;

  uniforms.eatenAngleRadians.value = values.eatenAngleRadians;

  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    const layer = layers[slot];
    uniforms.layerBottomRadiiMeters.value[slot] = layer.bottomRadiusMeters;
    uniforms.layerBottomsMeters.value[slot] = layer.bottomMeters;
    uniforms.layerColors.value[slot].set(layer.color);
    uniforms.layerHeightsMeters.value[slot] = layer.heightMeters;
    uniforms.layerRoughnesses.value[slot] = layer.roughness;
    uniforms.layerRoundingsMeters.value[slot] = layer.roundingMeters;
    uniforms.layerTopRadiiMeters.value[slot] = layer.topRadiusMeters;
  }

  uniforms.plateBaseRadiusMeters.value = plate.baseRadiusMeters;
  uniforms.plateColor.value.set(plate.color);
  uniforms.plateLipHeightMeters.value = plate.lipHeightMeters;
  uniforms.plateMetalness.value = plate.metalness;
  uniforms.plateRimRadiusMeters.value = plate.rimRadiusMeters;
  uniforms.plateRoughness.value = plate.roughness;
  uniforms.plateSweepHeightMeters.value = plate.sweepHeightMeters;
  uniforms.plateThicknessMeters.value = plate.thicknessMeters;

  uniforms.plateBoundBottomMeters.value = bounds.plate.bottomMeters;
  uniforms.plateBoundRadiusMeters.value = bounds.plate.radiusMeters;
  uniforms.plateBoundTopMeters.value = bounds.plate.topMeters;
  uniforms.stackBoundBottomMeters.value = bounds.stack.bottomMeters;
  uniforms.stackBoundRadiusMeters.value = bounds.stack.radiusMeters;
  uniforms.stackBoundTopMeters.value = bounds.stack.topMeters;
};
