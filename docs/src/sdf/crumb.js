/**
 * @fileoverview
 * The crumb of a layer, as a GLSL chunk: its fractal holes, the inclusions
 * coloured into its cut faces, and the irregularity of its surface, with
 * the inclusion kinds it draws.
 */

import { linearColorOf, toGlslFloat } from "./decorations.js";

/** #### The inclusion kinds, each a volume of material inside a layer
 * - In the order of a layer's inclusion weights: chips, nuts, raisins.
 * - Each is an ellipsoid of its semi-axes along x, y and z, in metres,
 *   with its material id, its colour as an sRGB `#rrggbb` string and its
 *   roughness, 0 to 1: first guesses to tune by eye.
 */
export const INCLUSION_KINDS = [
  {
    name: "chocolateChip",
    color: "#2b1a10",
    materialId: 50,
    roughness: 0.4,
    semiAxesMeters: [0.004, 0.003, 0.004],
  },
  {
    name: "nut",
    color: "#b9895a",
    materialId: 51,
    roughness: 0.8,
    semiAxesMeters: [0.006, 0.004, 0.005],
  },
  {
    name: "raisin",
    color: "#3a2418",
    materialId: 52,
    roughness: 0.5,
    semiAxesMeters: [0.005, 0.003, 0.004],
  },
];

// The chocolate that fills a layer's holes, where its material's
// `holeFill` asks for it: an sRGB `#rrggbb` colour and a roughness, 0 to 1.
const HOLE_FILL_COLOR = "#3b2314";
const HOLE_FILL_ROUGHNESS = 0.35;

// The crust a baked layer browns to near its outer surface, where its
// material's `crust` asks for it: an sRGB `#rrggbb` colour, and the depth
// in metres over which it fades to the layer's own colour.
const CRUST_COLOR = "#7a4a22";
const CRUST_DEPTH_METERS = 0.0025;
// The scorch marks a layer's material may ask for with its `scorch`: sRGB
// `#rrggbb` colours, the plain one and the muted brown and grey a varied
// scorch ranges between; the noise's cell edge, in metres, for large,
// blurry patches, before the material's scale; and the noise's threshold,
// unitless, at the rim and at the centre, lower in the middle so the
// patches cluster there within SCORCH_CENTRE_METERS of the axis, and its
// softness. Each layer's slot, plus its material's scorch seed, shifts the
// noise by SCORCH_SLOT_SHIFT_CELLS, in cells of the noise, so stacked layers
// scorch differently, and a change of scale zooms the pattern about the
// cake's axis instead of sliding it. Tuning values.
const SCORCH_CELL_METERS = 0.03;
const SCORCH_CENTRE_METERS = 0.07;
const SCORCH_COLOR = "#1c120b";
const SCORCH_VARIED_BROWN = "#3b2a1f";
const SCORCH_VARIED_GREY = "#58554f";
const SCORCH_SLOT_SHIFT_CELLS = 37; // whole cells, per slot or seed step
const SCORCH_SOFTNESS = 0.35;
const SCORCH_THRESHOLD_CENTRE = 0.25;
const SCORCH_THRESHOLD_RIM = 0.95;
// How dark a layer already darker than CRUST_COLOR browns to, as a factor
// on its own linear colour, unitless: a chocolate sponge's crust darkens
// rather than lightens it.
const DARK_CRUST_FACTOR = 0.55;
// The filter, an sRGB `#rrggbb` colour, that a holed layer's crumb is
// seen through at the fully occluded floor of a hole: it absorbs the blue
// and green most, so the crumb turns a warmer, browner shade of itself.
// Tuning value.
const HOLE_WARM_COLOR = "#e8b48c";

// The greatest semi-axis of any inclusion kind, in metres.
const INCLUSION_REACH_METERS = Math.max(
  ...INCLUSION_KINDS.flatMap((kind) => kind.semiAxesMeters),
);

/** #### The GLSL chunk of the crumb
 * - Needs the primitives chunk, src/sdf/primitives.js, with its hashes,
 *   pasted before it. Reads no uniform: its callers pass a layer's values.
 * - holesDistance() cuts a layer's fractal holes from its distance, and
 *   skinnedHolesDistance() cuts them beneath a skin that lets only the
 *   larger through, narrower; warmedCrumbAlbedo() warms the crumb deep in
 *   a hole.
 * - inclusionAt() gives the material id of the inclusion at a point inside
 *   a layer, 50 to 52, or 0 where it lies in none; inclusionAlbedoOf()
 *   and inclusionRoughnessOf() map that id to its surface.
 * - irregularityAt() gives the displacement of a layer's distance.
 */
export const crumbChunk = /* glsl */ `
  // How far outside the plain layer, in metres, the holes are still cut:
  // beyond it they cannot reach the surface, and the plain distance, never
  // more than the holed one, is returned instead, as the research
  // measured.
  const float CRUMB_CLIP_METERS = 0.01;
  // A shift of the cell indices, in cells, so they hash as unsigned
  // integers, never negative: past the cake's reach in the finest cells.
  const float CRUMB_CELL_SHIFT = 4096.0;
  // The octaves of holes, each half the size of the last and turned.
  const int HOLE_OCTAVES = 2;
  // The smooth maximum the holes are cut with, as a fraction of their
  // octave's cell, unitless.
  const float HOLE_SMOOTH_FRACTION = 0.2;
  // Turns a point into the next octave's cells, twice as fine and rotated:
  // iq's matrix, https://iquilezles.org/articles/fbmsdf/, twice a rotation.
  const mat3 HOLE_OCTAVE_TURN = mat3(
    0.00, 1.60, 1.20,
    -1.60, 0.72, -0.96,
    -1.20, -0.96, 1.28
  );
  // Turns the first octave's cells, so no face of the cake, upright or
  // level, slices them along a row or a column of corners: half of
  // HOLE_OCTAVE_TURN, a pure rotation, which keeps the distance exact.
  const mat3 HOLE_BASE_TURN = 0.5 * HOLE_OCTAVE_TURN;
  // The most a hole's centre moves from its corner along each axis, in
  // cells, either way. With the greatest radius, half a cell, it stays
  // under one cell, so a sphere from a corner outside the eight checked
  // lies at least a quarter cell from the point.
  const float HOLE_JITTER_CELLS = 0.25;
  // The jitter's three fields of bits, one an axis, in the corner's next
  // hash: each field's width in bits, and its greatest value.
  const uint HOLE_JITTER_FIELD_BITS = 10u;
  const uint HOLE_JITTER_FIELD_MASK = (1u << HOLE_JITTER_FIELD_BITS) - 1u;
  // How deep the skin over a layer's holes is, in metres, and how far the
  // holes that open through it shrink, as a fraction of their octave's
  // greatest radius, unitless: the smaller holes stay shut beneath it and
  // the larger open narrower, so an outer surface shows a lesser crumb
  // than a cut face, about a third as many openings as measured in a port
  // of the field. Tuning values.
  const float HOLE_SKIN_METERS = 0.0015;
  const float HOLE_SKIN_ERODE = 0.3;
  // The filter that warms the crumb deep in a hole, in linear space.
  const vec3 HOLE_WARM_COLOR = ${linearColorOf(HOLE_WARM_COLOR)};
  // The least inclusion cell, in metres: twice the greatest semi-axis, so
  // every item reaching the point lies in one of the eight cells checked.
  const float INCLUSION_LEAST_CELL_METERS = ${toGlslFloat(
    2 * INCLUSION_REACH_METERS,
  )};
  const float MATERIAL_INCLUSION_FIRST = ${toGlslFloat(
    INCLUSION_KINDS[0].materialId,
  )};
  // The kinds' colours in linear space, roughnesses and semi-axes in
  // metres, in INCLUSION_KINDS's order: chips, nuts, raisins.
  const vec3 INCLUSION_COLORS[3] = vec3[](
    ${INCLUSION_KINDS.map((kind) => linearColorOf(kind.color)).join(",\n    ")}
  );
  const float INCLUSION_ROUGHNESSES[3] = float[](
    ${INCLUSION_KINDS.map((kind) => toGlslFloat(kind.roughness)).join(", ")}
  );
  const vec3 INCLUSION_SEMI_AXES_METERS[3] = vec3[](
    ${INCLUSION_KINDS.map(semiAxesOf).join(",\n    ")}
  );
  // The colour, in linear space, and roughness of the chocolate that fills
  // a layer's holes where its material asks for it.
  const vec3 HOLE_FILL_COLOR = ${linearColorOf(HOLE_FILL_COLOR)};
  const float HOLE_FILL_ROUGHNESS = ${toGlslFloat(HOLE_FILL_ROUGHNESS)};
  // The crust's colour, in linear space, and the depth it fades over, in
  // metres.
  const vec3 CRUST_COLOR = ${linearColorOf(CRUST_COLOR)};
  const float CRUST_DEPTH_METERS = ${toGlslFloat(CRUST_DEPTH_METERS)};
  const float DARK_CRUST_FACTOR = ${toGlslFloat(DARK_CRUST_FACTOR)};
  const float SCORCH_CELL_METERS = ${toGlslFloat(SCORCH_CELL_METERS)};
  const float SCORCH_CENTRE_METERS = ${toGlslFloat(SCORCH_CENTRE_METERS)};
  const vec3 SCORCH_COLOR = ${linearColorOf(SCORCH_COLOR)};
  const vec3 SCORCH_VARIED_BROWN = ${linearColorOf(SCORCH_VARIED_BROWN)};
  const vec3 SCORCH_VARIED_GREY = ${linearColorOf(SCORCH_VARIED_GREY)};
  const float SCORCH_SLOT_SHIFT_CELLS = ${toGlslFloat(
    SCORCH_SLOT_SHIFT_CELLS,
  )};
  const float SCORCH_SOFTNESS = ${toGlslFloat(SCORCH_SOFTNESS)};
  const float SCORCH_THRESHOLD_CENTRE = ${toGlslFloat(
    SCORCH_THRESHOLD_CENTRE,
  )};
  const float SCORCH_THRESHOLD_RIM = ${toGlslFloat(SCORCH_THRESHOLD_RIM)};
  // Rec. 709's luminance weights, for linear sRGB.
  const vec3 LUMINANCE_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
  // The irregularity's angular frequency along each axis, in radians per
  // metre: a lump about 8 cm across.
  const float IRREGULARITY_WAVES_PER_METER = 40.0;

  // The hash of a cell, by its indices.
  uint cellHash(vec3 cell) {
    uvec3 key = uvec3(cell + CRUMB_CELL_SHIFT);
    return lowbias32(key.x + lowbias32(key.y + lowbias32(key.z)));
  }

  // The distance, in cells, to the nearest of eight spheres by the corners
  // of the cell holding x, x in cells, each of a radius by its corner's
  // hash under half a cell, times the strength, and its centre moved from
  // its corner by up to HOLE_JITTER_CELLS along each axis by the fields of
  // the next hash: iq's sdBase, https://iquilezles.org/articles/fbmsdf/,
  // with jittered centres. Exact inside every hole and within a quarter
  // cell of one, where the surface lies; deeper in the crumb it may read
  // the holes too far, which only lowers the field inside the solid.
  float holeSpheresDistance(vec3 x, float strength) {
    vec3 cell = floor(x);
    vec3 f = x - cell;
    float d = NO_SURFACE_METERS;
    for (int i = 0; i < 8; i++) {
      vec3 corner = vec3(float(i & 1), float((i >> 1) & 1), float(i >> 2));
      uint hash = cellHash(cell + corner);
      float radius = 0.5 * strength * unitOfHash(hash);
      uint bits = nextHash(hash);
      uvec3 fields = uvec3(
        bits,
        bits >> HOLE_JITTER_FIELD_BITS,
        bits >> (2u * HOLE_JITTER_FIELD_BITS)
      ) & HOLE_JITTER_FIELD_MASK;
      vec3 jitter = HOLE_JITTER_CELLS *
        (2.0 * vec3(fields) / float(HOLE_JITTER_FIELD_MASK) - 1.0);
      d = min(d, length(f - corner - jitter) - radius);
    }
    return d;
  }

  // A layer's distance at p, in metres, with its fractal holes cut from
  // it: x bare, and y beneath its skin. HOLE_OCTAVES octaves of
  // holeSpheresDistance(), from cells of the hole cell's edge, in metres,
  // turned first by HOLE_BASE_TURN, each subtracted by a smooth maximum of
  // HOLE_SMOOTH_FRACTION of its cell, iq's fbm SDF,
  // https://iquilezles.org/articles/fbmsdf/. A strength of 0, 0 to 1, or
  // a cell of 0 cuts nothing. The cut only raises the distance, so it
  // keeps the layer's bound, and needs no step factor, as the research
  // measured. The skin is the layer's outer shell, HOLE_SKIN_METERS deep,
  // cut by the same holes shrunk by HOLE_SKIN_ERODE, and united with the
  // holed layer: a shrunk sphere's distance is still a bound, and so is a
  // union of two, so no step factor changes; a port of the field measured
  // its gradient at 1.00 near the surface.
  vec2 holedDistances(
    vec3 p,
    float cellMeters,
    float layer,
    float strength
  ) {
    if (strength <= 0.0 || cellMeters <= 0.0) return vec2(layer);
    if (layer >= CRUMB_CLIP_METERS) return vec2(layer);
    vec3 x = HOLE_BASE_TURN * (p / cellMeters);
    float scale = cellMeters;
    float holed = layer;
    float skin = max(layer, -layer - HOLE_SKIN_METERS);
    for (int octave = 0; octave < HOLE_OCTAVES; octave++) {
      float holes = scale * holeSpheresDistance(x, strength);
      float blend = HOLE_SMOOTH_FRACTION * scale;
      holed = smoothMaxDistance(holed, -holes, blend);
      skin = smoothMaxDistance(
        skin,
        -holes - HOLE_SKIN_ERODE * 0.5 * strength * scale,
        blend
      );
      x = HOLE_OCTAVE_TURN * x;
      scale *= 0.5;
    }
    return vec2(holed, min(holed, skin));
  }

  // A layer's distance at p, in metres, with its fractal holes cut from
  // it, as holedDistances() cuts them.
  float holesDistance(
    vec3 p,
    float cellMeters,
    float layer,
    float strength
  ) {
    return holedDistances(p, cellMeters, layer, strength).x;
  }

  // A layer's distance at p, in metres, with its fractal holes cut from
  // it beneath its skin, as holedDistances() cuts them: a cut face shows
  // every hole, an outer surface only the larger, narrower.
  float skinnedHolesDistance(
    vec3 p,
    float cellMeters,
    float layer,
    float strength
  ) {
    return holedDistances(p, cellMeters, layer, strength).y;
  }

  // A holed layer's albedo, warmed by how deep in a hole the point lies,
  // 0 on the open crumb to 1 at a fully occluded floor: filtered by
  // HOLE_WARM_COLOR to that power, so the crumb turns a warmer, browner
  // shade of itself, as light that reaches deep into a hole has bounced
  // off the crumb, and been absorbed by it, more often.
  vec3 warmedCrumbAlbedo(vec3 albedo, float depth) {
    return albedo * pow(HOLE_WARM_COLOR, vec3(depth));
  }

  // The material id of the inclusion holding p, or 0.0 where p lies in
  // none. The items sit one a cell, anywhere in a jittered grid of cells
  // of the edge given, in metres, each an ellipsoid of a kind drawn by its
  // hash against the weights, the shares of chips, nuts and raisins, and
  // turned by its hash. Only the cell holding p and its nearest neighbour
  // on each axis are checked, iq's eight-cell trick,
  // https://iquilezles.org/articles/sdfrepetition/: an item in any other
  // cell lies at least half a cell away. A cell under
  // INCLUSION_LEAST_CELL_METERS holds none.
  float inclusionAt(vec3 p, float cellMeters, vec3 weights) {
    if (cellMeters < INCLUSION_LEAST_CELL_METERS) return 0.0;
    vec3 inCells = p / cellMeters;
    vec3 base = floor(inCells);
    vec3 side = 2.0 * step(0.5, inCells - base) - 1.0;
    for (int i = 0; i < 8; i++) {
      vec3 cell =
        base + vec3(float(i & 1), float((i >> 1) & 1), float(i >> 2)) * side;
      uint hash = cellHash(cell);
      float pick = unitOfHash(hash);
      int kind = pick < weights.x ? 0 : pick < weights.x + weights.y ? 1 : 2;
      if (pick >= weights.x + weights.y + weights.z) continue;
      hash = nextHash(hash);
      vec3 jitter = vec3(unitOfHash(hash), 0.0, 0.0);
      hash = nextHash(hash);
      jitter.y = unitOfHash(hash);
      hash = nextHash(hash);
      jitter.z = unitOfHash(hash);
      vec3 local = p - (cell + jitter) * cellMeters;
      hash = nextHash(hash);
      float yaw = 2.0 * PI * unitOfHash(hash);
      hash = nextHash(hash);
      float pitch = PI * unitOfHash(hash);
      local.xz = mat2(cos(yaw), sin(yaw), -sin(yaw), cos(yaw)) * local.xz;
      local.xy =
        mat2(cos(pitch), sin(pitch), -sin(pitch), cos(pitch)) * local.xy;
      if (length(local / INCLUSION_SEMI_AXES_METERS[kind]) < 1.0) {
        return MATERIAL_INCLUSION_FIRST + float(kind);
      }
    }
    return 0.0;
  }

  // An inclusion's albedo and roughness, from its material id.
  vec3 inclusionAlbedoOf(float materialId) {
    return INCLUSION_COLORS[int(materialId - MATERIAL_INCLUSION_FIRST + 0.5)];
  }
  float inclusionRoughnessOf(float materialId) {
    return INCLUSION_ROUGHNESSES[
      int(materialId - MATERIAL_INCLUSION_FIRST + 0.5)
    ];
  }

  // Smooth value noise at x, 0 to 1, with x in cells, so one unit of x
  // crosses one cell: each corner's hash blended by smoothstep, iq's value
  // noise, https://iquilezles.org/articles/morenoise/, in 3D so sides mark
  // as tops do.
  float valueNoiseInCells(vec3 x) {
    vec3 cell = floor(x);
    vec3 f = x - cell;
    vec3 u = f * f * (3.0 - 2.0 * f);
    float corners[8];
    for (int i = 0; i < 8; i++) {
      vec3 corner = vec3(float(i & 1), float((i >> 1) & 1), float(i >> 2));
      corners[i] = unitOfHash(cellHash(cell + corner));
    }
    return mix(
      mix(
        mix(corners[0], corners[1], u.x),
        mix(corners[2], corners[3], u.x),
        u.y
      ),
      mix(
        mix(corners[4], corners[5], u.x),
        mix(corners[6], corners[7], u.x),
        u.y
      ),
      u.z
    );
  }

  // Smooth value noise at p, in metres, 0 to 1, of cells the edge given,
  // in metres.
  float valueNoise(vec3 p, float cellMeters) {
    return valueNoiseInCells(p / cellMeters);
  }

  // A layer's scorch colour at p, 0 to 1 deep, as its alpha, and its
  // colour: two octaves of valueNoiseInCells(), shifted by the slot and the
  // seed, a whole number, by SCORCH_SLOT_SHIFT_CELLS cells each, so a
  // change of scale zooms the pattern about the axis, against a threshold
  // that falls towards the axis as far as the clustering, 0 even to 1 full,
  // takes it, and by the coverage, so soft patches gather in the middle or
  // spread evenly. The scorch packs its strength, unitless, its scale of
  // SCORCH_CELL_METERS, its variety, 0 plain to 1 ranging between muted
  // brown and grey, and its coverage, unitless.
  vec4 scorchAt(
    vec3 p,
    int slot,
    vec4 scorch,
    float seed,
    float clustering
  ) {
    float cell = SCORCH_CELL_METERS * scorch.y;
    vec3 shifted = p / cell +
      (float(slot) + seed) * SCORCH_SLOT_SHIFT_CELLS;
    float noise = 0.65 * valueNoiseInCells(shifted) +
      0.35 * valueNoiseInCells(2.0 * shifted);
    float centre = clustering * (1.0 - smoothstep(
      0.0,
      SCORCH_CENTRE_METERS,
      length(p.xz)
    ));
    float threshold = mix(
      SCORCH_THRESHOLD_RIM,
      SCORCH_THRESHOLD_CENTRE,
      centre
    ) - scorch.w;
    float depth = scorch.x *
      smoothstep(threshold, threshold + SCORCH_SOFTNESS, noise);
    vec3 varied = mix(
      SCORCH_VARIED_BROWN,
      SCORCH_VARIED_GREY,
      valueNoiseInCells(shifted.zxy / 0.7)
    );
    return vec4(mix(SCORCH_COLOR, varied, scorch.z), depth);
  }

  // The displacement of a layer's distance at p, in metres, up to the
  // amplitude, in metres, either way: iq's product of sines, his
  // displacement example, https://iquilezles.org/articles/distfunctions/.
  // It raises the field's gradient by up to the amplitude times
  // IRREGULARITY_WAVES_PER_METER, so it breaks the bound, and the march
  // steps by IRREGULARITY_STEP_FACTOR while any layer has an amplitude.
  float irregularityAt(vec3 p, float amplitudeMeters) {
    vec3 waves = sin(IRREGULARITY_WAVES_PER_METER * p);
    return amplitudeMeters * waves.x * waves.y * waves.z;
  }
`;

/** Gives a kind's semi-axes as a GLSL vec3, in metres. */
function semiAxesOf(kind) {
  // Declared as a function so it is hoisted above the chunk that calls it.
  return `vec3(${kind.semiAxesMeters.map(toGlslFloat).join(", ")})`;
}
