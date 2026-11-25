/** #### Takes the window's arrow keys and Space, for the sliders and turntable
 * - Listens on `window` in the capture phase and cancels each press it
 *   handles, so the keys work whatever has focus, a focused range input
 *   never also steps itself, a focused button is never also pressed, and
 *   nothing else in the page sees them.
 * - A press with Alt, Ctrl or Cmd held is left alone, so the browser's own
 *   shortcuts, such as Alt-Left for back, keep working.
 * - Key repeat is allowed for the arrows: each repeat calls its handler
 *   again. A held Space is cancelled but calls nothing after its first
 *   press, so holding it never flickers the turntable on and off.
 * @param handlers `onDown`, `onLeft`, `onRight`, `onSpace` and `onUp`,
 *   each called with no arguments on a press of its key.
 */
export const connectKeys = ({ onDown, onLeft, onRight, onSpace, onUp }) => {
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case " ":
          if (!event.repeat) onSpace();
          break;
        case "ArrowDown":
          onDown();
          break;
        case "ArrowLeft":
          onLeft();
          break;
        case "ArrowRight":
          onRight();
          break;
        case "ArrowUp":
          onUp();
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
};
