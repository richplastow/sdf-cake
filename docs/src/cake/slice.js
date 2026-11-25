/**
 * @fileoverview
 * The eaten slider's steps: how many a cake has, and the slice each one
 * cuts. Pure: Node can run it.
 */

import { eatenRadiansForFraction } from "./resolve.js";

/** #### Gives the eaten angle of one step of a cake's slider
 * - Step i of n is the fraction `minFraction + (maxFraction − minFraction)
 *   × i ÷ (n − 1)` of a full turn, clamped to `EATEN_MAX_RADIANS`; a cake
 *   with one step stays at `minFraction`.
 * @param eaten The recipe's `eaten`: `maxFraction`, `minFraction` and
 *   `steps`.
 * @param step The step's index, 0 to `steps` less 1.
 * @returns The eaten angle, in radians.
 */
export const eatenAngleForStep = ({ maxFraction, minFraction, steps }, step) =>
  eatenRadiansForFraction(
    steps > 1
      ? minFraction + ((maxFraction - minFraction) * step) / (steps - 1)
      : minFraction,
  );

/** #### Gives how many steps a recipe's eaten slider has
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The count of steps, at least 1.
 */
export const stepCountOf = (recipe) => recipe.eaten.steps;
