/**
 * @fileoverview
 * The twelve cakes, in tour order, as recipes of named materials from
 * src/cake/materials.js: first guesses to tune by eye.
 */

/** #### The twelve cakes, in the order the tour visits them
 * - Each `id` is assigned here, never derived, and is what the location
 *   hash and later features quote.
 * - An optional `placementSeed` seeds placeDecorations() in place of the
 *   `id`, so a cake whose id changes keeps its decorations' places.
 * - Lengths are metres, colours sRGB `#rrggbb` strings, and layers run
 *   from the bottom. `plate` or `topping` is `null` where a cake has
 *   none, as a decoration's `color` is for a kind that takes its colours
 *   elsewhere, such as sprinkles.
 * - `eaten.minFraction` and `eaten.maxFraction` are fractions of a full
 *   turn.
 * - A decoration of count 1 may give `at`, its `xMeters` and `zMeters`
 *   on the top, to sit there rather than where placeDecorations() puts
 *   it, and optionally `tiltZRadians`, its tilt about Z, and
 *   `yawRadians`, its turn about Y, in place of a hashed tilt and yaw.
 *   The eaten slice is cut about +X.
 * - A topping's optional `isInvisible`, when true, draws nothing of it,
 *   while scattered decorations still sit on its cap.
 * - A topping's optional `translucency`, 0 to 1, lets the part beneath
 *   show through it, refracted and tinted by the topping's colour: 0 is
 *   opaque, and 1 clear; left out, it is 0.
 * - `topping`, `decorations`, and each layer's `irregularityMeters` and
 *   `inclusions`, are held for the topping, the decorations and the crumb
 *   to read, so the shape is complete before any of them is drawn.
 */
export const RECIPES = [
  {
    id: "1",
    // Seeds the placement as its first id, "black-forest", did, so its
    // decorations stay where they were tuned.
    placementSeed: "black-forest",
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
    id: "2", // cheesecake
    plate: {
      material: "lightBluePaper",
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
        heightMeters: 0.0315,
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
    id: "3", // victoria-sponge
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
        material: "cream",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.088,
        topRadiusMeters: 0.088,
        roundingMeters: 0.003,
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
    id: "4",
    // Seeds the placement as its first id, "chocolate-drip", did, so its
    // decorations stay where they were tuned.
    placementSeed: "chocolate-drip",
    plate: {
      material: "redChina",
      baseRadiusMeters: 0.088,
      rimRadiusMeters: 0.104,
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
    id: "5",
    // Seeds the placement as its first id, "fruit-cake", did, so its
    // decorations stay where they were tuned.
    placementSeed: "fruit-cake",
    // A foil cake drum: flat and thick, with no sweep or lip, its edge
    // rounded by the profile's stroke.
    plate: {
      material: "foil",
      baseRadiusMeters: 0.12,
      rimRadiusMeters: 0.125,
      sweepHeightMeters: 0,
      lipHeightMeters: 0,
      thicknessMeters: 0.012,
    },
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
  {
    id: "pancake",
    // A simple pancake: one thin layer of batter, browned where it met the
    // pan, on a rustic slab of grey stone: flat and thick, with no sweep or
    // lip, its edge rounded by the profile's stroke. No topping or
    // decorations.
    plate: {
      material: "stone",
      baseRadiusMeters: 0.12,
      rimRadiusMeters: 0.125,
      sweepHeightMeters: 0,
      lipHeightMeters: 0,
      thicknessMeters: 0.02,
    },
    layers: [
      {
        material: "pancake",
        heightMeters: 0.008,
        bottomRadiusMeters: 0.09,
        topRadiusMeters: 0.09,
        roundingMeters: 0.004,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: null,
    decorations: [],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.75 },
  },
  {
    id: "pepionkh-honey-cake",
    // Two wheat flatbreads with honey between and sesame on top, after the
    // honey cake found in the tomb of the vizier Pepi’Onkh, about 4,200
    // years old. A flat brushed-copper dish, its lip rising straight up
    // close round the cake.
    plate: {
      material: "brushedCopper",
      baseRadiusMeters: 0.048,
      rimRadiusMeters: 0.048,
      sweepHeightMeters: 0,
      lipHeightMeters: 0.012,
      thicknessMeters: 0.003,
    },
    layers: [
      {
        material: "flatbread",
        heightMeters: 0.012,
        bottomRadiusMeters: 0.045,
        topRadiusMeters: 0.045,
        roundingMeters: 0.006,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "honey",
        heightMeters: 0.003,
        bottomRadiusMeters: 0.042,
        topRadiusMeters: 0.042,
        roundingMeters: 0.0015,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "flatbread",
        heightMeters: 0.012,
        bottomRadiusMeters: 0.045,
        topRadiusMeters: 0.045,
        roundingMeters: 0.006,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    // No real topping: an invisible one, which draws nothing but gives the
    // scattered sesame seeds a cap to sit on. Its coverage keeps the cap,
    // and so the seeds, within the bread's flat top.
    topping: {
      isInvisible: true,
      material: "flatbread",
      coverage: 0.35,
      thicknessMeters: 0.0008,
      roundingMeters: 0.0004,
      pileMeters: 0,
      dripMeters: 0,
      dripWaves: 0,
    },
    decorations: [{ kind: "sesame", count: 240, color: "#b5ab98" }],
    eaten: { steps: 4, minFraction: 0.1, maxFraction: 0.7 },
  },
  {
    id: "artemis-offering",
    // An offering to Artemis, goddess of the moon: silvery white layers
    // ringed with candles, on a brushed-gold plate.
    plate: {
      material: "brushedGold",
      baseRadiusMeters: 0.1,
      rimRadiusMeters: 0.125,
      sweepHeightMeters: 0.01,
      lipHeightMeters: 0.003,
      thicknessMeters: 0.004,
    },
    layers: [
      {
        material: "moonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "greyMoonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "moonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "greyMoonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "moonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "greyMoonSponge",
        heightMeters: 0.006,
        bottomRadiusMeters: 0.085,
        topRadiusMeters: 0.085,
        roundingMeters: 0.0025,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "silverIcing",
      coverage: 1,
      thicknessMeters: 0.004,
      roundingMeters: 0.004,
      pileMeters: 0,
      dripMeters: 0.012,
      dripWaves: 13,
    },
    decorations: [
      { kind: "candle", count: 9, color: "#f4f4f8" },
      { kind: "flake", count: 100, color: "#d4d8e0" },
    ],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.7 },
  },
  {
    id: "sachertorte",
    // A Sachertorte: two dense chocolate sponges with apricot jam between,
    // and a thin coat of it beneath a glossy dark chocolate glaze that runs
    // all the way down the sides.
    plate: {
      material: "china",
      baseRadiusMeters: 0.12,
      rimRadiusMeters: 0.145,
      sweepHeightMeters: 0.012,
      lipHeightMeters: 0.004,
      thicknessMeters: 0.005,
    },
    layers: [
      {
        material: "sacherSponge",
        heightMeters: 0.025,
        bottomRadiusMeters: 0.1,
        topRadiusMeters: 0.1,
        roundingMeters: 0.003,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "apricotJam",
        heightMeters: 0.003,
        bottomRadiusMeters: 0.098,
        topRadiusMeters: 0.098,
        roundingMeters: 0.0015,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "sacherSponge",
        heightMeters: 0.025,
        bottomRadiusMeters: 0.1,
        topRadiusMeters: 0.1,
        roundingMeters: 0.003,
        irregularityMeters: 0.001,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "apricotJam",
        heightMeters: 0.003,
        bottomRadiusMeters: 0.098,
        topRadiusMeters: 0.098,
        roundingMeters: 0.0015,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: {
      material: "sacherGlaze",
      coverage: 1,
      thicknessMeters: 0.004,
      roundingMeters: 0.004,
      pileMeters: 0,
      dripMeters: 0,
      dripWaves: 0,
    },
    // The disc sits on -X, the middle of the quarter left at the last
    // eaten step, as the slice is cut about +X; far enough out that the
    // disc, 28 mm in radius, clears both cut faces, 45 degrees either side.
    // It is tilted 25 degrees, its low edge stuck in the cake and the rest
    // standing up out of it, and turned 20 degrees about Y.
    decorations: [
      {
        kind: "chocolateDisc",
        count: 1,
        color: "#1e0f07",
        at: {
          xMeters: -0.055,
          zMeters: 0,
          tiltZRadians: -0.44,
          yawRadians: 0.35,
        },
      },
    ],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.75 },
  },
  {
    id: "bolo-formigueiro",
    // A Bolo Formigueiro, the Brazilian ‘anthill’ cake, in a round tin: one
    // golden sponge whose holes are all filled with chocolate, under a
    // dripping chocolate glaze and chocolate sprinkles, on a plate the
    // yellow of Brazil’s flag.
    plate: {
      material: "brazilYellowChina",
      baseRadiusMeters: 0.11,
      rimRadiusMeters: 0.135,
      sweepHeightMeters: 0.012,
      lipHeightMeters: 0.004,
      thicknessMeters: 0.005,
    },
    layers: [
      {
        material: "formigueiroSponge",
        heightMeters: 0.075,
        bottomRadiusMeters: 0.095,
        topRadiusMeters: 0.095,
        roundingMeters: 0.006,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    // Far longer drips than the chocolate drip cake's, their reach, 50 mm,
    // taking the longest down to the plate, and 18 of them, with a drip
    // term of about 6, under MAX_DRIP_TERM.
    topping: {
      material: "brigadeiroGlaze",
      coverage: 0.75,
      thicknessMeters: 0.005,
      roundingMeters: 0.004,
      pileMeters: 0.003,
      dripMeters: 0.1,
      dripWaves: 18,
    },
    decorations: [
      { kind: "chocolateSprinkle", count: 300, color: "#2e1a0e" },
    ],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.75 },
  },
  {
    id: "banh-bo",
    // A Vietnamese cow cake, bánh bò: two green pandan sponges, browned
    // where they baked against the tin, with cream between, on a thick,
    // shallow wooden plate. No topping or decorations.
    plate: {
      material: "wood",
      baseRadiusMeters: 0.115,
      rimRadiusMeters: 0.13,
      sweepHeightMeters: 0.005,
      lipHeightMeters: 0.001,
      thicknessMeters: 0.012,
    },
    layers: [
      {
        material: "pandanSponge",
        heightMeters: 0.03,
        bottomRadiusMeters: 0.09,
        topRadiusMeters: 0.09,
        roundingMeters: 0.006,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "cream",
        heightMeters: 0.008,
        bottomRadiusMeters: 0.088,
        topRadiusMeters: 0.088,
        roundingMeters: 0.003,
        irregularityMeters: 0,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
      {
        material: "pandanSponge",
        heightMeters: 0.03,
        bottomRadiusMeters: 0.09,
        topRadiusMeters: 0.09,
        roundingMeters: 0.006,
        irregularityMeters: 0.0015,
        inclusions: { chocolateChips: 0, nuts: 0, raisins: 0 },
      },
    ],
    topping: null,
    decorations: [],
    eaten: { steps: 5, minFraction: 0.1, maxFraction: 0.75 },
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
    // The cherry sits on -X, in the quarter left at the last eaten step,
    // as the slice is cut about +X: 17 mm out, so its footprint, under
    // 10 mm in radius, clears both cut faces, 45 degrees either side, by
    // about 2 mm.
    decorations: [
      {
        kind: "cherry",
        count: 1,
        color: "#841027",
        at: { xMeters: -0.017, zMeters: 0 },
      },
    ],
    eaten: { steps: 4, minFraction: 0.2, maxFraction: 0.75 },
  },
];
