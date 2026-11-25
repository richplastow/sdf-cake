/** #### Connects the two arrow buttons that walk the cakes
 * - Finds the buttons index.html holds in the container, by their
 *   `data-walk` attribute, `previous` or `next`, and calls the handler on
 *   each click, which a tap, Enter and Space also fire.
 * @param container The element holding the buttons, `.controls`.
 * @param handlers `onNext` and `onPrevious`, each called with no
 *   arguments on a click of its button.
 */
export const connectCakeArrows = (container, { onNext, onPrevious }) => {
  container
    .querySelector('button[data-walk="next"]')
    .addEventListener("click", () => onNext());
  container
    .querySelector('button[data-walk="previous"]')
    .addEventListener("click", () => onPrevious());
};
