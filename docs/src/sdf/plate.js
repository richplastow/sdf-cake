/** #### The GLSL chunk of the plate's field
 * - Needs the primitives chunk, src/sdf/primitives.js, pasted before it.
 * - The plate is a profile of three 2D segments, from the axis to the base
 *   radius along y = −thickness ÷ 2, up the sweep to the rim radius, then
 *   straight up the lip, stroked by half the thickness and revolved about
 *   the Y axis: iq's sdSegment, opRevolution and opRound, exact. Its top
 *   surface's centre is the origin, its edges are rounded by half its
 *   thickness, and it has no rounding of its own.
 * - A plate whose rim radius is 0 is skipped, as for a cake with none.
 * - Both functions take the point in the plane of revolution, q, its
 *   distance from the Y axis and its height, in metres.
 * - plateBoundDistance() is a cheap lower bound on the plate's distance,
 *   so the cake's field can skip the plate where it cannot be the nearest
 *   part.
 * - plateField() returns the distance in metres, negative inside the plate,
 *   and its material id, `MATERIAL_PLATE`.
 */
export const plateChunk = /* glsl */ `
  uniform float plateBaseRadiusMeters;
  uniform vec3 plateColor;
  uniform float plateLipHeightMeters;
  uniform float plateMetalness;
  uniform float plateRimRadiusMeters;
  uniform float plateRoughness;
  uniform float plateSweepHeightMeters;
  uniform float plateThicknessMeters;

  // The plate's material id: the first after the layers' slots, 0 to 6.
  const float MATERIAL_PLATE = 7.0;

  // A lower bound on the distance to the plate, in metres: the greatest of
  // the distances beyond its stroked profile's extent, out past the rim,
  // below the underside at -thickness and above the lip's top at sweep +
  // lip. The plate lies wholly inside all three, so the bound never
  // exceeds its own distance, inside it or out.
  float plateBoundDistance(vec2 q) {
    if (plateRimRadiusMeters <= 0.0) return NO_SURFACE_METERS;
    return max(
      max(
        q.x - (plateRimRadiusMeters + 0.5 * plateThicknessMeters),
        -plateThicknessMeters - q.y
      ),
      q.y - (plateSweepHeightMeters + plateLipHeightMeters)
    );
  }

  // The field of the plate at q: x is the distance in metres, negative
  // inside it, and y its material id.
  vec2 plateField(vec2 q) {
    if (plateRimRadiusMeters <= 0.0) {
      return vec2(NO_SURFACE_METERS, MATERIAL_PLATE);
    }
    float halfThickness = 0.5 * plateThicknessMeters;
    // The profile's four corners, as distance from the axis and height.
    vec2 center = vec2(0.0, -halfThickness);
    vec2 base = vec2(plateBaseRadiusMeters, -halfThickness);
    vec2 rim = vec2(
      plateRimRadiusMeters,
      plateSweepHeightMeters - halfThickness
    );
    vec2 lip = vec2(plateRimRadiusMeters, rim.y + plateLipHeightMeters);
    float profile = min(
      min(segmentDistance(q, center, base), segmentDistance(q, base, rim)),
      segmentDistance(q, rim, lip)
    );
    return vec2(profile - halfThickness, MATERIAL_PLATE);
  }
`;
