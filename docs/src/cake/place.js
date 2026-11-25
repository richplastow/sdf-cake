/**
 * @fileoverview
 * The decoration kinds, the one table both the placement and the field's
 * GLSL read, and the placement of a recipe's decorations on its top: each
 * countable item in a slot, and the scattered kind as a grid. Pure:
 * nothing here imports from `three`, so Node can run it.
 */

// A cherry's translucency, 0 opaque to 1 clear, on the scale of the jam's
// JAM_TRANSLUCENCY in src/cake/materials.js: a glacé cherry, mostly sugar
// syrup, letting a little light through. A tuning value, not measured.
const CHERRY_TRANSLUCENCY = 0.15;
const FULL_TURN_RADIANS = 2 * Math.PI;
// A dried orange slice's translucency, on the same scale: a candied slice
// lets a little light through, as the cherry does. A tuning value.
const ORANGE_SLICE_TRANSLUCENCY = 0.15;
// The colour of a scattered kind a cake lacks, or one whose colours come
// from SPRINKLE_PALETTE: black, as an sRGB `#rrggbb` string.
const NO_SCATTER_COLOR = "#000000";
// How many candidate points each item's placement tries.
const PLACEMENT_TRIES = 64;
// The disc that holds the items' centres, as a fraction of the crown's top
// radius, unitless, before each item's own footprint is taken off it.
const TOP_INSET_FRACTION = 0.8;

/** #### The decoration kinds, each its row's id from 1
 * - `sizeMeters` is the item's full extent at scale 1 along its own x, y
 *   and z, y upright: a sphere's diameter, a cylinder's diameter and
 *   height, an ellipsoid's or a box's three lengths, and a capsule's
 *   length, along x, and diameter.
 * - `vary` is how much the hash varies the size either way, `tiltRadians`
 *   the greatest tilt about X and about Z, and `embed` how deep the item
 *   sits below the surface as a fraction of its height, all unitless but
 *   the tilt. A scattered kind is drawn by the field's repeated cell, never
 *   placed in a slot.
 * - `translucency`, 0 opaque to 1 clear, lets a slot's item show the
 *   topping or sponge beneath it, as the jam does; a kind that leaves it
 *   out is opaque, 0. Only a slot's kind reads it, never a scattered one.
 */
export const DECORATION_KINDS = [
  {
    embed: 0.35,
    id: 1,
    isScattered: false,
    name: "cherry",
    primitive: "sphere",
    roughness: 0.2,
    sizeMeters: [0.018, 0.018, 0.018],
    tiltRadians: 0,
    translucency: CHERRY_TRANSLUCENCY,
    vary: 0.1,
  },
  {
    embed: 0.15,
    id: 2,
    isScattered: false,
    name: "candle",
    primitive: "cylinder",
    roughness: 0.5,
    sizeMeters: [0.008, 0.05, 0.008],
    tiltRadians: degreesToRadians(4),
    vary: 0,
  },
  {
    embed: 0.3,
    id: 3,
    isScattered: false,
    name: "orangeSlice",
    primitive: "cylinder",
    roughness: 0.5,
    sizeMeters: [0.04, 0.004, 0.04],
    tiltRadians: degreesToRadians(8),
    translucency: ORANGE_SLICE_TRANSLUCENCY,
    vary: 0.1,
  },
  {
    embed: 0.4,
    id: 4,
    isScattered: false,
    name: "almond",
    primitive: "ellipsoid",
    roughness: 0.7,
    sizeMeters: [0.011, 0.004, 0.007],
    tiltRadians: degreesToRadians(15),
    vary: 0.25,
  },
  {
    embed: 0.3,
    id: 5,
    isScattered: true,
    name: "sprinkle",
    primitive: "capsule",
    roughness: 0.4,
    sizeMeters: [0.006, 0.0016, 0.0016],
    tiltRadians: degreesToRadians(10),
    vary: 0.15,
  },
  {
    embed: 0.2,
    id: 6,
    isScattered: true,
    name: "flake",
    primitive: "box",
    roughness: 0.3,
    sizeMeters: [0.004, 0.0005, 0.003],
    tiltRadians: degreesToRadians(20),
    vary: 0.3,
  },
];

// The sprinkles' five colours, as sRGB `#rrggbb` strings; the field's GLSL
// picks one per sprinkle by its hash.
export const SPRINKLE_PALETTE = [
  "#e63946",
  "#f4a261",
  "#2a9d8f",
  "#4361ee",
  "#ffd166",
];

/** #### Places a recipe's countable decorations on its top, in slots
 * - Kinds go largest nominal footprint first, ties in recipe order, so the
 *   smaller kinds take the gaps the larger leave.
 * - A kind of count 1 placed first goes at the centre. Every other item
 *   tries `PLACEMENT_TRIES` points from the hash in the disc of
 *   `TOP_INSET_FRACTION` of the crown's top radius less its footprint, and
 *   takes the one whose footprint lies farthest from every footprint
 *   already placed.
 * - The hash is seeded by the cake's id, the kind's name, the item's index
 *   and the try, so a cake always places the same way.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The slots, each its `color`, `embedMeters`, `footprintMeters`,
 *   `kindId`, `rotation` (nine numbers, column-major), `roughness`,
 *   `scale`, `xMeters` and `zMeters`.
 */
export const placeDecorations = (recipe) => {
  const crownRadiusMeters = crownTopRadiusMeters(recipe.layers);
  const countable = recipe.decorations
    .map((decoration) => ({ decoration, kind: kindNamed(decoration.kind) }))
    .filter(({ kind }) => !kind.isScattered)
    // Array.prototype.sort() is stable, so ties keep recipe order.
    .sort((a, b) => footprintOf(b.kind, 1) - footprintOf(a.kind, 1));

  const slots = [];
  for (const { decoration, kind } of countable) {
    for (let index = 0; index < decoration.count; index++) {
      const isCentred = decoration.count === 1 && slots.length === 0;
      slots.push(
        placeItem(
          crownRadiusMeters,
          decoration.color,
          index,
          isCentred,
          kind,
          recipe.id,
          slots,
        ),
      );
    }
  }
  return slots;
};

/** #### Places a recipe's scattered kind, if it holds one
 * - The grid's cell is the square root of the full cap's area over the
 *   count, the cap's radius being the crown's top radius plus the
 *   topping's thickness.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The scatter: `cellMeters`, `color`, an sRGB `#rrggbb` string,
 *   and `kindId`, 0 for none.
 */
export const placeScatter = (recipe) => {
  const decoration = recipe.decorations.find(
    (item) => kindNamed(item.kind).isScattered,
  );
  if (!decoration || !recipe.topping || decoration.count <= 0) {
    return { cellMeters: 0, color: NO_SCATTER_COLOR, kindId: 0 };
  }
  const capRadiusMeters =
    crownTopRadiusMeters(recipe.layers) + recipe.topping.thicknessMeters;
  return {
    cellMeters: Math.sqrt(
      (Math.PI * capRadiusMeters * capRadiusMeters) / decoration.count,
    ),
    color: decoration.color ?? NO_SCATTER_COLOR,
    kindId: kindNamed(decoration.kind).id,
  };
};

/** #### Gives the most a kind can stand above the surface, in metres
 * - Its height at its greatest size and tilt: its own height plus its
 *   widest horizontal reach, both ways, lifted by the tilt.
 * @param kind A row of `DECORATION_KINDS`.
 * @returns The height, in metres.
 */
export const greatestHeightMeters = (kind) =>
  (1 + kind.vary) *
  (kind.sizeMeters[1] +
    2 * horizontalReachMeters(kind) * Math.sin(kind.tiltRadians));

/** #### Gives the tallest of a recipe's decorations, in metres
 * @param decorations A recipe's decorations.
 * @returns The greatest height of any kind it holds, or 0 for none.
 */
export const greatestDecorationHeightMeters = (decorations) =>
  decorations.reduce(
    (tallest, decoration) =>
      decoration.count > 0
        ? Math.max(tallest, greatestHeightMeters(kindNamed(decoration.kind)))
        : tallest,
    0,
  );

/** #### Gives the decoration kind of a name
 * @param name The kind's name, as a recipe's decoration gives it.
 * @returns The row of `DECORATION_KINDS`, or undefined for none.
 */
export const kindNamed = (name) =>
  DECORATION_KINDS.find((kind) => kind.name === name);

/** #### Gives the radius of a kind's bounding sphere at scale 1, in metres
 * @param kind A row of `DECORATION_KINDS`.
 * @returns Half its greatest extent, or half the box's diagonal.
 */
export const boundingRadiusMeters = (kind) => {
  const [x, y, z] = kind.sizeMeters;
  if (kind.primitive === "box") return 0.5 * Math.hypot(x, y, z);
  return 0.5 * Math.max(x, y, z);
};

/** Gives the top radius of a recipe's crown, its last used layer's. */
const crownTopRadiusMeters = (layers) => {
  let radiusMeters = 0;
  for (const layer of layers) {
    if (layer.heightMeters > 0) radiusMeters = layer.topRadiusMeters;
  }
  return radiusMeters;
};

/** Converts degrees to radians. */
function degreesToRadians(degrees) {
  // Declared as a function so it is hoisted above the table that calls it.
  return (degrees * Math.PI) / 180;
}

/** #### Gives an item's footprint, in metres
 * - The radius of its greatest horizontal extent from its centre: its
 *   widest horizontal reach plus half its height, lifted by its kind's
 *   greatest tilt, times its scale.
 */
const footprintOf = (kind, scale) =>
  scale *
  (horizontalReachMeters(kind) +
    0.5 * kind.sizeMeters[1] * Math.sin(kind.tiltRadians));

/** #### Hashes a text to a 32-bit unsigned integer
 * - FNV-1a, http://www.isthe.com/chongo/tech/comp/fnv/, then lowbias32
 *   to spread its bits.
 */
const hashText = (text) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return lowbias32(hash);
};

/** Gives a kind's widest horizontal reach from its centre at scale 1. */
const horizontalReachMeters = (kind) => {
  const [x, _y, z] = kind.sizeMeters;
  if (kind.primitive === "box") return 0.5 * Math.hypot(x, z);
  return 0.5 * Math.max(x, z);
};

/** #### Mixes a 32-bit unsigned integer's bits
 * - Chris Wellons's lowbias32,
 *   https://nullprogram.com/blog/2018/07/31/, as the field's GLSL hashes
 *   its cells.
 */
const lowbias32 = (value) => {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
};

/** #### Places one countable item
 * - Its size, yaw and tilts come from the hash of the cake's id, its
 *   kind's name and its index; each try's point, from the same and the
 *   try.
 * - Its rotation is the yaw about Y after the tilts about X and then Z,
 *   `Ry × Rx × Rz`, as nine numbers in column-major order.
 */
const placeItem = (
  crownRadiusMeters,
  color,
  index,
  isCentred,
  kind,
  recipeId,
  placed,
) => {
  const seed = hashText(`${recipeId}:${kind.name}:${index}`);
  const scale = 1 + kind.vary * (2 * unitOf(seed, 0) - 1);
  const yawRadians = FULL_TURN_RADIANS * unitOf(seed, 1);
  const tiltXRadians = kind.tiltRadians * (2 * unitOf(seed, 2) - 1);
  const tiltZRadians = kind.tiltRadians * (2 * unitOf(seed, 3) - 1);
  const footprintMeters = footprintOf(kind, scale);

  let xMeters = 0;
  let zMeters = 0;
  if (!isCentred) {
    const discMeters = Math.max(
      TOP_INSET_FRACTION * crownRadiusMeters - footprintMeters,
      0,
    );
    let bestClearance = -Infinity;
    for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt++) {
      const trySeed = hashText(
        `${recipeId}:${kind.name}:${index}:${attempt}`,
      );
      const radiusMeters = discMeters * Math.sqrt(unitOf(trySeed, 0));
      const angleRadians = FULL_TURN_RADIANS * unitOf(trySeed, 1);
      const x = radiusMeters * Math.cos(angleRadians);
      const z = radiusMeters * Math.sin(angleRadians);
      let clearance = Infinity;
      for (const other of placed) {
        clearance = Math.min(
          clearance,
          Math.hypot(x - other.xMeters, z - other.zMeters) -
            other.footprintMeters -
            footprintMeters,
        );
      }
      if (clearance > bestClearance) {
        bestClearance = clearance;
        xMeters = x;
        zMeters = z;
      }
    }
  }

  return {
    color,
    embedMeters: kind.embed * kind.sizeMeters[1] * scale,
    footprintMeters,
    kindId: kind.id,
    rotation: rotationOf(tiltXRadians, tiltZRadians, yawRadians),
    roughness: kind.roughness,
    scale,
    xMeters,
    zMeters,
  };
};

/** #### Gives the rotation `Ry × Rx × Rz`, column-major, as nine numbers
 * - The yaw about Y applied last, after the tilt about X and, first, the
 *   tilt about Z; as Three.js's Matrix3 `elements` and GLSL hold a mat3.
 */
const rotationOf = (tiltXRadians, tiltZRadians, yawRadians) => {
  const cx = Math.cos(tiltXRadians);
  const sx = Math.sin(tiltXRadians);
  const cy = Math.cos(yawRadians);
  const sy = Math.sin(yawRadians);
  const cz = Math.cos(tiltZRadians);
  const sz = Math.sin(tiltZRadians);
  // Ry × Rx, row by row, then times Rz.
  const a = [
    [cy, sy * sx, sy * cx],
    [0, cx, -sx],
    [-sy, cy * sx, cy * cx],
  ];
  const rows = a.map(([r0, r1, r2]) => [
    r0 * cz + r1 * sz,
    -r0 * sz + r1 * cz,
    r2,
  ]);
  return [0, 1, 2].flatMap((column) => rows.map((row) => row[column]));
};

/** Gives a number from 0 up to 1 from a seed and a salt, by lowbias32. */
const unitOf = (seed, salt) =>
  lowbias32(seed + Math.imul(salt + 1, 0x9e3779b9)) / 0x100000000;
