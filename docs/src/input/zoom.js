/**
 * @fileoverview
 * Reports zooms from the scroll wheel, a trackpad's scroll and a
 * trackpad's pinch, in every browser, Safari's own pinch events included.
 */

import { VIEW_ZOOM_LOG_PER_PIXEL } from "./view.js";

// A wheel event's `deltaMode` in lines or pages is turned into CSS pixels
// by these, as r187's OrbitControls does in `_customWheelEvent()`.
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 100;

// Chrome, Edge and Firefox send a trackpad's pinch as a wheel event with
// `ctrlKey` set, though Control is not held, and with a far smaller delta
// than a scroll, which this scales up, as r187's OrbitControls does.
const PINCH_WHEEL_SCALE = 10;

/** #### Reports an element's zooms, from the wheel and a trackpad's pinch
 * - A wheel event's `deltaY` zooms: down, or two fingers up on a Mac with
 *   natural scrolling, moves the camera away, as r187's OrbitControls does.
 *   Its `deltaX` is ignored. The page's own scroll or zoom is cancelled.
 * - A wheel event with `ctrlKey` set while Control is not held down is a
 *   trackpad's pinch, scaled by `PINCH_WHEEL_SCALE`; whether Control is
 *   held is tracked from the window's key events, as OrbitControls does.
 * - Safari on a Mac sends a trackpad's pinch as its own `gesturestart`,
 *   `gesturechange` and `gestureend` events, whose `scale` is the fingers'
 *   spread since the gesture started; their default, zooming the page, is
 *   cancelled. A pinch-like wheel event during such a gesture is dropped,
 *   so a Safari that sends both zooms once. These events are not listened
 *   for on a touch screen, where iOS Safari sends them beside the pointer
 *   events src/input/drag.js already pinches with.
 * - Allocates nothing per event.
 * @param element The element whose zooms to report.
 * @param onZoom Called on each zoom with its change, as the natural log of
 *   the camera distance's scale: above 0 moves the camera further away.
 */
export const connectZoom = (element, onZoom) => {
  // Whether Control is held down, and whether a Safari gesture is under
  // way, with its `scale` at the last event.
  let isControlDown = false;
  let isGesturing = false;
  let lastGestureScale = 1;

  window.addEventListener("keydown", (event) => {
    if (event.key === "Control") isControlDown = true;
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Control") isControlDown = false;
  });
  // A key let go of while the window has no focus sends no `keyup`.
  window.addEventListener("blur", () => {
    isControlDown = false;
  });

  element.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const isPinch = event.ctrlKey && !isControlDown;
      if (isPinch && isGesturing) return;

      let deltaPixels = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        deltaPixels *= LINE_HEIGHT_PX;
      } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        deltaPixels *= PAGE_HEIGHT_PX;
      }
      if (isPinch) deltaPixels *= PINCH_WHEEL_SCALE;
      if (deltaPixels !== 0) onZoom(deltaPixels * VIEW_ZOOM_LOG_PER_PIXEL);
    },
    { passive: false },
  );

  const hasTrackpadGestures =
    "GestureEvent" in window && navigator.maxTouchPoints === 0;
  if (!hasTrackpadGestures) return;

  element.addEventListener("gesturestart", (event) => {
    event.preventDefault();
    isGesturing = true;
    lastGestureScale = 1;
  });
  // Spreading the fingers raises the scale, which brings the camera nearer.
  element.addEventListener("gesturechange", (event) => {
    event.preventDefault();
    if (!(event.scale > 0)) return;

    onZoom(Math.log(lastGestureScale / event.scale));
    lastGestureScale = event.scale;
  });
  element.addEventListener("gestureend", (event) => {
    event.preventDefault();
    isGesturing = false;
  });
};
