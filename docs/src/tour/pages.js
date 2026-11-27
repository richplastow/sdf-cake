/**
 * @fileoverview
 * The tour's pages, in order, and the steps between them: a welcome, four
 * cakes to guess, a fun-facts interlude, the presentation cakes and a
 * thank-you. Pure: Node can run it.
 */

import { RECIPES } from "../cake/recipes.js";

// The ids of the cakes the visitor guesses, each with the name the guess
// reveals, in tour order.
const GUESSES = [
  { id: "1", cakeName: "Black Forest Gateau" },
  { id: "2", cakeName: "Cheesecake" },
  { id: "3", cakeName: "Victoria Sponge Cake" },
  { id: "4", cakeName: "Birthday Cake" },
];
// The one cake off the tour, which only its hash reaches.
const OFF_TOUR_ID = "5";
// The first of the presentation cakes, which run from it to the end of
// `RECIPES`.
const FIRST_PRESENTATION_ID = "pancake";

/** #### The tour's pages, in order
 * - Each page is its `id`, which the location hash names, and its `kind`:
 *   `welcome`, `guess`, `presentation` or `interlude`. A cake page's `id`
 *   is its recipe's, and a `guess` page also gives its `cakeName`.
 * - An optional `isOffTour`, when true, leaves the page off the tour's
 *   steps, so only its hash reaches it.
 */
export const PAGES = [
  { id: "", kind: "welcome" },
  ...GUESSES.map(({ cakeName, id }) => ({ cakeName, id, kind: "guess" })),
  { id: OFF_TOUR_ID, isOffTour: true, kind: "presentation" },
  { id: "fun-facts", kind: "interlude" },
  ...RECIPES.slice(
    RECIPES.findIndex((recipe) => recipe.id === FIRST_PRESENTATION_ID),
  ).map(({ id }) => ({ id, kind: "presentation" })),
  { id: "thanks", kind: "interlude" },
];

/** #### Finds which page a location hash names
 * - A missing or unknown hash names the welcome page, the first.
 * - Pure: reads no `location`, so Node can run it.
 * @param hash The location hash, with its leading `#`, or empty.
 * @param pages The pages, in tour order.
 * @returns The index of the named page in `pages`, or 0.
 */
export const pageIndexForHash = (hash, pages) => {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const index = pages.findIndex((page) => page.id === id);
  return Math.max(index, 0);
};

/** #### Gives the index of the next page on the tour
 * - Skips a page whose `isOffTour` is true.
 * @param index The current page's index.
 * @param pages The pages, in tour order.
 * @returns The next index, or `null` after the last.
 */
export const nextPageIndex = (index, pages) => stepTour(index, pages, 1);

/** #### Tells whether a page is the tour's last `guess` page
 * - Derived from `pages`: a `guess` page whose next page on the tour is
 *   not one, or which has none.
 * @param index The page's index.
 * @param pages The pages, in tour order.
 * @returns Whether it is the last `guess` page.
 */
export const isLastGuessPage = (index, pages) => {
  if (pages[index].kind !== "guess") return false;
  const next = nextPageIndex(index, pages);
  return next === null || pages[next].kind !== "guess";
};

/** #### Tells whether a page is the tour's last `presentation` page
 * - Derived from `pages`: a `presentation` page with no `presentation`
 *   page anywhere after it on the tour, so an off-tour cake followed by
 *   an interlude and more cakes is not the last.
 * @param index The page's index.
 * @param pages The pages, in tour order.
 * @returns Whether it is the last `presentation` page.
 */
export const isLastPresentationPage = (index, pages) => {
  if (pages[index].kind !== "presentation") return false;
  for (let i = nextPageIndex(index, pages); i !== null; ) {
    if (pages[i].kind === "presentation") return false;
    i = nextPageIndex(i, pages);
  }
  return true;
};

/** #### Gives the index of the previous page on the tour
 * - Skips a page whose `isOffTour` is true.
 * @param index The current page's index.
 * @param pages The pages, in tour order.
 * @returns The previous index, or `null` before the first.
 */
export const previousPageIndex = (index, pages) =>
  stepTour(index, pages, -1);

/** Steps one page on the tour either way, or gives `null` past its end. */
const stepTour = (index, pages, direction) => {
  for (let i = index + direction; i >= 0 && i < pages.length; i += direction) {
    if (!pages[i].isOffTour) return i;
  }
  return null;
};
