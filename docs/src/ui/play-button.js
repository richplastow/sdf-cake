/** #### Connects the Play/Pause button, and gives the setter that shows it
 * - Finds the button index.html holds in the container, by its
 *   `data-action` attribute, and calls the handler on each click, which a
 *   tap and Enter also fire.
 * - The setter writes the action the button takes, `play` or `pause`, as
 *   its `data-action`, which the CSS reads to show its icon, and as its
 *   `aria-label`, "Play" or "Pause". It writes to the DOM only on a
 *   change, so it is safe to call every frame.
 * @param container The element holding the button, `.controls`.
 * @param handlers `onPress`, called with no arguments on a click.
 * @returns `showPlayButton`, which takes the action, `"play"`, `"pause"`
 *   or `null` to hide the button, and whether it is disabled.
 */
export const connectPlayButton = (container, { onPress }) => {
  const button = container.querySelector("button[data-action]");
  button.addEventListener("click", () => onPress());
  let shownAction = button.dataset.action;
  let shownDisabled = button.disabled;
  let shownHidden = button.hidden;
  return {
    showPlayButton: (action, isDisabled) => {
      const isHidden = action === null;
      if (isHidden !== shownHidden) {
        shownHidden = isHidden;
        button.hidden = isHidden;
      }
      if (isHidden) return;
      if (action !== shownAction) {
        shownAction = action;
        button.dataset.action = action;
        button.setAttribute(
          "aria-label",
          action === "play" ? "Play" : "Pause",
        );
      }
      if (isDisabled !== shownDisabled) {
        shownDisabled = isDisabled;
        button.disabled = isDisabled;
      }
    },
  };
};
