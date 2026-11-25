/**
 * @fileoverview
 * Fits the camera to the cake: the sphere round its two bounding cylinders,
 * and the distance at which that sphere fills the view. Pure maths, with no
 * DOM or GPU access.
 */

/** #### Returns the camera distance at which a sphere fills the view
 * - Ported from pureland-simulator's src/camera/fit.js.
 * - The sphere fills the view's smaller dimension, width or height.
 * - The sphere is centred on the camera's line of sight, so anything inside
 *   it stays in view however it moves within the sphere, towards the camera
 *   included.
 * @param aspect The view's width divided by its height.
 * @param fovDegrees The camera's vertical field of view, in degrees, as
 *   Three.js takes it.
 * @param radius The sphere's radius, in metres.
 * @returns The distance from the camera to the sphere's centre, in metres.
 */
export const distanceToFitSphere = (aspect, fovDegrees, radius) => {
  const verticalHalfRadians = (fovDegrees * Math.PI) / 360;
  const horizontalHalfRadians = Math.atan(
    Math.tan(verticalHalfRadians) * aspect,
  );

  // The view's edge is tangent to the sphere at that half-angle.
  return (
    radius / Math.sin(Math.min(verticalHalfRadians, horizontalHalfRadians))
  );
};

/** #### Works out the sphere round a cake's bounding cylinders, in place
 * - Centred on the Y axis half way between the lower bottom and the higher
 *   top, of radius the hypotenuse of the larger radius and half that
 *   height, as Plan 03's Decision 3 sets out.
 * - A cylinder of zero radius, a part the cake lacks, is left out.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param bounds The cake's `plate` and `stack` cylinders, each its
 *   `bottomMeters`, `radiusMeters` and `topMeters`.
 * @param sphere The sphere to write, mutated: `centerMeters`, its height,
 *   and `radiusMeters`.
 * @returns The sphere.
 */
export const fitSphereOfBounds = (bounds, sphere) => {
  const { plate, stack } = bounds;
  const hasPlate = plate.radiusMeters > 0;
  const hasStack = stack.radiusMeters > 0;
  if (!hasPlate && !hasStack) {
    sphere.centerMeters = 0;
    sphere.radiusMeters = 0;
    return sphere;
  }
  const bottomMeters = Math.min(
    hasPlate ? plate.bottomMeters : Infinity,
    hasStack ? stack.bottomMeters : Infinity,
  );
  const radiusMeters = Math.max(plate.radiusMeters, stack.radiusMeters);
  const topMeters = Math.max(
    hasPlate ? plate.topMeters : -Infinity,
    hasStack ? stack.topMeters : -Infinity,
  );
  const halfHeightMeters = 0.5 * (topMeters - bottomMeters);
  sphere.centerMeters = 0.5 * (bottomMeters + topMeters);
  sphere.radiusMeters = Math.hypot(radiusMeters, halfHeightMeters);
  return sphere;
};
