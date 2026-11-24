/**
 * @fileoverview
 * GLSL distance functions and operators, as a chunk the cake's field needs
 * pasted before it. Every function takes the sampled point first, as the
 * articles it follows do, then its other arguments A-Z, and returns a
 * distance in metres that never overestimates the true one.
 */

/** #### The GLSL chunk of distance primitives and operators
 * - Each formula follows Inigo Quilez's article on distance functions,
 *   https://iquilezles.org/articles/distfunctions/, and the comment beside
 *   it names the function there.
 * - A primitive's distance is exact. An operator's is a bound, which can
 *   underestimate the distance but never overestimate it, so a march that
 *   steps by it never crosses a surface.
 */
export const primitivesChunk = /* glsl */ `
  // The distance to a cylinder on the Y axis, centred on the origin, of the
  // given radius and half height: iq's sdCappedCylinder.
  float cappedCylinderDistance(vec3 p, float halfHeight, float radius) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(radius, halfHeight);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  // The distance to a half-space: the side of a plane through the origin
  // that its unit normal points away from. iq's sdPlane, with h = 0.
  float halfSpaceDistance(vec3 p, vec3 normal) {
    return dot(p, normal);
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

  // The distance to what is left of a shape once a cut is taken from it:
  // iq's opSubtraction, a bound.
  float subtractDistance(float cut, float from) {
    return max(-cut, from);
  }

  // The distance to a solid wedge about +X, between two half-spaces through
  // the Y axis, the half angle each side of +X: iq's opIntersection of the
  // two, a bound.
  float wedgeDistance(vec3 p, float halfAngle) {
    vec2 sideways = vec2(-sin(halfAngle), cos(halfAngle));
    return max(
      halfSpaceDistance(p, vec3(sideways.x, 0.0, sideways.y)),
      halfSpaceDistance(p, vec3(sideways.x, 0.0, -sideways.y))
    );
  }
`;
