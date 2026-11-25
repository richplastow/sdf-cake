/**
 * @fileoverview
 * Turns a recipe of named materials into the plain numbers the field's
 * uniforms take, and lists what is wrong with a recipe. Pure: nothing here
 * imports from `three`, so Node can run it.
 */

import { MATERIALS } from "./materials.js";
import { LAYER_SLOTS } from "./slots.js";

// The margin beyond the cake's extent of the sphere that bounds it, which
// also covers the plate's rounded edge and a lip that rises above a short
// stack.
const BOUND_MARGIN_METERS = 0.01;
const FULL_TURN_RADIANS = 2 * Math.PI;
// The colour of a part a cake lacks, and of an unused layer slot: black, as
// an sRGB `#rrggbb` string.
const NO_PART_COLOR = "#000000";
// The least a cut leaves of the cake: one degree, so the most eaten cake is
// a sliver, never a sheet of zero width that a march could hit.
const SLIVER_RADIANS = Math.PI / 180;

// The greatest eaten angle, a full turn less the sliver, in radians.
export const EATEN_MAX_RADIANS = FULL_TURN_RADIANS - SLIVER_RADIANS;

/** #### Resolves a recipe to the plain numbers the field's uniforms take
 * - The layers always number `LAYER_SLOTS`. Each layer's `bottomMeters` is
 *   the sum of the heights beneath it; an unused slot is inert, at the
 *   stack's top with zero height, radii and rounding, coloured `#000000`
 *   with roughness 0.
 * - A cake with no plate resolves to a plate of all zeros, coloured
 *   `#000000`.
 * - The eaten angle is the least fraction of a full turn, in radians,
 *   clamped to `EATEN_MAX_RADIANS`.
 * - The bound is the sphere on the Y axis that holds the plate and the
 *   stack, plus `BOUND_MARGIN_METERS`: its centre half way between the
 *   plate's underside and the stack's top, in metres.
 * - Colours stay sRGB `#rrggbb` strings, as the palette gives them.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The resolved cake: `plate`, `layers`, `eatenAngleRadians`,
 *   `boundCenterYMeters` and `boundRadiusMeters`.
 */
export const resolveRecipe = (recipe) => {
  const plate = resolvePlate(recipe.plate);

  const layers = [];
  let stackTopMeters = 0;
  for (const layer of recipe.layers) {
    const material = MATERIALS[layer.material];
    layers.push({
      bottomMeters: stackTopMeters,
      heightMeters: layer.heightMeters,
      bottomRadiusMeters: layer.bottomRadiusMeters,
      topRadiusMeters: layer.topRadiusMeters,
      roundingMeters: layer.roundingMeters,
      color: material.color,
      roughness: material.roughness,
    });
    stackTopMeters += layer.heightMeters;
  }
  while (layers.length < LAYER_SLOTS) {
    layers.push({
      bottomMeters: stackTopMeters,
      heightMeters: 0,
      bottomRadiusMeters: 0,
      topRadiusMeters: 0,
      roundingMeters: 0,
      color: NO_PART_COLOR,
      roughness: 0,
    });
  }

  // The bound's sphere spans the plate's underside, one plate thickness
  // below the origin, to the stack's top, and the widest radius of either.
  const undersideMeters = -plate.thicknessMeters;
  const halfHeightMeters = 0.5 * (stackTopMeters - undersideMeters);
  let widestRadiusMeters = plate.rimRadiusMeters;
  for (const layer of layers) {
    widestRadiusMeters = Math.max(
      widestRadiusMeters,
      layer.bottomRadiusMeters,
      layer.topRadiusMeters,
    );
  }

  return {
    plate,
    layers,
    eatenAngleRadians: Math.min(
      recipe.eaten.minFraction * FULL_TURN_RADIANS,
      EATEN_MAX_RADIANS,
    ),
    boundCenterYMeters: undersideMeters + halfHeightMeters,
    boundRadiusMeters:
      Math.sqrt(
        widestRadiusMeters * widestRadiusMeters +
          halfHeightMeters * halfHeightMeters,
      ) + BOUND_MARGIN_METERS,
  };
};

/** #### Lists what is wrong with a recipe, as sentences
 * - A recipe needs at least two parts, counting the plate, each layer, a
 *   topping whose coverage is above 0, and decorations whose counts total
 *   above 0.
 * - It holds at most `LAYER_SLOTS` layers, and each layer's rounding is at
 *   most the least of its radii and half its height.
 * - Every material it names, the plate's, the topping's and each layer's,
 *   is in the palette.
 * - `eaten.steps` is at least 1; `eaten.minFraction` is at most
 *   `eaten.maxFraction`, both within 0 and 1, and the two are equal when
 *   there is one step.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The problems found, empty when the recipe is valid.
 */
export const validateRecipe = (recipe) => {
  const { decorations, eaten, layers, plate, topping } = recipe;
  const problems = [];

  const decorationCount = decorations.reduce(
    (total, decoration) => total + decoration.count,
    0,
  );
  const partCount =
    (plate ? 1 : 0) +
    layers.length +
    (topping && topping.coverage > 0 ? 1 : 0) +
    (decorationCount > 0 ? 1 : 0);
  if (partCount < 2) {
    problems.push(`It has ${partCount} part(s), and needs at least 2.`);
  }

  if (layers.length > LAYER_SLOTS) {
    problems.push(
      `It has ${layers.length} layers, and holds at most ${LAYER_SLOTS}.`,
    );
  }
  layers.forEach((layer, index) => {
    const greatestRoundingMeters = Math.min(
      layer.bottomRadiusMeters,
      layer.topRadiusMeters,
      0.5 * layer.heightMeters,
    );
    if (layer.roundingMeters > greatestRoundingMeters) {
      problems.push(
        `Layer ${index}'s rounding passes its least radius or half its ` +
          "height.",
      );
    }
  });

  const materialNames = [
    ...(plate ? [plate.material] : []),
    ...layers.map((layer) => layer.material),
    ...(topping ? [topping.material] : []),
  ];
  for (const name of materialNames) {
    if (!Object.hasOwn(MATERIALS, name)) {
      problems.push(`The material "${name}" is not in the palette.`);
    }
  }

  if (!(eaten.steps >= 1)) {
    problems.push("It is eaten in fewer than 1 step.");
  }
  if (eaten.minFraction > eaten.maxFraction) {
    problems.push("Its least eaten fraction passes its greatest.");
  }
  if (!isFraction(eaten.minFraction) || !isFraction(eaten.maxFraction)) {
    problems.push("An eaten fraction lies outside 0 to 1.");
  }
  if (eaten.steps === 1 && eaten.minFraction !== eaten.maxFraction) {
    problems.push("With 1 step, its eaten fractions must be equal.");
  }

  return problems;
};

/** Says whether a number lies within 0 and 1, both included. */
const isFraction = (value) => value >= 0 && value <= 1;

/** #### Resolves a recipe's plate, or its lack of one, to plain numbers
 * @param plate The recipe's plate, or `null` for none.
 * @returns The plate's lengths in metres, colour, roughness and metalness;
 *   all zeros, coloured `#000000`, for no plate.
 */
const resolvePlate = (plate) => {
  if (!plate) {
    return {
      baseRadiusMeters: 0,
      rimRadiusMeters: 0,
      sweepHeightMeters: 0,
      lipHeightMeters: 0,
      thicknessMeters: 0,
      color: NO_PART_COLOR,
      roughness: 0,
      metalness: 0,
    };
  }
  const material = MATERIALS[plate.material];
  return {
    baseRadiusMeters: plate.baseRadiusMeters,
    rimRadiusMeters: plate.rimRadiusMeters,
    sweepHeightMeters: plate.sweepHeightMeters,
    lipHeightMeters: plate.lipHeightMeters,
    thicknessMeters: plate.thicknessMeters,
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
  };
};
