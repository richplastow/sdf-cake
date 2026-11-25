/** #### Connects the eaten and reveal sliders, and gives their setters
 * - Finds the two range inputs index.html holds in the container, by their
 *   `data-slider` attribute, `eaten` or `reveal`, and calls the handler
 *   with the new value on each `input` event, which a key, a click on the
 *   track and every step of a drag fire.
 * - The setters change an input's `max` and value together, firing no
 *   `input` event; the eaten slider is disabled while its `max` is 0.
 * @param container The element holding the inputs, `.controls`.
 * @param handlers `onEaten` and `onReveal`, each called with the input's
 *   new value, a whole number.
 * @returns `setEaten` and `setReveal`, each taking a value and a `max`.
 */
export const connectSliders = (container, { onEaten, onReveal }) => {
  const eaten = container.querySelector('input[data-slider="eaten"]');
  const reveal = container.querySelector('input[data-slider="reveal"]');
  eaten.addEventListener("input", () => onEaten(eaten.valueAsNumber));
  reveal.addEventListener("input", () => onReveal(reveal.valueAsNumber));
  return {
    setEaten: (value, max) => {
      eaten.max = String(max);
      eaten.value = String(value);
      eaten.disabled = max === 0;
    },
    setReveal: (value, max) => {
      reveal.max = String(max);
      reveal.value = String(value);
    },
  };
};
