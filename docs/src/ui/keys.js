/** #### Takes the window's arrow keys, so they walk the two sliders
 * - Listens on `window` in the capture phase and cancels each arrow press,
 *   so the keys work whatever has focus, a focused range input never also
 *   steps itself, and nothing else in the page sees them.
 * - A press with Alt, Ctrl or Cmd held is left alone, so the browser's own
 *   shortcuts, such as Alt-Left for back, keep working.
 * - Key repeat is allowed: each repeat calls its handler again.
 * @param handlers `onDown`, `onLeft`, `onRight` and `onUp`, each called
 *   with no arguments on a press of its key.
 */
export const connectArrowKeys = ({ onDown, onLeft, onRight, onUp }) => {
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
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
