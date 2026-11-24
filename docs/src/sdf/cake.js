/**
 * @fileoverview
 * The cake's signed distance field, a round sponge under a shell of icing
 * with a slice cut out, as a GLSL chunk and the uniforms it reads.
 */

import { Color, MathUtils } from "three";

const CAKE_HEIGHT_METERS = 0.07;
const CAKE_RADIUS_METERS = 0.09; // an 18 cm cake
const ICING_COLOR = 0xf2a1bb; // strawberry pink, sRGB
const ICING_ROUNDING_METERS = 0.006; // the icing's softened edges
const ICING_THICKNESS_METERS = 0.005;
const SLICE_ANGLE_RADIANS = MathUtils.degToRad(48); // the slice cut out
const SPONGE_COLOR = 0xe9c46a; // golden sponge, sRGB

/** #### The GLSL chunk of the cake's field
 * - Needs the primitives chunk, src/sdf/primitives.js, pasted before it.
 * - Reads the uniforms createCakeUniforms() declares, so a change to any
 *   of them reshapes or recolours the cake with no new shader.
 * - cakeField() returns the distance in metres, negative inside the cake,
 *   and the id of the material at the nearest surface, which the other
 *   functions map to the surface's albedo, roughness and metalness.
 */
export const cakeChunk = /* glsl */ `
  uniform float cakeHeightMeters;
  uniform float cakeRadiusMeters;
  uniform vec3 icingColor;
  uniform float icingRoundingMeters;
  uniform float icingThicknessMeters;
  uniform float sliceAngleRadians;
  uniform vec3 spongeColor;

  // The materials the field names, by id, and how they take the light.
  const float ICING_ID = 1.0;
  const float ICING_ROUGHNESS = 0.35; // glossy, as set icing is
  const float SPONGE_ID = 0.0;
  const float SPONGE_ROUGHNESS = 0.9; // matt, as crumb is
  const float CAKE_METALNESS = 0.0; // neither is a metal

  vec3 cakeAlbedoOf(float materialId) {
    return materialId < 0.5 ? spongeColor : icingColor;
  }

  // The radius of the sphere about the origin that holds the whole cake.
  float cakeBoundRadius() {
    return length(vec2(
      cakeRadiusMeters + icingThicknessMeters,
      0.5 * cakeHeightMeters + icingThicknessMeters
    ));
  }

  // The field at p: x is the distance to the cake in metres, negative
  // inside it, and y the id of the material at its nearest surface.
  vec2 cakeField(vec3 p) {
    float halfHeight = 0.5 * cakeHeightMeters;
    // The sponge is the whole cake's shape, a cylinder on the Y axis
    // centred on the origin.
    float sponge = cappedCylinderDistance(p, halfHeight, cakeRadiusMeters);
    // The icing coats its top and side: a rounded shell one thickness out,
    // raised by half a thickness so its base stays level with the sponge's.
    float icingOuter = roundedCylinderDistance(
      p - vec3(0.0, 0.5 * icingThicknessMeters, 0.0),
      halfHeight + 0.5 * icingThicknessMeters,
      cakeRadiusMeters + icingThicknessMeters,
      icingRoundingMeters
    );
    float icing = subtractDistance(sponge, icingOuter);
    // A slice is cut from both: a wedge about +X.
    float slice = wedgeDistance(p, 0.5 * sliceAngleRadians);
    sponge = subtractDistance(slice, sponge);
    icing = subtractDistance(slice, icing);
    return sponge < icing ? vec2(sponge, SPONGE_ID) : vec2(icing, ICING_ID);
  }

  float cakeMetalnessOf(float materialId) {
    return CAKE_METALNESS;
  }

  float cakeRoughnessOf(float materialId) {
    return materialId < 0.5 ? SPONGE_ROUGHNESS : ICING_ROUGHNESS;
  }
`;

/** #### Creates the cake's uniforms, at their starting values
 * - Each is a parameter the field reads: lengths in metres, angles in
 *   radians, and colours as Color, which Three.js uploads in linear space.
 * @returns The uniforms, keyed by the names the chunk declares.
 */
export const createCakeUniforms = () => ({
  cakeHeightMeters: { value: CAKE_HEIGHT_METERS },
  cakeRadiusMeters: { value: CAKE_RADIUS_METERS },
  icingColor: { value: new Color(ICING_COLOR) },
  icingRoundingMeters: { value: ICING_ROUNDING_METERS },
  icingThicknessMeters: { value: ICING_THICKNESS_METERS },
  sliceAngleRadians: { value: SLICE_ANGLE_RADIANS },
  spongeColor: { value: new Color(SPONGE_COLOR) },
});
