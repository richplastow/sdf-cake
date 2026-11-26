/**
 * @fileoverview
 * The cake's signed distance field, a plate under a stack of layers, its
 * topping and its decorations, with the eaten slice cut from all but the
 * plate, as a GLSL chunk, the
 * uniforms it reads, and the writer that copies a resolved cake into them.
 */

import { Color, SRGBColorSpace } from "three";
import { DECORATION_SLOTS, LAYER_SLOTS } from "../cake/slots.js";
import { crumbChunk } from "./crumb.js";
import { decorationsChunk } from "./decorations.js";
import { layersChunk } from "./layers.js";
import { plateChunk } from "./plate.js";
import { toppingChunk } from "./topping.js";

/** #### The GLSL chunk of the cake's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and Three.js's
 *   `common` chunk, for `PI` and `PI_HALF`, pasted before it. It pastes the
 *   crumb's, the plate's, the layers', the topping's and the decorations'
 *   chunks itself.
 * - Reads the uniforms createCakeUniforms() declares, so a change to any
 *   of them reshapes or recolours the cake with no new shader.
 * - cakeField() returns the distance in metres, negative inside the cake,
 *   and the id of the material at the nearest surface: a layer's slot, 0
 *   to 6, the plate's 7, the topping's 8 or a decoration's, 16 and up,
 *   which the other functions map to the surface's albedo, roughness and
 *   metalness. A layer's albedo and roughness are an inclusion's, ids 50
 *   to 52, where the point hit lies in one.
 * - cakeFieldOf() returns the same with the topping, a translucent
 *   layer or a translucent decoration hidden, as `HIDE_*` and a slot name
 *   them, so a ray refracted into a translucent part can march to the
 *   part beneath; the other decorations are always drawn, so one embedded
 *   in a translucent topping shows through it.
 */
export const cakeChunk = /* glsl */ `
  ${crumbChunk}
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

  ${decorationsChunk}

  const float DECORATION_METALNESS = 0.0; // no decoration is a metal
  // What cakeFieldOf() hides: nothing, or the topping alone. A slot, 0 to
  // LAYER_SLOTS - 1, hides that layer and the topping. HIDE_DECORATION_FIRST
  // plus a decoration's slot hides that decoration alone.
  const int HIDE_NONE = -1;
  const int HIDE_TOPPING = LAYER_SLOTS;
  const int HIDE_DECORATION_FIRST = LAYER_SLOTS + 1;
  // How far inside its plain layer a point must lie to show an inclusion,
  // in metres, as a distance: deeper than the layer's own surface, so only
  // a cut face shows them, never the outer surface.
  const float INCLUSION_INSET_METERS = -0.001;
  const float LAYER_METALNESS = 0.0; // no layer is a metal
  const float TOPPING_METALNESS = 0.0; // no topping is a metal

  // The material id of the inclusion at a point of the slot's layer, or
  // 0.0 for none: inclusionAt()'s, where the layer has inclusions and the
  // point lies deeper than INCLUSION_INSET_METERS inside its plain layer.
  float layerInclusionAt(vec3 point, int slot) {
    float cellMeters = layerCrumbs[slot].z;
    if (cellMeters <= 0.0) return 0.0;
    vec2 q = vec2(length(point.xz), point.y);
    if (layerPlainDistance(point, q, slot) >= INCLUSION_INSET_METERS) {
      return 0.0;
    }
    return inclusionAt(point, cellMeters, layerInclusionWeights[slot]);
  }

  // How far outside the holed layer, in metres, a point must lie to be in
  // a filled hole: clear of the smooth maximum's slight lift beside each
  // hole on the outer surface.
  const float HOLE_FILL_DEPTH_METERS = 0.0002;

  // Whether a point of the slot's layer lies in one of its holes, where
  // the layer's holes are filled: outside the holed layer, on its outer
  // surface or on a cut face alike.
  bool layerHoleFilledAt(vec3 point, int slot) {
    if (layerHoleFills[slot] <= 0.5) return false;
    vec4 crumb = layerCrumbs[slot];
    vec2 q = vec2(length(point.xz), point.y);
    float plain = layerPlainDistance(point, q, slot);
    float holed = holesDistance(point, crumb.y, plain, crumb.x);
    return holed > HOLE_FILL_DEPTH_METERS;
  }

  // The slot's colour at a point of its layer, browned towards
  // CRUST_COLOR by its crust within CRUST_DEPTH_METERS of its outer
  // surface, so a cut face shows the crust as a rim. A layer already
  // darker than CRUST_COLOR browns to DARK_CRUST_FACTOR of its own colour
  // instead. Either is desaturated towards its own grey by the slot's
  // crust saturation.
  vec3 layerCrustedColorAt(vec3 point, int slot) {
    float crust = layerCrusts[slot];
    if (crust <= 0.0) return layerColors[slot];
    vec2 q = vec2(length(point.xz), point.y);
    float depth = -layerPlainDistance(point, q, slot);
    float outer = 1.0 - smoothstep(0.0, CRUST_DEPTH_METERS, depth);
    vec3 color = layerColors[slot];
    vec3 crustColor = dot(color, LUMINANCE_WEIGHTS) <
        dot(CRUST_COLOR, LUMINANCE_WEIGHTS)
      ? DARK_CRUST_FACTOR * color
      : CRUST_COLOR;
    crustColor = mix(
      vec3(dot(crustColor, LUMINANCE_WEIGHTS)),
      crustColor,
      layerCrustSaturations[slot]
    );
    return mix(color, crustColor, crust * outer);
  }

  // The albedo of a material id at the point hit, which an inclusion's
  // and a sprinkle's colour need.
  vec3 cakeAlbedoOf(float materialId, vec3 point) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      int slot = int(materialId + 0.5);
      float inclusion = layerInclusionAt(point, slot);
      if (inclusion > 0.0) return inclusionAlbedoOf(inclusion);
      if (layerHoleFilledAt(point, slot)) return HOLE_FILL_COLOR;
      return layerCrustedColorAt(point, slot);
    }
    if (materialId < MATERIAL_TOPPING - 0.5) return plateColor;
    if (materialId < MATERIAL_TOPPING + 0.5) return toppingColor;
    return decorationAlbedoOf(materialId, point);
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
  // topping and the decorations are unioned with the stack before the cut,
  // so the cut passes through all three and the plate's gate reads them.
  // With the topping or a layer hidden, the topping is left out, and a
  // hidden slot is left out of the stack too, as a translucent part covers
  // what is left. A hidden decoration is left out alone.
  vec2 cakeFieldOf(vec3 p, int hidden) {
    vec2 q = vec2(length(p.xz), p.y);

    // The part whose bound is least: a layer's slot, or -1 for the plate.
    float plateBound = plateBoundDistance(q);
    float leastBound = plateBound;
    int firstSlot = -1;
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      if (layerHeightsMeters[slot] <= 0.0 || slot == hidden) continue;
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
      first = layerDistance(p, q, firstSlot);
      stack.xy = vec2(first, float(firstSlot));
    }
    stack = layersField(
      p,
      q,
      toppingSkirtBlend(),
      min(plate.x + toppingThicknessMeters, stack.x),
      firstSlot,
      first,
      hidden,
      stack
    );
    vec2 cake = stack.xy;
    if (hidden == HIDE_NONE || hidden >= HIDE_DECORATION_FIRST) {
      vec2 topping = toppingField(p, q, stack.z);
      if (topping.x < cake.x) cake = topping;
    }
    vec2 decorations = decorationsField(p, hidden - HIDE_DECORATION_FIRST);
    if (decorations.x < cake.x) cake = decorations;
    cake.x = eatenStackDistance(p, cake.x);
    if (firstSlot >= 0 && plateBound < cake.x) plate = plateField(q);
    return plate.x < cake.x ? plate : cake;
  }

  // The field at p with nothing hidden: cakeFieldOf()'s, as every march
  // but the one beneath a translucent part reads it.
  vec2 cakeField(vec3 p) {
    return cakeFieldOf(p, HIDE_NONE);
  }

  // A layer, the topping and a decoration are never metals; the plate may
  // be.
  float cakeMetalnessOf(float materialId) {
    if (materialId < MATERIAL_PLATE - 0.5) return LAYER_METALNESS;
    if (materialId < MATERIAL_TOPPING - 0.5) return plateMetalness;
    if (materialId < MATERIAL_TOPPING + 0.5) return TOPPING_METALNESS;
    return DECORATION_METALNESS;
  }

  // The roughness of a material id at the point hit, which an
  // inclusion's needs.
  float cakeRoughnessOf(float materialId, vec3 point) {
    if (materialId < MATERIAL_PLATE - 0.5) {
      int slot = int(materialId + 0.5);
      float inclusion = layerInclusionAt(point, slot);
      if (inclusion > 0.0) return inclusionRoughnessOf(inclusion);
      if (layerHoleFilledAt(point, slot)) return HOLE_FILL_ROUGHNESS;
      return layerRoughnesses[slot];
    }
    if (materialId < MATERIAL_TOPPING - 0.5) return plateRoughness;
    if (materialId < MATERIAL_TOPPING + 0.5) return toppingRoughness;
    return decorationRoughnessOf(materialId);
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
  decorationColors: {
    value: Array.from({ length: DECORATION_SLOTS }, () => new Color()),
  },
  decorationCount: { value: 0 },
  decorationEmbedsMeters: { value: new Float32Array(DECORATION_SLOTS) },
  decorationKinds: { value: new Float32Array(DECORATION_SLOTS) },
  // Four numbers a slot: x, the offset in height and z, in metres, and its
  // flame, 0 out to 1 lit.
  decorationOffsets: { value: new Float32Array(4 * DECORATION_SLOTS) },
  decorationRoughnesses: { value: new Float32Array(DECORATION_SLOTS) },
  // Nine numbers a slot, its mat3 in column-major order, which r187's
  // WebGLUniforms passes to uniformMatrix3fv unchanged.
  decorationRotations: { value: new Float32Array(9 * DECORATION_SLOTS) },
  decorationScales: { value: new Float32Array(DECORATION_SLOTS) },
  eatenAngleRadians: { value: 0 },
  // The flames' flicker clock, in seconds, which src/main.js advances.
  flameSeconds: { value: 0 },
  layerBottomRadiiMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerBottomsMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerColors: {
    value: Array.from({ length: LAYER_SLOTS }, () => new Color()),
  },
  // Four numbers a slot: its hole strength, its hole cell, its inclusion
  // cell and its irregularity, the last three in metres.
  layerCrumbs: { value: new Float32Array(4 * LAYER_SLOTS) },
  layerHeightsMeters: { value: new Float32Array(LAYER_SLOTS) },
  // Three numbers a slot: its shares of chips, nuts and raisins.
  layerInclusionWeights: { value: new Float32Array(3 * LAYER_SLOTS) },
  layerRoughnesses: { value: new Float32Array(LAYER_SLOTS) },
  layerRoundingsMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerTopRadiiMeters: { value: new Float32Array(LAYER_SLOTS) },
  layerTranslucencies: { value: new Float32Array(LAYER_SLOTS) },
  layerHoleFills: { value: new Float32Array(LAYER_SLOTS) },
  layerCrusts: { value: new Float32Array(LAYER_SLOTS) },
  layerCrustSaturations: { value: new Float32Array(LAYER_SLOTS) },
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
  scatterCellMeters: { value: 0 },
  scatterColor: { value: new Color() },
  scatterKind: { value: 0 },
  scatterOffsetMeters: { value: 0 },
  scatterScale: { value: 0 },
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
  toppingInvisible: { value: 0 },
});

/** #### Copies a cake's values into the cake's uniforms, in place
 * - Writes into the arrays and Color objects the uniforms already hold, so
 *   it must be given the material's own `uniforms`: UniformsUtils.merge()
 *   cloned each Color when the material was made, and the object
 *   createCakeUniforms() returned is no longer read.
 * - Each colour is set by Color.setRGB() from its sRGB channels, which
 *   Three.js converts into its linear working colour space in place.
 * - Writes every decoration slot, an empty one at scale 0, and raises the
 *   march's copy of the stack's top, `stackBoundTopMeters`, by the
 *   greatest current drop offset above rest, so the bound never clips a
 *   falling item; the camera's fit reads `values.bounds`, without it.
 * - Clamps, since an underdamped spring can pass through 0: every length
 *   at 0 and below, so a layer's bottom never sinks into the plate, the
 *   coverage within 0 and 1, each layer's hole strength and translucency
 *   within 0 and 1, and each layer's rounding at the least of its radii
 *   and half its height.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param uniforms The material's uniforms, as createCakeUniforms() made
 *   them and UniformsUtils.merge() copied them.
 * @param values The cake's values, as src/motion/cake-motion.js keeps
 *   them: the resolved cake's shape, with each colour as sRGB channels
 *   `r`, `g` and `b`, from 0 to 1, and its decorations.
 */
export const writeCakeUniforms = (uniforms, values) => {
  const { bounds, decorations, layers, plate, topping } = values;

  uniforms.eatenAngleRadians.value = values.eatenAngleRadians;

  const crumbs = uniforms.layerCrumbs.value;
  const weights = uniforms.layerInclusionWeights.value;
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
    crumbs[4 * slot] = Math.min(Math.max(layer.holeStrength, 0), 1);
    crumbs[4 * slot + 1] = Math.max(layer.holeCellMeters, 0);
    crumbs[4 * slot + 2] = Math.max(layer.inclusionCellMeters, 0);
    crumbs[4 * slot + 3] = Math.max(layer.irregularityMeters, 0);
    uniforms.layerHeightsMeters.value[slot] = heightMeters;
    uniforms.layerHoleFills.value[slot] = layer.holeFill;
    uniforms.layerCrusts.value[slot] = Math.min(Math.max(layer.crust, 0), 1);
    uniforms.layerCrustSaturations.value[slot] = Math.min(
      Math.max(layer.crustSaturation, 0),
      1,
    );
    for (let index = 0; index < 3; index++) {
      weights[3 * slot + index] = layer.inclusionWeights[index];
    }
    uniforms.layerRoughnesses.value[slot] = layer.roughness;
    uniforms.layerRoundingsMeters.value[slot] = Math.min(
      Math.max(layer.roundingMeters, 0),
      greatestRoundingMeters,
    );
    uniforms.layerTopRadiiMeters.value[slot] = topRadiusMeters;
    uniforms.layerTranslucencies.value[slot] = Math.min(
      Math.max(layer.translucency, 0),
      1,
    );
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
  uniforms.toppingInvisible.value = topping.invisible;

  uniforms.plateBoundBottomMeters.value = bounds.plate.bottomMeters;
  uniforms.plateBoundRadiusMeters.value = bounds.plate.radiusMeters;
  uniforms.plateBoundTopMeters.value = bounds.plate.topMeters;
  uniforms.stackBoundBottomMeters.value = bounds.stack.bottomMeters;
  uniforms.stackBoundRadiusMeters.value = bounds.stack.radiusMeters;
  uniforms.stackBoundTopMeters.value =
    bounds.stack.radiusMeters > 0
      ? bounds.stack.topMeters + decorations.liftMeters
      : 0;

  writeDecorationUniforms(uniforms, decorations);
};

/** #### Copies the decorations' values into their uniforms, in place
 * - Each slot's offset holds its x, its animated height offset, its z and
 *   its flame, 0 out to 1 lit; its scale, the hash's times the
 *   animation's, is clamped at 0.
 * - Allocates nothing.
 */
const writeDecorationUniforms = (uniforms, decorations) => {
  const { items, scatter } = decorations;
  const offsets = uniforms.decorationOffsets.value;
  const rotations = uniforms.decorationRotations.value;
  for (let slot = 0; slot < DECORATION_SLOTS; slot++) {
    const item = items[slot];
    setColor(uniforms.decorationColors.value[slot], item.color);
    uniforms.decorationEmbedsMeters.value[slot] = item.embedMeters;
    uniforms.decorationKinds.value[slot] = item.kindId;
    offsets[4 * slot] = item.xMeters;
    offsets[4 * slot + 1] = item.offsetMeters;
    offsets[4 * slot + 2] = item.zMeters;
    offsets[4 * slot + 3] = item.flame;
    uniforms.decorationRoughnesses.value[slot] = item.roughness;
    for (let index = 0; index < 9; index++) {
      rotations[9 * slot + index] = item.rotation[index];
    }
    uniforms.decorationScales.value[slot] = Math.max(item.scale, 0);
  }
  uniforms.decorationCount.value = decorations.count;

  uniforms.scatterCellMeters.value = scatter.cellMeters;
  setColor(uniforms.scatterColor.value, scatter.color);
  uniforms.scatterKind.value = scatter.kindId;
  uniforms.scatterOffsetMeters.value = scatter.offsetMeters;
  uniforms.scatterScale.value = Math.max(scatter.scale, 0);
};

/** Sets a Color from sRGB channels, from 0 to 1, without allocating. */
const setColor = (color, { r, g, b }) => {
  color.setRGB(r, g, b, SRGBColorSpace);
};
