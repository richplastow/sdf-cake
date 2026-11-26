/**
 * @fileoverview
 * The walk round the loop of cakes, wrapping at both ends. Pure: Node can
 * run it.
 */

/** #### Gives the index of the next cake round the loop
 * - Skips a recipe whose `isOffWalk` is true, which only its hash reaches.
 * @param index The current cake's index.
 * @param recipes The recipes, in walk order.
 * @returns The next index on the walk, wrapping after the last.
 */
export const nextCakeIndex = (index, recipes) => stepWalk(index, recipes, 1);

/** #### Gives the index of the previous cake round the loop
 * - Skips a recipe whose `isOffWalk` is true, which only its hash reaches.
 * @param index The current cake's index.
 * @param recipes The recipes, in walk order.
 * @returns The previous index on the walk, wrapping before 0.
 */
export const previousCakeIndex = (index, recipes) =>
  stepWalk(index, recipes, -1);

/** #### Steps round the loop by one cake on the walk, either way
 * - Gives `index` back if no other recipe is on the walk.
 */
const stepWalk = (index, recipes, direction) => {
  const count = recipes.length;
  for (let step = 1; step < count; step++) {
    const next = (index + direction * step + count * step) % count;
    if (!recipes[next].isOffWalk) return next;
  }
  return index;
};
