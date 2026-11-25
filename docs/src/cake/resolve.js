/**
 * @fileoverview
 * Turns a recipe of named materials into the plain numbers the field's
 * uniforms take, and lists what is wrong with a recipe. Pure: nothing here
 * imports from `three`, so Node can run it.
 */

import { MATERIALS } from "./materials.js";
import { greatestDecorationHeightMeters, kindNamed } from "./place.js";
import { DECORATION_SLOTS, LAYER_SLOTS } from "./slots.js";

// The margin by which each bounding cylinder passes its part's extent, in
// radius and at both ends: 2 mm, which covers the march's own slop and
// nothing else.
const BOUND_MARGIN_METERS = 0.002;
const FULL_TURN_RADIANS = 2 * Math.PI;
// The greatest drip term a recipe may hold, unitless: the slope of the
// drips' cut-off round the cake, half the drip amplitude times the waves
// over the least radius a drip can end on. src/sdf/topping.js scales the
// term by its DRIP_STEP_FACTOR, 0.45, which keeps the field from
// overestimating for a slope up to 1.98; 1.9 leaves a margin.
const MAX_DRIP_TERM = 1.9;
// The colour of a part a cake lacks, and of an unused layer slot: black, as
// an sRGB `#rrggbb` string.
const NO_PART_COLOR = "#000000";
// How far the coat's smoothing can push the skirt past the widest layer
// grown by the thickness, as a fraction of the thickness, unitless: the
// smooth minimum reads up to a quarter of its blend less, and
// src/sdf/topping.js sets that blend to the thickness.
const SKIRT_BULGE_PER_THICKNESS = 0.25;
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
 * - The bounds are two cylinders on the Y axis, `bounds.plate` and
 *   `bounds.stack`, each its `bottomMeters`, `radiusMeters` and
 *   `topMeters`, holding its part and grown by `BOUND_MARGIN_METERS`. The
 *   plate's spans its underside to its lip's top, of radius its rim plus
 *   half its thickness; the stack's spans the lowest layer's bottom to the
 *   stack's top, of radius the widest of the layers' two radii. A part a
 *   cake lacks has a cylinder of all zeros, with no margin.
 * - The topping's base is the highest top of any used layer, and its
 *   `radiusMeters`, the crown radius, is that layer's top radius. A `null`
 *   topping, or a cake with no layers, resolves to a topping of all zeros,
 *   coloured `#000000`.
 * - The stack's cylinder grows by the topping's thickness, and the most its
 *   smoothing can push the coat further out, in radius, and by the same
 *   plus its pile and its tallest decoration at the top, as
 *   writeCakeBounds() works them out.
 * - The topping's `translucency`, 0 to 1, defaults to 0, opaque.
 * - Colours stay sRGB `#rrggbb` strings, as the palette gives them.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The resolved cake: `plate`, `layers`, `topping`,
 *   `eatenAngleRadians` and `bounds`.
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

  // The crown is the used layer with the highest top.
  let crown = null;
  for (const layer of layers) {
    if (layer.heightMeters <= 0) continue;
    if (
      !crown ||
      layer.bottomMeters + layer.heightMeters >
        crown.bottomMeters + crown.heightMeters
    ) {
      crown = layer;
    }
  }

  const topping = resolveTopping(recipe.topping, crown);
  const bounds = { plate: {}, stack: {} };
  writeCakeBounds(
    bounds,
    greatestDecorationHeightMeters(recipe.decorations),
    layers,
    plate,
    topping,
  );

  return {
    plate,
    layers,
    topping,
    eatenAngleRadians: eatenRadiansForFraction(recipe.eaten.minFraction),
    bounds,
  };
};

/** #### Gives the eaten angle for a fraction of a full turn
 * @param fraction The fraction of a full turn eaten, 0 to 1.
 * @returns The eaten angle, in radians, clamped to `EATEN_MAX_RADIANS`.
 */
export const eatenRadiansForFraction = (fraction) =>
  Math.min(fraction * FULL_TURN_RADIANS, EATEN_MAX_RADIANS);

/** #### Lists what is wrong with a recipe, as sentences
 * - A recipe needs at least two parts, counting the plate, each layer, a
 *   topping whose coverage is above 0, and decorations whose counts total
 *   above 0.
 * - It holds at most `LAYER_SLOTS` layers, and each layer's rounding is at
 *   most the least of its radii and half its height.
 * - Its countable decorations, every kind but a scattered one, total at
 *   most `DECORATION_SLOTS`.
 * - Every material it names, the plate's, the topping's and each layer's,
 *   is in the palette.
 * - The topping's `translucency`, where given, lies within 0 and 1.
 * - The topping's `dripWaves` is a whole number, and its drip term, half
 *   its `dripMeters` times its waves over the least radius a drip can end
 *   on, any layer's either radius less its rounding, is at most
 *   `MAX_DRIP_TERM`.
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

  const countableTotal = decorations.reduce(
    (total, decoration) =>
      kindNamed(decoration.kind)?.isScattered
        ? total
        : total + decoration.count,
    0,
  );
  if (countableTotal > DECORATION_SLOTS) {
    problems.push(
      `It has ${countableTotal} countable decorations, and holds at most ` +
        `${DECORATION_SLOTS}.`,
    );
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

  if (topping) {
    if (!isFraction(topping.translucency ?? 0)) {
      problems.push("The topping's translucency lies outside 0 to 1.");
    }
    if (!Number.isInteger(topping.dripWaves)) {
      problems.push("The topping's drip waves are not a whole number.");
    }
    const leastRadiusMeters = Math.min(
      ...layers.flatMap((layer) => [
        layer.bottomRadiusMeters - layer.roundingMeters,
        layer.topRadiusMeters - layer.roundingMeters,
      ]),
    );
    const dripTerm =
      (0.5 * topping.dripMeters * topping.dripWaves) / leastRadiusMeters;
    if (dripTerm > MAX_DRIP_TERM) {
      problems.push(
        `The topping's drip term, ${dripTerm.toFixed(2)}, passes ` +
          `${MAX_DRIP_TERM}.`,
      );
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

/** #### Works out a cake's two bounding cylinders, in place
 * - The plate's spans its underside to its lip's top, of radius its rim
 *   plus half its thickness.
 * - The stack's spans the lowest bottom of its used layers, those taller
 *   than 0, to their highest top, of radius the widest of their two radii,
 *   grown by the topping's thickness and the most its smoothing can push
 *   the coat further out, in radius, and by the same, its pile and its
 *   tallest decoration at the top.
 * - Each grows by `BOUND_MARGIN_METERS`; a part a cake lacks has a
 *   cylinder of all zeros, with no margin.
 * - Reads lengths below 0, which a spring can pass through, as 0, so it
 *   serves the cake in motion as well as at rest, and allocates nothing,
 *   so it is safe on the per-frame path.
 * @param bounds The bounds to write, mutated: `plate` and `stack`, each
 *   its `bottomMeters`, `radiusMeters` and `topMeters`.
 * @param decorationHeightMeters The most any of the cake's decorations
 *   stands above the topping's surface, in metres, 0 for none.
 * @param layers The cake's layers, each its `bottomMeters`,
 *   `heightMeters`, `bottomRadiusMeters` and `topRadiusMeters`.
 * @param plate The cake's plate, its lengths in metres.
 * @param topping The cake's topping, its lengths in metres.
 * @returns The bounds.
 */
export const writeCakeBounds = (
  bounds,
  decorationHeightMeters,
  layers,
  plate,
  topping,
) => {
  // The plate's stroked profile reaches half its thickness past the rim,
  // down to its underside, one thickness below the origin, and up to the
  // lip's top, at the sweep's height plus the lip's.
  const plateThicknessMeters = Math.max(plate.thicknessMeters, 0);
  writeBoundingCylinder(
    bounds.plate,
    -plateThicknessMeters,
    plate.rimRadiusMeters > 0
      ? plate.rimRadiusMeters + 0.5 * plateThicknessMeters
      : 0,
    Math.max(plate.sweepHeightMeters, 0) + Math.max(plate.lipHeightMeters, 0),
  );

  let stackBottomMeters = Infinity;
  let stackTopMeters = -Infinity;
  let widestRadiusMeters = 0;
  for (let slot = 0; slot < layers.length; slot++) {
    const layer = layers[slot];
    if (layer.heightMeters <= 0) continue;
    stackBottomMeters = Math.min(stackBottomMeters, layer.bottomMeters);
    stackTopMeters = Math.max(
      stackTopMeters,
      layer.bottomMeters + layer.heightMeters,
    );
    widestRadiusMeters = Math.max(
      widestRadiusMeters,
      layer.bottomRadiusMeters,
      layer.topRadiusMeters,
    );
  }

  // The skirt and the full cap pass the widest layer by at most the
  // thickness and the smoothing's bulge, the pile rises above the cap's
  // top, itself raised by the bulge, and the decorations stand on both.
  const toppingThicknessMeters = Math.max(topping.thicknessMeters, 0);
  const bulgedThicknessMeters =
    (1 + SKIRT_BULGE_PER_THICKNESS) * toppingThicknessMeters;
  writeBoundingCylinder(
    bounds.stack,
    stackBottomMeters,
    widestRadiusMeters + bulgedThicknessMeters,
    stackTopMeters +
      bulgedThicknessMeters +
      Math.max(topping.pileMeters, 0) +
      Math.max(decorationHeightMeters, 0),
  );
  return bounds;
};

/** #### Writes the cylinder on the Y axis that bounds a part, in place
 * - Grows the part's extent by `BOUND_MARGIN_METERS` in radius and at both
 *   ends.
 * - A part of zero radius, which a cake lacks, gives a cylinder of all
 *   zeros, with no margin, which the shader treats as a miss.
 * - Allocates nothing.
 * @param cylinder The cylinder to write, mutated: `bottomMeters`,
 *   `radiusMeters` and `topMeters`.
 * @param bottomMeters The part's lowest height, in metres.
 * @param radiusMeters The part's greatest distance from the Y axis, in
 *   metres.
 * @param topMeters The part's greatest height, in metres.
 */
const writeBoundingCylinder = (
  cylinder,
  bottomMeters,
  radiusMeters,
  topMeters,
) => {
  if (radiusMeters <= 0) {
    cylinder.bottomMeters = 0;
    cylinder.radiusMeters = 0;
    cylinder.topMeters = 0;
    return;
  }
  cylinder.bottomMeters = bottomMeters - BOUND_MARGIN_METERS;
  cylinder.radiusMeters = radiusMeters + BOUND_MARGIN_METERS;
  cylinder.topMeters = topMeters + BOUND_MARGIN_METERS;
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

/** #### Resolves a recipe's topping, or its lack of one, to plain numbers
 * @param topping The recipe's topping, or `null` for none.
 * @param crown The resolved layer with the highest top, or `null` for a
 *   cake with no layers, which has nothing to coat.
 * @returns The topping's base and crown radius, its coverage, lengths in
 *   metres, wave count, colour, roughness and translucency; all zeros,
 *   coloured `#000000`, for no topping.
 */
const resolveTopping = (topping, crown) => {
  if (!topping || !crown) {
    return {
      baseMeters: 0,
      radiusMeters: 0,
      coverage: 0,
      thicknessMeters: 0,
      roundingMeters: 0,
      pileMeters: 0,
      dripMeters: 0,
      dripWaves: 0,
      color: NO_PART_COLOR,
      roughness: 0,
      translucency: 0,
    };
  }
  const material = MATERIALS[topping.material];
  return {
    baseMeters: crown.bottomMeters + crown.heightMeters,
    radiusMeters: crown.topRadiusMeters,
    coverage: topping.coverage,
    thicknessMeters: topping.thicknessMeters,
    roundingMeters: topping.roundingMeters,
    pileMeters: topping.pileMeters,
    dripMeters: topping.dripMeters,
    dripWaves: topping.dripWaves,
    color: material.color,
    roughness: material.roughness,
    translucency: topping.translucency ?? 0,
  };
};
