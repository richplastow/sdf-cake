/** #### Hides and shows the controls on Escape, so the cake can show alone
 * - Toggles a `data-hidden` attribute on the `.controls` element, which
 *   the CSS fades out and back in, and which the pointer passes through
 *   while hidden. The hidden controls stay within keyboard reach, and the
 *   arrow keys still walk both sliders.
 * - Ignores a held key's repeats, so holding Escape toggles once.
 * - Throws at once if the page has no `.controls`.
 * - Ported from pureland-simulator's `docs/src/ui/controls-toggle.js`,
 *   without its moving of focus or its `onEscape` hook.
 */
export const connectControlsToggle = () => {
  const controls = document.querySelector(".controls");
  if (controls === null) {
    throw new Error("No controls: .controls");
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.repeat) return;
    controls.toggleAttribute("data-hidden");
  });
};
