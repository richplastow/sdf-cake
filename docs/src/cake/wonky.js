/**
 * @fileoverview
 * A cake's wonkiness, one number from 0 to 1: the constants the field's
 * GLSL templates in, the hashed phases and directions that shape each
 * cake, and the stack's top offset that seats a decoration on the wonky
 * top. Pure: nothing here imports from `three`, so Node can run it.
 */

import { MATERIALS } from "./materials.js";
import { hashText, unitOf } from "./place.js";

const FULL_TURN_RADIANS = 2 * Math.PI;

// How tall a slot must be to add its full top offset, in metres: the
// layers' blend fade, so a slot growing from nothing or vanishing lifts
// the layers above it gradually. src/sdf/layers.js templates it in.
export const LAYER_BLEND_FADE_METERS = 0.002;
// How far a soft layer bulges past the column of the slot beneath it, in
// metres per unit of wonky, before its rounding cuts it back.
export const WONKY_OOZE_METERS = 0.004;
// How far the outline is pulled in or pushed out, as a fraction of the
// widest layer's radius per unit of wonky, unitless.
export const WONKY_OUTLINE = 0.1;
// The radius, as a fraction of the widest layer's, unitless, over which
// the outline's shift fades in from nothing at the axis, where its angle
// is undefined.
export const WONKY_OUTLINE_FADE_FRACTION = 0.5;
// The outline's three harmonics round the cake: their waves per turn and
// their weights, unitless, the weights summing to 1, so a potato rather
// than an ellipse.
export const WONKY_OUTLINE_WAVES = [2, 3, 5];
export const WONKY_OUTLINE_WEIGHTS = [0.5, 0.35, 0.15];
// The dome's centre, off the axis along the layer's direction, as a
// fraction of the widest layer's radius, unitless.
export const WONKY_DOME_OFFSET = 0.3;
// The lumps over each layer's top: their height in metres per unit of
// wonky, and their frequency, as iq's product of sines `sin(k x) sin(k z)`
// takes it, in radians per metre: about 6 cm lumps.
export const WONKY_LUMP_METERS = 0.003;
export const WONKY_LUMP_RADIANS_PER_METER = 50;
// How far a layer's top domes, at a rise of 1, or sags, at -1, in metres
// per unit of wonky.
export const WONKY_RISE_METERS = 0.006;
// How far a soft layer is set off its sponge along its direction, in
// metres per unit of wonky.
export const WONKY_SHIFT_METERS = 0.006;
// The torn slice: how far the cut wanders, in metres per unit of wonky,
// and the tear's frequency, as `sin(k y) sin(k r)` takes it, in radians
// per metre.
export const WONKY_TEAR_METERS = 0.005;
export const WONKY_TEAR_RADIANS_PER_METER = 60;
// How far each warp raises the field's gradient per unit of wonky,
// unitless, derived, not measured: the outline's along the rim, at most
// 0.1 x 3.36, and its fade's, at most 0.1 x 2; the top's dome, at most
// 0.006 x 2 / r0 on the narrowest cake, and its lumps', 0.003 x 50; and the
// tear's, 0.005 x 60.
export const WONKY_OUTLINE_GRADIENT = 0.54;
export const WONKY_TEAR_GRADIENT = 0.3;
export const WONKY_TOP_GRADIENT = 0.42;
// The sum of the three, 1.26: the march steps by 1 / (1 + it x wonky), so
// one step factor covers every warp wherever its gradient peaks.
export const WONKY_GRADIENT =
  WONKY_OUTLINE_GRADIENT + WONKY_TOP_GRADIENT + WONKY_TEAR_GRADIENT;
// The salts that draw a cake's numbers from its hash: the three outline
// phases first, then one direction per layer slot after them.
const PHASE_SALT_FIRST = 0;
const DIRECTION_SALT_FIRST = WONKY_OUTLINE_WAVES.length;

/** #### Gives a cake's three outline phases, in radians, from its hash
 * - Drawn from the hash of the recipe's `placementSeed`, or its `id`, as
 *   placeItem() in src/cake/place.js draws, so a cake is always the same
 *   potato.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns Three phases, each from 0 up to a full turn, in radians.
 */
export const wonkyPhasesOf = (recipe) => {
  const seed = wonkySeedOf(recipe);
  return WONKY_OUTLINE_WAVES.map(
    (_waves, index) =>
      FULL_TURN_RADIANS * unitOf(seed, PHASE_SALT_FIRST + index),
  );
};

/** #### Gives a recipe layer's wonky numbers, as the resolver holds them
 * - Its material's `rise`, -1 sags to 1 domes, and `soft`, defaulting to
 *   0 and false, and its direction, from the cake's hash and the slot.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @param layer One of the recipe's layers.
 * @param slot The layer's slot, from 0 at the bottom.
 * @returns `rise`, `soft` and `wonkyAngleRadians`.
 */
export const wonkyLayerOf = (recipe, layer, slot) => {
  const material = MATERIALS[layer.material];
  return {
    rise: material.rise ?? 0,
    soft: material.soft ?? false,
    wonkyAngleRadians:
      FULL_TURN_RADIANS *
      unitOf(wonkySeedOf(recipe), DIRECTION_SALT_FIRST + slot),
  };
};

/** #### Gives the radius the wonky outline and domes scale with, in metres
 * - The widest of the layers' two radii, each faded in by its height
 *   over `LAYER_BLEND_FADE_METERS`, so a hidden layer whose height rings
 *   about 0 on its spring never makes the radius jump; 0 for none.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param layers The layers, each its `heightMeters`, `bottomRadiusMeters`
 *   and `topRadiusMeters`.
 * @returns The radius, in metres.
 */
export const wonkyRadiusOf = (layers) => {
  let radiusMeters = 0;
  for (let slot = 0; slot < layers.length; slot++) {
    const layer = layers[slot];
    if (layer.heightMeters <= 0) continue;
    const fade = Math.min(layer.heightMeters / LAYER_BLEND_FADE_METERS, 1);
    radiusMeters = Math.max(
      radiusMeters,
      fade * Math.max(layer.bottomRadiusMeters, layer.topRadiusMeters),
    );
  }
  return radiusMeters;
};

/** #### Gives the stack's top offset at a point, in metres
 * - The sum of every used slot's top offset, as src/sdf/layers.js sums
 *   them: `wonky × (rise × WONKY_RISE_METERS × dome + WONKY_LUMP_METERS ×
 *   lumps)`, the dome `max(1 − (d / r0)², 0)` about the slot's own dome
 *   centre, the lumps `sin(k x) sin(k z)`, faded in by the slot's height
 *   over `LAYER_BLEND_FADE_METERS`, and never thinning the slot below 0.
 * @param layers The resolved layers, each its `heightMeters`, radii,
 *   `rise` and `wonkyAngleRadians`.
 * @param wonky The cake's wonkiness, 0 to 1.
 * @param xMeters The point's x, in metres.
 * @param zMeters The point's z, in metres.
 * @returns The offset, in metres, up positive.
 */
export const stackTopOffsetAt = (layers, wonky, xMeters, zMeters) => {
  const radiusMeters = wonkyRadiusOf(layers);
  if (radiusMeters <= 0) return 0;
  const lumps =
    Math.sin(WONKY_LUMP_RADIANS_PER_METER * xMeters) *
    Math.sin(WONKY_LUMP_RADIANS_PER_METER * zMeters);
  let offsetMeters = 0;
  for (const layer of layers) {
    if (layer.heightMeters <= 0) continue;
    const centreMeters = WONKY_DOME_OFFSET * radiusMeters;
    const acrossX =
      (xMeters - centreMeters * Math.cos(layer.wonkyAngleRadians)) /
      radiusMeters;
    const acrossZ =
      (zMeters - centreMeters * Math.sin(layer.wonkyAngleRadians)) /
      radiusMeters;
    const dome = Math.max(1 - (acrossX * acrossX + acrossZ * acrossZ), 0);
    const fade = Math.min(layer.heightMeters / LAYER_BLEND_FADE_METERS, 1);
    offsetMeters += Math.max(
      wonky *
        (layer.rise * WONKY_RISE_METERS * dome + WONKY_LUMP_METERS * lumps) *
        fade,
      -layer.heightMeters,
    );
  }
  return offsetMeters;
};

/** Gives the hash a cake's wonky numbers are drawn from. */
const wonkySeedOf = (recipe) =>
  hashText(`${recipe.placementSeed ?? recipe.id}:wonky`);
