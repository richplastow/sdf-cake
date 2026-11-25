/** #### Takes the window's arrow keys, so they walk the cakes
 * - Listens on `window` in the capture phase and cancels each arrow press,
 *   so the keys work whatever has focus and nothing else in the page sees
 *   them. Up and Down are claimed and do nothing yet.
 * - A press with Alt, Ctrl or Cmd held is left alone, so the browser's own
 *   shortcuts, such as Alt-Left for back, keep working.
 * - Key repeat is allowed: each repeat calls its handler again.
 * @param handlers `onLeft` and `onRight`, each called with no arguments on
 *   a press of its key.
 */
export const connectArrowKeys = ({ onLeft, onRight }) => {
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          break;
        case "ArrowLeft":
          onLeft();
          break;
        case "ArrowRight":
          onRight();
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
