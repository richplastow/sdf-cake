/**
 * @fileoverview
 * The six cakes, in walk order, as recipes of named materials from
 * src/cake/materials.js: first guesses to tune by eye.
 */

/** #### The six cakes, in the order the walk visits them
 * - Each `id` is assigned here, never derived, and is what the location
 *   hash and later features quote.
 * - Lengths are metres, colours sRGB `#rrggbb` strings, and layers run
 *   from the bottom. `plate` or `topping` is `null` where a cake has
 *   none, as a decoration's `color` is for a kind that takes its colours
 *   elsewhere, such as sprinkles.
 * - `eaten.minFraction` and `eaten.maxFraction` are fractions of a full
 *   turn.
 * - A topping's optional `translucency`, 0 to 1, lets the part beneath
 *   show through it, refracted and tinted by the topping's colour: 0 is
 *   opaque, and 1 clear; left out, it is 0.
 * - `topping`, `decorations`, and each layer's `irregularityMeters` and
 *   `inclusions`, are held for the topping, the decorations and the crumb
 *   to read, so the shape is complete before any of them is drawn.
 */
export const RECIPES = [
  {
    id: "victoria-sponge",
    plate: {
      material: "china",
      baseRadiusMeters: 0.105,
      rimRadiusMeters: 0.13,
      sweepHeightMeters: 0.012,
      lipHeightMeters: 0.004,
      thicknessMeters: 0.005,
    },
    layers: [
      {
        material: "sponge",
        heightMeters: 0.03,
        bottomRadiusMeters: 0.09,
        topRadiusMeters: 0.09,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "jam",
        heightMeters: 0.004,
        bottomRadiusMeters: 0.088,
        topRadiusMeters: 0.088,
        roundingMeters: 0.002,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "sponge",
        heightMeters: 0.03,
        bottomRadiusMeters: 0.09,
        topRadiusMeters: 0.09,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "strawberryIcing",
      coverage: 1,
      thicknessMeters: 0.005,
      roundingMeters: 0.006,
      pileMeters: 0,
      dripMeters: 0,
      dripWaves: 0,
    },
    decorations: [],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.7 },
  },
  {
    id: "chocolate-drip",
    plate: {
      material: "china",
      baseRadiusMeters: 0.105,
      rimRadiusMeters: 0.13,
      sweepHeightMeters: 0.012,
      lipHeightMeters: 0.004,
      thicknessMeters: 0.005,
    },
    layers: [
      {
        material: "chocolateSponge",
        heightMeters: 0.025,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 60, nuts: 0, raisins: 0 },
      },
      {
        material: "darkGanache",
        heightMeters: 0.004,
        bottomRadiusMeters: 0.083,
        topRadiusMeters: 0.083,
        roundingMeters: 0.002,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "chocolateSponge",
        heightMeters: 0.025,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 60, nuts: 0, raisins: 0 },
      },
      {
        material: "darkGanache",
        heightMeters: 0.004,
        bottomRadiusMeters: 0.083,
        topRadiusMeters: 0.083,
        roundingMeters: 0.002,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "chocolateSponge",
        heightMeters: 0.025,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 60, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "ganache",
      coverage: 0.8,
      thicknessMeters: 0.005,
      roundingMeters: 0.004,
      pileMeters: 0.004,
      dripMeters: 0.02,
      dripWaves: 11,
    },
    decorations: [
      { kind: "candle", count: 5, color: "#9ecbf0" },
      { kind: "sprinkle", count: 80, color: null },
    ],
    // Every step's cut lines clear the candles, as placeDecorations() sets
    // them, by at least 1.5 mm.
    eaten: { steps: 6, minFraction: 0.15, maxFraction: 0.67 },
  },
  {
    id: "cheesecake",
    plate: {
      material: "paper",
      baseRadiusMeters: 0.1,
      rimRadiusMeters: 0.115,
      sweepHeightMeters: 0.006,
      lipHeightMeters: 0,
      thicknessMeters: 0.0015,
    },
    layers: [
      {
        material: "biscuit",
        heightMeters: 0.012,
        bottomRadiusMeters: 0.1,
        topRadiusMeters: 0.1,
        roundingMeters: 0.004,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "cheesecake",
        heightMeters: 0.045,
        bottomRadiusMeters: 0.1,
        topRadiusMeters: 0.1,
        roundingMeters: 0.006,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "berryCoulis",
      coverage: 0.6,
      thicknessMeters: 0.0015,
      roundingMeters: 0.00075,
      pileMeters: 0.003,
      dripMeters: 0.02,
      dripWaves: 9,
      translucency: 0.7,
    },
    decorations: [],
    eaten: { steps: 6, minFraction: 0, maxFraction: 0.9 },
  },
  {
    id: "custard-pie",
    plate: {
      material: "paper",
      baseRadiusMeters: 0.11,
      rimRadiusMeters: 0.13,
      sweepHeightMeters: 0.005,
      lipHeightMeters: 0,
      thicknessMeters: 0.002,
    },
    layers: [
      {
        material: "pastry",
        heightMeters: 0.008,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.1,
        roundingMeters: 0.004,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "custard",
        heightMeters: 0.022,
        bottomRadiusMeters: 0.095,
        topRadiusMeters: 0.098,
        roundingMeters: 0.004,
        irregularityMeters: 0.0005,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "cream",
      coverage: 0.5,
      thicknessMeters: 0.008,
      roundingMeters: 0.008,
      pileMeters: 0.025,
      dripMeters: 0,
      dripWaves: 0,
    },
    decorations: [{ kind: "cherry", count: 1, color: "#841027" }],
    eaten: { steps: 4, minFraction: 0.2, maxFraction: 0.75 },
  },
  {
    id: "black-forest",
    plate: {
      material: "china",
      baseRadiusMeters: 0.11,
      rimRadiusMeters: 0.14,
      sweepHeightMeters: 0.012,
      lipHeightMeters: 0.004,
      thicknessMeters: 0.005,
    },
    layers: [
      {
        material: "chocolateSponge",
        heightMeters: 0.028,
        bottomRadiusMeters: 0.095,
        topRadiusMeters: 0.095,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "cream",
        heightMeters: 0.008,
        bottomRadiusMeters: 0.093,
        topRadiusMeters: 0.093,
        roundingMeters: 0.003,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "chocolateSponge",
        heightMeters: 0.028,
        bottomRadiusMeters: 0.095,
        topRadiusMeters: 0.095,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "cream",
        heightMeters: 0.008,
        bottomRadiusMeters: 0.093,
        topRadiusMeters: 0.093,
        roundingMeters: 0.003,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "chocolateSponge",
        heightMeters: 0.028,
        bottomRadiusMeters: 0.095,
        topRadiusMeters: 0.095,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "cream",
      coverage: 1,
      thicknessMeters: 0.007,
      roundingMeters: 0.007,
      pileMeters: 0.004,
      dripMeters: 0,
      dripWaves: 0,
    },
    decorations: [
      { kind: "cherry", count: 8, color: "#841027" },
      { kind: "flake", count: 120, color: "#24140b" },
    ],
    eaten: { steps: 7, minFraction: 0.1, maxFraction: 0.9 },
  },
  {
    id: "fruit-cake",
    plate: null,
    layers: [
      {
        material: "fruitCake",
        heightMeters: 0.07,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.006,
        irregularityMeters: 0.002,
        inclusions: { chocolateChips: 0, nuts: 40, raisins: 150 },
      },
    ],
    topping: {
      material: "marzipan",
      coverage: 1,
      thicknessMeters: 0.006,
      roundingMeters: 0.005,
      pileMeters: 0,
      dripMeters: 0,
      dripWaves: 0,
    },
    decorations: [
      { kind: "almond", count: 12, color: "#c89a68" },
      { kind: "orangeSlice", count: 3, color: "#b5500f" },
    ],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.75 },
  },
];
