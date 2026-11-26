/** #### Connects the caption, and gives the setter that shows a beat
 * - Finds the `.caption` element index.html holds, with its title, by its
 *   `data-caption-title` attribute, and its text, by `data-caption-text`.
 * - The setter writes to the DOM only when the script or the beat
 *   changes, so it is safe to call every frame.
 * - Throws at once if the page has no `.caption`.
 * @returns `showCaption`, which takes a script, as src/tour/scripts.js
 *   holds them, or `null` to hide the caption, and the index of the beat
 *   to show.
 */
export const connectCaption = () => {
  const caption = document.querySelector(".caption");
  if (caption === null) {
    throw new Error("No caption: .caption");
  }
  const title = caption.querySelector("[data-caption-title]");
  const text = caption.querySelector("[data-caption-text]");
  let shownScript = null;
  let shownIndex = -1;
  return {
    showCaption: (script, beatIndex) => {
      if (script === shownScript && beatIndex === shownIndex) return;
      if (script !== shownScript) {
        caption.hidden = script === null;
        title.textContent = script === null ? "" : script.title;
      }
      shownScript = script;
      shownIndex = beatIndex;
      text.textContent = script === null ? "" : script.beats[beatIndex].text;
    },
  };
};
