// The jam's translucency, unitless: half the light from the part beneath
// shows through it.
const JAM_TRANSLUCENCY = 0.5;

// The honey's translucency, unitless: more of the part beneath shows
// through it than through the jam.
const HONEY_TRANSLUCENCY = 0.65;

// The light crust of an everyday baked layer, unitless, on the scale of a
// material's `crust`: a subtle hint of browning at its outer surface.
const LIGHT_CRUST = 0.4;

// The palette every recipe names its materials from, first guesses to tune
// by eye. Each entry gives a colour as an sRGB `#rrggbb` string, a
// roughness as Three.js's physical shading takes it, 0 to 1, a metalness,
// 0 for all but metals, and the crumb's hole strength, 0 to 1, and hole
// cell in metres, which src/sdf/crumb.js reads. A layer's material may give
// a `translucency`, 0 to 1, which lets the part beneath show through it as
// a translucent topping's does; it defaults to 0, opaque. A layer's material
// whose `holeFill` is true fills its holes with chocolate rather than
// cutting them, as src/sdf/crumb.js colours it, and one with a `crust`, 0
// to 1, browns that far near its outer surface, as a baked crust, its
// colour desaturated by an optional `crustSaturation`, 0 grey to 1 full.
export const MATERIALS = {
  sponge: {
    color: "#e9c46a",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.004,
    crust: LIGHT_CRUST,
  },
  chocolateSponge: {
    color: "#5a3a22",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.004,
    crust: LIGHT_CRUST,
  },
  fruitCake: {
    color: "#4a2c14",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 0.6,
    holeCellMeters: 0.003,
    crust: LIGHT_CRUST,
  },
  jam: {
    color: "#a8182e",
    roughness: 0.3,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
    translucency: JAM_TRANSLUCENCY,
  },
  honey: {
    color: "#c98a1b",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
    translucency: HONEY_TRANSLUCENCY,
  },
  flatbread: {
    color: "#c4b29c",
    roughness: 0.85,
    metalness: 0,
    holeStrength: 0.15,
    holeCellMeters: 0.003,
    crust: LIGHT_CRUST,
  },
  moonSponge: {
    color: "#eceef3",
    roughness: 0.85,
    metalness: 0,
    holeStrength: 0.15,
    holeCellMeters: 0.003,
    crust: LIGHT_CRUST,
  },
  greyMoonSponge: {
    color: "#c3c6cc",
    roughness: 0.85,
    metalness: 0,
    holeStrength: 0.15,
    holeCellMeters: 0.003,
    crust: LIGHT_CRUST,
  },
  silverIcing: {
    color: "#e4e7ed",
    roughness: 0.25,
    metalness: 0.4,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  sacherSponge: {
    color: "#4a2c1a",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 0.6,
    holeCellMeters: 0.003,
    crust: LIGHT_CRUST,
  },
  apricotJam: {
    color: "#d9821e",
    roughness: 0.3,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
    translucency: JAM_TRANSLUCENCY,
  },
  sacherGlaze: {
    color: "#2a160c",
    roughness: 0.12,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  formigueiroSponge: {
    color: "#d9a548",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.004,
    holeFill: true,
    crust: LIGHT_CRUST,
  },
  brigadeiroGlaze: {
    color: "#3a2010",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  pandanSponge: {
    color: "#7cc35a",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.003,
    crust: 0.875,
  },
  pancake: {
    color: "#f0d9a0",
    roughness: 0.8,
    metalness: 0,
    holeStrength: 0.3,
    holeCellMeters: 0.002,
    crust: 0.5,
    crustSaturation: 0.5,
  },
  cream: {
    color: "#fff4e0",
    roughness: 0.6,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  ganache: {
    color: "#3b2314",
    roughness: 0.25,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  darkGanache: {
    color: "#24140b",
    roughness: 0.25,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  berryCoulis: {
    color: "#6e0b1f",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  custard: {
    color: "#f4c842",
    roughness: 0.5,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  pastry: {
    color: "#d9a861",
    roughness: 0.85,
    metalness: 0,
    holeStrength: 0.3,
    holeCellMeters: 0.002,
    crust: LIGHT_CRUST,
  },
  biscuit: {
    color: "#b88a4a",
    roughness: 0.95,
    metalness: 0,
    holeStrength: 0.5,
    holeCellMeters: 0.002,
    crust: LIGHT_CRUST,
  },
  cheesecake: {
    color: "#f5e6c8",
    roughness: 0.7,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  strawberryIcing: {
    color: "#f2a1bb",
    roughness: 0.35,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  marzipan: {
    color: "#f0d98a",
    roughness: 0.5,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  china: {
    color: "#f7f3ea",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  paper: {
    color: "#f2efe6",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  lightBluePaper: {
    color: "#9ec8ec",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  redChina: {
    color: "#c62b2b",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  foil: {
    color: "#c9c9cc",
    roughness: 0.3,
    metalness: 1,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  brushedGold: {
    color: "#d4b36a",
    roughness: 0.45,
    metalness: 1,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  brazilYellowChina: {
    color: "#fedd00",
    roughness: 0.15,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  stone: {
    color: "#8c8b87",
    roughness: 0.95,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  wood: {
    color: "#9d8372",
    roughness: 0.8,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
  },
  brushedCopper: {
    color: "#c07a4a",
    roughness: 0.45,
    metalness: 1,
    holeStrength: 0,
    holeCellMeters: 0,
  },
};
