/**
 * @fileoverview
 * The view of the cake: its turntable turn and tilt, how far a drag or a
 * scroll turns or zooms it, and the ease back to the view the page loads
 * with. Pure maths, ported from pureland-simulator's src/input/spin.js,
 * with the zoom added.
 */

const FULL_TURN_RADIANS = 2 * Math.PI;

// The ease back to the view at load, fast enough not to keep the viewer
// waiting, in seconds.
export const VIEW_RESET_SECONDS = 0.3;

// A drag of 393 CSS pixels, about a phone's width, turns half a turn.
export const VIEW_TURN_RADIANS_PER_PIXEL = 0.008;

// The zoom per CSS pixel of a scroll or a Cmd-drag, as the natural log of
// the camera distance's scale: a 100 px scroll, one mouse-wheel notch in
// Chrome, moves the camera 5% nearer or further. Taken from r187's
// OrbitControls, whose `_getZoomScale()` scales the distance by 0.95 per
// 100 px:
// https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/jsm/controls/OrbitControls.js
export const VIEW_ZOOM_LOG_PER_PIXEL = Math.log(1 / 0.95) / 100;

/** #### Starts easing a view back to the view at load
 * - Records where the reset starts: the pitch and zoom as they are, and
 *   the yaw's nearest equivalent within ±π, since a drag never wraps it,
 *   so the way back is never more than half a turn. The view itself is
 *   not changed: the first stepViewReset() moves it from the equivalent.
 * - Restarts a reset under way from where the view is.
 * - Does nothing when the view already shows the view at load: pitch and
 *   zoom 0, and a yaw of whole turns.
 * - Pure maths: writes `reset` in place and allocates nothing.
 * @param reset The reset's state, mutated: `fromPitchRadians`,
 *   `fromYawRadians` and `fromZoomLog`, and `progress`, set to 0.
 * @param view The view, as `pitchRadians`, `yawRadians` and `zoomLog`.
 */
export const startViewReset = (reset, view) => {
  const fromYawRadians =
    view.yawRadians -
    FULL_TURN_RADIANS * Math.round(view.yawRadians / FULL_TURN_RADIANS);
  const isAtLoad =
    view.pitchRadians === 0 && fromYawRadians === 0 && view.zoomLog === 0;
  if (isAtLoad) return;

  reset.fromPitchRadians = view.pitchRadians;
  reset.fromYawRadians = fromYawRadians;
  reset.fromZoomLog = view.zoomLog;
  reset.progress = 0;
};

/** #### Advances a view's reset one frame, easing the view towards 0
 * - `progress` moves linearly in time, from 0 to 1 over
 *   `VIEW_RESET_SECONDS`; the pitch, yaw and zoom ease from where the
 *   reset started to 0 by smoothstep(), and are exactly 0 at 1.
 * - Returns true on the step that reaches 1, so the view ends on exactly
 *   0, and false once there is nothing left to change. Set `progress` to 1
 *   to cancel a reset where it is.
 * - A negative delta counts as zero.
 * - Pure maths: allocates nothing, so it is safe on the per-frame path.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 * @param reset The reset's state, mutated: `fromPitchRadians`,
 *   `fromYawRadians` and `fromZoomLog`, and `progress`, from 0 to 1,
 *   linear in time.
 * @param view The view to write, mutated: `pitchRadians`, `yawRadians`
 *   and `zoomLog`.
 * @returns True if the view changed.
 */
export const stepViewReset = (deltaSeconds, reset, view) => {
  if (reset.progress >= 1) return false;

  const startProgress = reset.progress;
  reset.progress = Math.min(
    reset.progress + Math.max(deltaSeconds, 0) / VIEW_RESET_SECONDS,
    1,
  );

  // Mixed as `from × (1 − p)`, which gives exactly 0 at p = 1.
  const remaining = 1 - smoothstep(reset.progress);
  view.pitchRadians = reset.fromPitchRadians * remaining;
  view.yawRadians = reset.fromYawRadians * remaining;
  view.zoomLog = reset.fromZoomLog * remaining;

  return reset.progress !== startProgress;
};

/** #### Turns a view by a drag, clamping its pitch to the tilt limits
 * - A drag right adds to the yaw, and a drag down adds to the pitch, so
 *   the cake's near surface follows the pointer.
 * - Clamps the stored pitch, not only the picture, so a drag back from
 *   beyond a limit tilts at once.
 * - Leaves the yaw unlimited and unwrapped: every angle is a valid turn.
 * - Pure maths: writes `view` in place and allocates nothing.
 * @param deltaXPixels The drag's change to the right, in CSS pixels.
 * @param deltaYPixels The drag's change downwards, in CSS pixels.
 * @param maxPitchRadians The highest pitch, in radians.
 * @param minPitchRadians The lowest pitch, in radians.
 * @param view The view to turn, as `pitchRadians` and `yawRadians`.
 */
export const turnView = (
  deltaXPixels,
  deltaYPixels,
  maxPitchRadians,
  minPitchRadians,
  view,
) => {
  view.pitchRadians = Math.min(
    maxPitchRadians,
    Math.max(
      minPitchRadians,
      view.pitchRadians + deltaYPixels * VIEW_TURN_RADIANS_PER_PIXEL,
    ),
  );
  view.yawRadians += deltaXPixels * VIEW_TURN_RADIANS_PER_PIXEL;
};

/** #### Zooms a view, clamping it to the zoom limits
 * - The zoom is the natural log of the camera distance's scale, 0 at the
 *   view at load, so equal steps feel equal at any distance. A positive
 *   change moves the camera further away.
 * - Clamps the stored zoom, so a zoom back from beyond a limit moves at
 *   once.
 * - Pure maths: writes `view` in place and allocates nothing.
 * @param deltaZoomLog The change, as a natural log of a distance scale.
 * @param maxZoomLog The furthest zoom, as a natural log.
 * @param minZoomLog The nearest zoom, as a natural log.
 * @param view The view to zoom, as `zoomLog`.
 */
export const zoomView = (deltaZoomLog, maxZoomLog, minZoomLog, view) => {
  view.zoomLog = Math.min(
    maxZoomLog,
    Math.max(minZoomLog, view.zoomLog + deltaZoomLog),
  );
};

/** #### Eases a linear progress, slow at both ends and fastest midway
 * - The curve of r187's MathUtils.smoothstep(), `p² × (3 − 2p)`, written
 *   here so that this module needs no Three.js, as pureland-simulator's
 *   src/fold/easing.js does.
 * @param progress The linear progress, clamped to 0 to 1.
 * @returns The eased progress, from 0 to 1.
 */
const smoothstep = (progress) => {
  const p = Math.min(Math.max(progress, 0), 1);
  return p * p * (3 - 2 * p);
};
