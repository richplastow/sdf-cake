/**
 * @fileoverview
 * Reports an element's drags and two-finger pinches, with the slop that
 * tells a press from a drag for each kind of pointer. Ported from
 * pureland-simulator's src/input/drag.js, without its claimed presses and
 * with the pinch and the modified drag added.
 */

// How far, in CSS pixels, a mouse press may stray from where it went down
// and still count as a press rather than a drag: a mouse button or a
// trackpad pressed down often nudges the pointer a pixel or two. Tuned by
// eye in pureland-simulator.
export const DRAG_THRESHOLD_PX = 4;

// The same for a touch or a pen, in CSS pixels: a finger wobbles more than
// a mouse, so a tap allows more. About 1.7 mm on an iPhone 12 Pro's screen;
// a first guess in pureland-simulator, to tune on a real phone.
export const TOUCH_DRAG_THRESHOLD_PX = 10;

// Whether the device is Apple's, where the drag's modifier is Cmd, since
// Ctrl and a press there is a right-click; elsewhere it is Ctrl. Chromium
// names the platform in `userAgentData`, and the others only in the
// deprecated `navigator.platform`, which an iPad gives as "MacIntel".
const IS_APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/.test(
  navigator.userAgentData?.platform ?? navigator.platform,
);

/** #### Reports an element's drags and two-finger pinches
 * - A hold starts on a press of the primary pointer's primary button, and
 *   captures that pointer, so a drag carries on over other elements and
 *   outside the window. Mouse, touch and pen share this one path. The
 *   pointer capture is the hold's only state: the browser releases it on
 *   `pointerup` and `pointercancel`, which ends the hold. A `data-dragging`
 *   attribute on the element mirrors it, for the CSS's grabbing cursor,
 *   set on the press and removed when the capture is lost.
 * - A hold moves only once the pointer strays more than its kind's slop
 *   from where it went down: `DRAG_THRESHOLD_PX` for a mouse, and
 *   `TOUCH_DRAG_THRESHOLD_PX` for a touch or a pen. Its first move then
 *   reports the whole way from there, so the drag loses nothing, and a
 *   double-click that nudges the pointer moves nothing.
 * - Each move says whether the modifier is held: Cmd on an Apple device,
 *   Ctrl on any other. It is read afresh on every move, so pressing or
 *   letting go of the key mid-drag switches at once.
 * - A second finger, pressed while a touch holds, starts a pinch: from
 *   then until either finger lifts, a move of either reports how much the
 *   gap between them has grown, and the first finger drags nothing. When
 *   the second finger lifts, the first drags on from where it is, with no
 *   jump; when the first lifts, the hold ends. Further fingers are ignored.
 * - Cancels the element's `mousedown` default, so a press or a
 *   double-click on it leaves focus where it was. In Firefox, that also
 *   stops the element's active state
 *   (https://bugzilla.mozilla.org/show_bug.cgi?id=771241), so the cursor
 *   follows `data-dragging` rather than that state.
 * - Allocates nothing per move.
 * @param element The element whose drags and pinches to report.
 * @param handlers The callbacks: `onDrag`, called on each move of a drag
 *   with the change since the last event, right and down, in CSS pixels,
 *   and true if the modifier is held; `onHold`, called when a press starts
 *   a hold; `onPinch`, called on each move of a pinch with the ratio of
 *   the fingers' gap to their gap at the last event, above 1 as they
 *   spread; and `onRelease`, called when the hold ends, however it ends.
 */
export const connectDrag = (element, handlers) => {
  const { onDrag, onHold, onPinch, onRelease } = handlers;

  // Whether the hold under way has moved since it went down; the primary
  // pointer's position at the last event of the drag, in CSS pixels; and
  // the hold's slop, in CSS pixels.
  let hasMoved = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let slopPx = DRAG_THRESHOLD_PX;

  // The pinch: the second finger's pointer id, or null while there is no
  // pinch; where each finger is, in CSS pixels, the first's kept current
  // whatever the drag's slop; and the gap between them at the last event.
  let pinchPointerId = null;
  let pinchGapPx = 0;
  let primaryClientX = 0;
  let primaryClientY = 0;
  let secondClientX = 0;
  let secondClientY = 0;

  /** Reports the pinch's change of gap, unless a finger sits on another. */
  const reportPinch = () => {
    const gapPx = Math.hypot(
      secondClientX - primaryClientX,
      secondClientY - primaryClientY,
    );
    if (gapPx === 0) return;
    if (pinchGapPx > 0) onPinch(gapPx / pinchGapPx);
    pinchGapPx = gapPx;
  };

  element.addEventListener("mousedown", (event) => event.preventDefault());

  element.addEventListener("pointerdown", (event) => {
    if (event.isPrimary) {
      if (event.button !== 0) return;

      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "";
      hasMoved = false;
      lastClientX = primaryClientX = event.clientX;
      lastClientY = primaryClientY = event.clientY;
      slopPx =
        event.pointerType === "mouse"
          ? DRAG_THRESHOLD_PX
          : TOUCH_DRAG_THRESHOLD_PX;
      onHold();
      return;
    }

    // A second finger pinches only while a first one holds.
    const isHeld = element.dataset.dragging !== undefined;
    if (event.pointerType !== "touch" || !isHeld || pinchPointerId !== null) {
      return;
    }
    // Captured explicitly, as a touch already is implicitly, so its loss
    // reliably ends the pinch.
    element.setPointerCapture(event.pointerId);
    pinchPointerId = event.pointerId;
    secondClientX = event.clientX;
    secondClientY = event.clientY;
    pinchGapPx = Math.hypot(
      secondClientX - primaryClientX,
      secondClientY - primaryClientY,
    );
  });

  // The second finger's loss ends the pinch, and the first drags on from
  // where it is now. The first's loss ends the hold, and with it any pinch.
  element.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === pinchPointerId) {
      pinchPointerId = null;
      lastClientX = primaryClientX;
      lastClientY = primaryClientY;
      return;
    }
    if (!event.isPrimary) return;

    delete element.dataset.dragging;
    if (pinchPointerId !== null) {
      element.releasePointerCapture(pinchPointerId);
      pinchPointerId = null;
    }
    hasMoved = false;
    onRelease();
  });

  // A move event that leaves the pointer where it was, as a pen's change of
  // pressure can, moves nothing, and nor does one within the slop of the
  // press.
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId === pinchPointerId) {
      secondClientX = event.clientX;
      secondClientY = event.clientY;
      reportPinch();
      return;
    }
    if (!event.isPrimary || !element.hasPointerCapture(event.pointerId)) {
      return;
    }
    primaryClientX = event.clientX;
    primaryClientY = event.clientY;
    if (pinchPointerId !== null) {
      reportPinch();
      return;
    }

    const deltaXPixels = event.clientX - lastClientX;
    const deltaYPixels = event.clientY - lastClientY;
    if (deltaXPixels === 0 && deltaYPixels === 0) return;
    // Until it moves, the last position is still the press's.
    const isWithinSlop =
      !hasMoved && Math.hypot(deltaXPixels, deltaYPixels) <= slopPx;
    if (isWithinSlop) return;

    hasMoved = true;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    onDrag(
      deltaXPixels,
      deltaYPixels,
      IS_APPLE_PLATFORM ? event.metaKey : event.ctrlKey,
    );
  });
};
