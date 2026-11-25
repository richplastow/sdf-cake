/**
 * @fileoverview
 * GLSL distance functions and operators, as a chunk the cake's field needs
 * pasted before it. Every function takes the sampled point first, as the
 * articles it follows do, then its other arguments A-Z, and returns a
 * distance in metres that never overestimates the true one.
 */

/** #### The GLSL chunk of distance primitives and operators
 * - Each formula follows one of Inigo Quilez's articles, on distance
 *   functions, https://iquilezles.org/articles/distfunctions/, or on 2D
 *   distance functions, https://iquilezles.org/articles/distfunctions2d/,
 *   and the comment beside it names the function there.
 * - A primitive's distance is exact. An operator's is a bound, which can
 *   underestimate the distance but never overestimate it, so a march that
 *   steps by it never crosses a surface.
 * - The segment and the cone divide by a squared length that can be 0, as
 *   for a lip of zero height or a rounded layer whose cone has no height;
 *   each divisor is held at `MIN_DIVISOR_METERS_SQUARED` or more, so the
 *   distance stays exact to the point or disc the shape becomes, never
 *   NaN.
 */
export const primitivesChunk = /* glsl */ `
  // The least a squared length may be as a divisor, in square metres: a
  // micrometre squared, which errs by at most a micrometre elsewhere.
  const float MIN_DIVISOR_METERS_SQUARED = 1e-12;
  // The distance a field returns for a part it skips, in metres: far past
  // the reach of any march, so the part never draws.
  const float NO_SURFACE_METERS = 1e3;

  // The distance to a cone on the Y axis with its tip cut off, centred on
  // the origin, of the given bottom and top radii and half height: iq's
  // sdCappedCone, exact, with its divisor guarded. It takes the point in
  // the plane of revolution, q, its distance from the Y axis and its
  // height, which the caller works out once for every part it samples.
  float cappedConeDistance(
    vec2 q,
    float bottomRadius,
    float halfHeight,
    float topRadius
  ) {
    vec2 k1 = vec2(topRadius, halfHeight);
    vec2 k2 = vec2(topRadius - bottomRadius, 2.0 * halfHeight);
    vec2 ca = vec2(
      q.x - min(q.x, q.y < 0.0 ? bottomRadius : topRadius),
      abs(q.y) - halfHeight
    );
    float along = dot(k1 - q, k2) /
      max(dot(k2, k2), MIN_DIVISOR_METERS_SQUARED);
    vec2 cb = q - k1 + k2 * clamp(along, 0.0, 1.0);
    float s = cb.x < 0.0 && ca.y < 0.0 ? -1.0 : 1.0;
    return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
  }

  // The distance to a cylinder on the Y axis, centred on the origin, of the
  // given radius and half height: iq's sdCappedCylinder.
  float cappedCylinderDistance(vec3 p, float halfHeight, float radius) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(radius, halfHeight);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  // The capped cone with its edges rounded off by the rounding, which keeps
  // its height, and its radii where its side is upright: iq's opRound on a
  // smaller capped cone, exact. It takes q, as cappedConeDistance() does.
  float roundedCappedConeDistance(
    vec2 q,
    float bottomRadius,
    float halfHeight,
    float rounding,
    float topRadius
  ) {
    return cappedConeDistance(
      q,
      bottomRadius - rounding,
      halfHeight - rounding,
      topRadius - rounding
    ) - rounding;
  }

  // The capped cylinder with its edges rounded off by the rounding, which
  // keeps its radius and height: iq's opRound on a smaller cylinder.
  float roundedCylinderDistance(
    vec3 p,
    float halfHeight,
    float radius,
    float rounding
  ) {
    return cappedCylinderDistance(
      p,
      halfHeight - rounding,
      radius - rounding
    ) - rounding;
  }

  // The distance to a segment between two points in 2D: iq's sdSegment,
  // exact, with its divisor guarded.
  float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(
      dot(pa, ba) / max(dot(ba, ba), MIN_DIVISOR_METERS_SQUARED),
      0.0,
      1.0
    );
    return length(pa - ba * h);
  }

  // The distance to what is left of a shape once a cut is taken from it:
  // iq's opSubtraction, a bound.
  float subtractDistance(float cut, float from) {
    return max(-cut, from);
  }

  // The distance to a solid wedge about +X in the xz plane, the half angle
  // each side of +X, extruded along the Y axis: iq's sdPie,
  // https://iquilezles.org/articles/distfunctions2d/, with no radius to
  // cut it, exact. Behind the apex it is the distance to the Y axis, so a
  // wedge however thin never stops a ray short of it, as a max of two
  // half-spaces would. The extrusion ignores height, so it takes the
  // point's x and z alone, as xz.
  float wedgeDistance(vec2 xz, float halfAngle) {
    // The point in sdPie's plane, folded onto one side of the wedge's axis.
    vec2 q = vec2(abs(xz.y), xz.x);
    vec2 c = vec2(sin(halfAngle), cos(halfAngle));
    float m = length(q - c * max(dot(q, c), 0.0));
    return m * sign(c.y * q.x - c.x * q.y);
  }
`;
