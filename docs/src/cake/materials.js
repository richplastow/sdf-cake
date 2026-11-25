// The jam's translucency, unitless: half the light from the part beneath
// shows through it.
const JAM_TRANSLUCENCY = 0.5;

// The palette every recipe names its materials from, first guesses to tune
// by eye. Each entry gives a colour as an sRGB `#rrggbb` string, a
// roughness as Three.js's physical shading takes it, 0 to 1, a metalness,
// 0 for all but metals, and the crumb's hole strength, 0 to 1, and hole
// cell in metres, which src/sdf/crumb.js reads. A layer's material may give
// a `translucency`, 0 to 1, which lets the part beneath show through it as
// a translucent topping's does; it defaults to 0, opaque.
export const MATERIALS = {
  sponge: {
    color: "#e9c46a",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.004,
  },
  chocolateSponge: {
    color: "#5a3a22",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 1,
    holeCellMeters: 0.004,
  },
  fruitCake: {
    color: "#4a2c14",
    roughness: 0.9,
    metalness: 0,
    holeStrength: 0.6,
    holeCellMeters: 0.003,
  },
  jam: {
    color: "#a8182e",
    roughness: 0.3,
    metalness: 0,
    holeStrength: 0,
    holeCellMeters: 0,
    translucency: JAM_TRANSLUCENCY,
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
  },
  biscuit: {
    color: "#b88a4a",
    roughness: 0.95,
    metalness: 0,
    holeStrength: 0.5,
    holeCellMeters: 0.002,
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
  foil: {
    color: "#c9c9cc",
    roughness: 0.3,
    metalness: 1,
    holeStrength: 0,
    holeCellMeters: 0,
  },
};
