/**
 * @fileoverview
 * The reveal slider's stops: the parts a cake has, from the plate up, the
 * stop carried across cakes, and each part's presence at a stop, applied
 * to the resolved cake. Pure: Node can run it.
 */

// The resolved plate's and each resolved layer's lengths, which a hidden
// part takes to 0.
const LAYER_LENGTH_KEYS = [
  "bottomRadiusMeters",
  "heightMeters",
  "roundingMeters",
  "topRadiusMeters",
];
const PLATE_LENGTH_KEYS = [
  "baseRadiusMeters",
  "lipHeightMeters",
  "rimRadiusMeters",
  "sweepHeightMeters",
  "thicknessMeters",
];

/** #### Lists a recipe's parts, in the order the reveal shows them
 * - The plate, if not `null` and its rim radius is above 0; each layer of
 *   height above 0, from the bottom, with its `index` in the recipe; the
 *   topping, if not `null`, its coverage is above 0 and it is not
 *   invisible; and the decorations, as one part, if any count is above 0.
 * - An invisible topping draws nothing, so a stop of its own would show
 *   no change: presenceMaskFor() brings it in with the top layer.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The parts, each its `kind` and, for a layer, its `index`.
 */
export const revealPartsOf = (recipe) => {
  const { decorations, layers, plate, topping } = recipe;
  const parts = [];
  if (plate && plate.rimRadiusMeters > 0) parts.push({ kind: "plate" });
  layers.forEach((layer, index) => {
    if (layer.heightMeters > 0) parts.push({ kind: "layer", index });
  });
  if (topping && topping.coverage > 0 && !topping.isInvisible) {
    parts.push({ kind: "topping" });
  }
  if (decorations.some((decoration) => decoration.count > 0)) {
    parts.push({ kind: "decorations" });
  }
  return parts;
};

/** #### Applies a presence mask to a resolved cake, in place
 * - Multiplies the plate's lengths by its presence, each recipe layer's
 *   height, radii and rounding by its own, and the topping's coverage by
 *   its own; hidden decorations become no slots and an empty scatter, of
 *   `kindId` 0.
 * - The layers' `bottomMeters`, the topping's footing and the bounds are
 *   left as resolved: the motion derives its own every frame.
 * @param cake The resolved cake, with its `decorations`, mutated.
 * @param mask The presences, as presenceMaskFor() gives them.
 * @returns The cake.
 */
export const maskResolvedCake = (cake, mask) => {
  for (const key of PLATE_LENGTH_KEYS) cake.plate[key] *= mask.plate;
  mask.layers.forEach((presence, index) => {
    for (const key of LAYER_LENGTH_KEYS) cake.layers[index][key] *= presence;
  });
  cake.topping.coverage *= mask.topping;
  if (mask.decorations === 0) {
    cake.decorations = {
      scatter: { ...cake.decorations.scatter, kindId: 0 },
      slots: [],
    };
  }
  return cake;
};

/** #### Gives each part's presence at a reveal stop
 * - Stop k shows the parts 0 to k of revealPartsOf(); a part the recipe
 *   lacks is 0. An invisible topping, which has no stop, shows with the
 *   top layer, so its cap is in place before the decorations sit on it.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @param stop The reveal stop, 0 to the parts' count less 1.
 * @returns `plate`, `layers`, one per recipe layer, `topping` and
 *   `decorations`, each 1 when shown and 0 when hidden.
 */
export const presenceMaskFor = (recipe, stop) => {
  const mask = {
    plate: 0,
    layers: recipe.layers.map(() => 0),
    topping: 0,
    decorations: 0,
  };
  const parts = revealPartsOf(recipe);
  parts.forEach((part, order) => {
    if (order > stop) return;
    if (part.kind === "layer") mask.layers[part.index] = 1;
    else mask[part.kind] = 1;
  });
  const { topping } = recipe;
  if (topping && topping.coverage > 0 && topping.isInvisible) {
    const topLayer = parts.findLastIndex((part) => part.kind === "layer");
    if (topLayer >= 0 && stop >= topLayer) mask.topping = 1;
  }
  return mask;
};

/** #### Carries a reveal stop from one cake's slider to another's
 * - The ends stay ends; a stop between them takes the same fraction of the
 *   new slider, rounded to the nearest stop, a half rounding up.
 * @param stop The stop on the old slider.
 * @param oldMax The old slider's greatest stop.
 * @param newMax The new slider's greatest stop.
 * @returns The stop on the new slider.
 */
export const snapRevealStop = (stop, oldMax, newMax) => {
  if (stop >= oldMax) return newMax;
  if (stop <= 0) return 0;
  return Math.floor((stop / oldMax) * newMax + 0.5);
};
