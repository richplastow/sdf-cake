/**
 * @fileoverview
 * The cake's signed distance field, a plate under a stack of layers and
 * its topping, with the eaten slice cut from both, as a GLSL chunk, the
 * uniforms it reads, and the writer that copies a resolved cake into them.
 */

import { Color, SRGBColorSpace } from "three";
import { LAYER_SLOTS } from "../cake/slots.js";
import { layersChunk } from "./layers.js";
import { plateChunk } from "./plate.js";
import { toppingChunk } from "./topping.js";

/** #### The GLSL chunk of the cake's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and Three.js's
 *   `common` chunk, for `PI` and `PI_HALF`, pasted before it. It pastes the
 *   plate's, the layers' and the topping's chunks itself.
 * - Reads the uniforms createCakeUniforms() declares, so a change to any
 *   of them reshapes or recolours the cake with no new shader.
 * - cakeField() returns the distance in metres, negative inside the cake,
 *   and the id of the material at the nearest surface: a layer's slot, 0
 *   to 6, the plate's 7 or the topping's 8, which the other functions map
 *   to the surface's albedo, roughness and metalness.
 * - cakeFieldOf() returns the same with or without the topping, so a ray
 *   refracted into a translucent topping can march to the part beneath.
 */
export const cakeChunk = /* glsl */ `
  ${plateChunk}
  ${layersChunk}
  ${toppingChunk}

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
  const float TOPPING_METALNESS = 0.0; // no topping is a metal

  vec3 cakeAlbedoOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      return layerColors[int(materialId + 0.5)];
    }
    if (materialId > MATERIAL_TOPPING - 0.5) return toppingColor;
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
  // slice is cut from the stack and the topping together, never from the
  // plate.
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
  //
  // The topping's coat is the smoothed stack's distance less the
  // thickness, so the walk counts the plate's distance as the thickness
  // farther than it is, and skips a layer only where its bound lies the
  // skirt's blend beyond that or beyond the nearest layer: a skipped layer
  // then either lies too far to change the smoothed stack, or lies so far
  // beyond the plate, less the quarter blend the smoothing can take off,
  // that the plate stays the nearer part whatever the coat does. Then the
  // topping is unioned with the stack before the cut, so the cut passes
  // through both and the plate's gate reads both. Without the topping, the
  // cut stack and the plate alone, as a translucent topping covers them.
  vec2 cakeFieldOf(vec3 p, bool withTopping) {
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

    // The stack: x and y the nearest layer's distance and slot, z the
    // smoothed stack's distance. The first slot seeds only x and y:
    // layersField() folds its distance into z at its own place in the
    // slot order.
    vec2 plate = vec2(NO_SURFACE_METERS, MATERIAL_PLATE);
    vec3 stack = vec3(NO_SURFACE_METERS, 0.0, NO_SURFACE_METERS);
    float first = NO_SURFACE_METERS;
    if (firstSlot < 0) {
      plate = plateField(q);
    } else {
      first = layerDistance(q, firstSlot);
      stack.xy = vec2(first, float(firstSlot));
    }
    stack = layersField(
      q,
      toppingSkirtBlend(),
      min(plate.x + toppingThicknessMeters, stack.x),
      firstSlot,
      first,
      stack
    );
    vec2 cake = stack.xy;
    if (withTopping) {
      vec2 topping = toppingField(p, q, stack.z, stack.x);
      if (topping.x < cake.x) cake = topping;
    }
    cake.x = eatenStackDistance(p, cake.x);
    if (firstSlot >= 0 && plateBound < cake.x) plate = plateField(q);
    return plate.x < cake.x ? plate : cake;
  }

  // The field at p with the topping: cakeFieldOf()'s, as every march but
  // the one beneath a translucent topping reads it.
  vec2 cakeField(vec3 p) {
    return cakeFieldOf(p, true);
  }

  // A layer and the topping are never metals; the plate may be.
  float cakeMetalnessOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) return LAYER_METALNESS;
    if (materialId > MATERIAL_TOPPING - 0.5) return TOPPING_METALNESS;
    return plateMetalness;
  }

  float cakeRoughnessOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      return layerRoughnesses[int(materialId + 0.5)];
    }
    if (materialId > MATERIAL_TOPPING - 0.5) return toppingRoughness;
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
  toppingBaseMeters: { value: 0 },
  toppingColor: { value: new Color() },
  toppingCoverage: { value: 0 },
  toppingDripMeters: { value: 0 },
  toppingDripWaves: { value: 0 },
  toppingPileMeters: { value: 0 },
  toppingRadiusMeters: { value: 0 },
  toppingRoughness: { value: 0 },
  toppingRoundingMeters: { value: 0 },
  toppingThicknessMeters: { value: 0 },
  toppingTranslucency: { value: 0 },
});

/** #### Copies a cake's values into the cake's uniforms, in place
 * - Writes into the arrays and Color objects the uniforms already hold, so
 *   it must be given the material's own `uniforms`: UniformsUtils.merge()
 *   cloned each Color when the material was made, and the object
 *   createCakeUniforms() returned is no longer read.
 * - Each colour is set by Color.setRGB() from its sRGB channels, which
 *   Three.js converts into its linear working colour space in place.
 * - Clamps, since an underdamped spring can pass through 0: every length
 *   at 0 and below, so a layer's bottom never sinks into the plate, the
 *   coverage within 0 and 1, and each layer's rounding at the least of its
 *   radii and half its height.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param uniforms The material's uniforms, as createCakeUniforms() made
 *   them and UniformsUtils.merge() copied them.
 * @param values The cake's values, as src/motion/cake-motion.js keeps
 *   them: the resolved cake's shape, with each colour as sRGB channels
 *   `r`, `g` and `b`, from 0 to 1.
 */
export const writeCakeUniforms = (uniforms, values) => {
  const { bounds, layers, plate, topping } = values;

  uniforms.eatenAngleRadians.value = values.eatenAngleRadians;

  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    const layer = layers[slot];
    const bottomRadiusMeters = Math.max(layer.bottomRadiusMeters, 0);
    const heightMeters = Math.max(layer.heightMeters, 0);
    const topRadiusMeters = Math.max(layer.topRadiusMeters, 0);
    const greatestRoundingMeters = Math.min(
      bottomRadiusMeters,
      topRadiusMeters,
      0.5 * heightMeters,
    );
    uniforms.layerBottomRadiiMeters.value[slot] = bottomRadiusMeters;
    uniforms.layerBottomsMeters.value[slot] = Math.max(layer.bottomMeters, 0);
    setColor(uniforms.layerColors.value[slot], layer.color);
    uniforms.layerHeightsMeters.value[slot] = heightMeters;
    uniforms.layerRoughnesses.value[slot] = layer.roughness;
    uniforms.layerRoundingsMeters.value[slot] = Math.min(
      Math.max(layer.roundingMeters, 0),
      greatestRoundingMeters,
    );
    uniforms.layerTopRadiiMeters.value[slot] = topRadiusMeters;
  }

  uniforms.plateBaseRadiusMeters.value = Math.max(plate.baseRadiusMeters, 0);
  setColor(uniforms.plateColor.value, plate.color);
  uniforms.plateLipHeightMeters.value = Math.max(plate.lipHeightMeters, 0);
  uniforms.plateMetalness.value = plate.metalness;
  uniforms.plateRimRadiusMeters.value = Math.max(plate.rimRadiusMeters, 0);
  uniforms.plateRoughness.value = plate.roughness;
  uniforms.plateSweepHeightMeters.value = Math.max(
    plate.sweepHeightMeters,
    0,
  );
  uniforms.plateThicknessMeters.value = Math.max(plate.thicknessMeters, 0);

  uniforms.toppingBaseMeters.value = Math.max(topping.baseMeters, 0);
  setColor(uniforms.toppingColor.value, topping.color);
  uniforms.toppingCoverage.value = Math.min(Math.max(topping.coverage, 0), 1);
  uniforms.toppingDripMeters.value = Math.max(topping.dripMeters, 0);
  uniforms.toppingDripWaves.value = topping.dripWaves;
  uniforms.toppingPileMeters.value = Math.max(topping.pileMeters, 0);
  uniforms.toppingRadiusMeters.value = Math.max(topping.radiusMeters, 0);
  uniforms.toppingRoughness.value = topping.roughness;
  uniforms.toppingRoundingMeters.value = Math.max(topping.roundingMeters, 0);
  uniforms.toppingThicknessMeters.value = Math.max(
    topping.thicknessMeters,
    0,
  );
  uniforms.toppingTranslucency.value = topping.translucency;

  uniforms.plateBoundBottomMeters.value = bounds.plate.bottomMeters;
  uniforms.plateBoundRadiusMeters.value = bounds.plate.radiusMeters;
  uniforms.plateBoundTopMeters.value = bounds.plate.topMeters;
  uniforms.stackBoundBottomMeters.value = bounds.stack.bottomMeters;
  uniforms.stackBoundRadiusMeters.value = bounds.stack.radiusMeters;
  uniforms.stackBoundTopMeters.value = bounds.stack.topMeters;
};

/** Sets a Color from sRGB channels, from 0 to 1, without allocating. */
const setColor = (color, { r, g, b }) => {
  color.setRGB(r, g, b, SRGBColorSpace);
};
