/** #### Finds which cake a location hash names
 * - `#black-forest` names the recipe whose `id` is `black-forest`. A
 *   missing or unknown hash names the first recipe, the start of the walk.
 * - Pure: reads no `location`, so Node can run it.
 * @param hash The location hash, with its leading `#`, or empty.
 * @param recipes The recipes, in walk order.
 * @returns The index of the named recipe in `recipes`, or 0.
 */
export const cakeIndexForHash = (hash, recipes) => {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const index = recipes.findIndex((recipe) => recipe.id === id);
  return Math.max(index, 0);
};
