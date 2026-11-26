/** #### Connects the tour's dialogs, and gives the setter that shows one
 * - Finds the `<dialog>` elements index.html holds, by their `data-page`
 *   attribute, and calls the handler with that attribute's value on a
 *   click of a dialog's button, which Enter and a tap also fire.
 * - Each dialog is non-modal, opened with `show()`, so Escape does not
 *   close it; it closes only when another page is shown.
 * @param handlers `onButton`, called with the dialog's `data-page` value.
 * @returns `showDialog`, which takes a `data-page` value, or `null` for
 *   none, opens that dialog, focusing its button, and closes the rest.
 */
export const connectDialogs = ({ onButton }) => {
  const dialogs = [...document.querySelectorAll("dialog[data-page]")];
  for (const dialog of dialogs) {
    dialog
      .querySelector("button")
      .addEventListener("click", () => onButton(dialog.dataset.page));
  }
  return {
    showDialog: (pageKey) => {
      for (const dialog of dialogs) {
        if (dialog.dataset.page !== pageKey) {
          if (dialog.open) dialog.close();
        } else if (!dialog.open) {
          dialog.show();
          dialog.querySelector("button").focus();
        }
      }
    },
  };
};
