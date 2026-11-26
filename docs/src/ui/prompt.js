/** #### Connects the guess prompt, and gives the setter that shows one
 * - Finds the `.prompt` element index.html holds, and its parts by their
 *   `data-prompt` attribute, which names the kinds each part shows for,
 *   space-separated, and calls the handler on a click of the one Reveal
 *   button, which the `guess` and `blocked-reveal` prompts share.
 * - The setter writes to the DOM only when the prompt or the cake's name
 *   changes, so it is safe to call every frame. The three name prompts
 *   share one heading, the cake's name, each with its own note.
 * - Throws at once if the page has no `.prompt`.
 * @param handlers `onReveal`, called with no arguments on Reveal.
 * @returns `showPrompt`, which takes `"up"`, `"bite"`, `"guess"`,
 *   `"blocked-up"`, `"blocked-reveal"`, `"name"`, `"name-next"`,
 *   `"name-deeper"` or `null` for none, and the cake's name for the name
 *   prompts.
 */
export const connectPrompt = ({ onReveal }) => {
  const prompt = document.querySelector(".prompt");
  if (prompt === null) {
    throw new Error("No prompt: .prompt");
  }
  const parts = [...prompt.querySelectorAll("[data-prompt]")];
  const cakeName = prompt.querySelector("[data-cake-name]");
  prompt.querySelector("button").addEventListener("click", () => onReveal());
  let shownKind = null;
  let shownName = "";
  return {
    showPrompt: (kind, name) => {
      if (kind !== null && kind.startsWith("name") && name !== shownName) {
        shownName = name;
        cakeName.textContent = name;
      }
      if (kind === shownKind) return;
      shownKind = kind;
      for (const part of parts) {
        part.hidden = !part.dataset.prompt.split(" ").includes(kind);
      }
    },
  };
};
