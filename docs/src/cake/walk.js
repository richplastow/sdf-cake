/**
 * @fileoverview
 * The walk round the loop of cakes, wrapping at both ends. Pure: Node can
 * run it.
 */

/** #### Gives the index of the next cake round the loop
 * @param index The current cake's index.
 * @param count How many cakes the loop holds.
 * @returns The next index, 0 after the last.
 */
export const nextCakeIndex = (index, count) => (index + 1) % count;

/** #### Gives the index of the previous cake round the loop
 * @param index The current cake's index.
 * @param count How many cakes the loop holds.
 * @returns The previous index, the last before 0.
 */
export const previousCakeIndex = (index, count) =>
  (index - 1 + count) % count;
