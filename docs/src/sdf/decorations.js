/**
 * @fileoverview
 * The decorations' signed distance field, as a GLSL chunk: the countable
 * items in their slots and the scattered kind's repeated cell, with the
 * kinds' sizes, embeds and roughnesses templated in from the one table in
 * src/cake/place.js.
 */

import { Color, SRGBColorSpace } from "three";
import {
  boundingRadiusMeters,
  DECORATION_KINDS,
  kindNamed,
  SPRINKLE_PALETTE,
} from "../cake/place.js";
import { DECORATION_SLOTS } from "../cake/slots.js";

/** #### The GLSL chunk of the decorations' field
 * - Needs the primitives chunk, src/sdf/primitives.js, with its hashes,
 *   the topping's chunk, src/sdf/topping.js, and the `stackBoundTopMeters`
 *   uniform declared before it.
 * - decorationsField() returns the distance in metres, negative inside an
 *   item, and its material id: a slot's, `MATERIAL_SLOT_FIRST` plus its
 *   index, 16 to 39, a sprinkle's 48 or a flake's 49. It leaves out the
 *   slot it is given, so a ray refracted into a translucent item can
 *   march to the part beneath.
 * - Each item stands on toppingSurfaceHeight() at its radius, less its
 *   embed, so it rides the topping as it moves, raised by its animated
 *   offset.
 * - decorationAlbedoOf() and decorationRoughnessOf() map a decoration's
 *   material id to its surface; a sprinkle's colour is found again from
 *   the point, by its cell's hash.
 */
export const decorationsChunk = /* glsl */ `
  uniform vec3 decorationColors[${DECORATION_SLOTS}];
  uniform int decorationCount;
  uniform float decorationEmbedsMeters[${DECORATION_SLOTS}];
  uniform float decorationKinds[${DECORATION_SLOTS}];
  uniform vec3 decorationOffsets[${DECORATION_SLOTS}];
  uniform float decorationRoughnesses[${DECORATION_SLOTS}];
  uniform mat3 decorationRotations[${DECORATION_SLOTS}];
  uniform float decorationScales[${DECORATION_SLOTS}];
  uniform float scatterCellMeters;
  uniform vec3 scatterColor;
  uniform float scatterKind;
  uniform float scatterOffsetMeters;
  uniform float scatterScale;

  const int DECORATION_SLOTS = ${DECORATION_SLOTS};
  // How far outside the decorations' slab a point must lie for them to be
  // skipped, in metres: ten times the march's surface epsilon, so the
  // slab's own faces never count as a hit.
  const float DECORATION_SLAB_SKIP_METERS = 0.001;
  // How far below the topping's base the decorations' slab reaches, in
  // metres: past it, a sinking item is inside the cake and is not drawn.
  const float DECORATION_SLAB_BELOW_METERS = 0.01;
  // The materials: a slot's id is MATERIAL_SLOT_FIRST plus its index.
  const float MATERIAL_FLAKE = 49.0;
  const float MATERIAL_SLOT_FIRST = 16.0;
  const float MATERIAL_SPRINKLE = 48.0;
  // A shift of the cell indices, in cells, so they hash as unsigned
  // integers, never negative.
  const float SCATTER_CELL_SHIFT = 1024.0;
  // How far a scattered item may sit from its cell's centre, as a fraction
  // of the cell along each axis, unitless.
  const float SCATTER_JITTER = 0.4;
  // How far, in cells, any item in a cell outside the 2 x 2 checked lies
  // from the point, before its reach: the point lies at least half a cell
  // inside the checked block, and an item at least 0.5 - SCATTER_JITTER
  // of a cell inside its own. The field is clamped to it, so the 2 x 2
  // check never overestimates and needs no step factor.
  const float SCATTER_UNCHECKED_CELLS = 1.0 - SCATTER_JITTER;
  const int SPRINKLE_COLOR_COUNT = ${SPRINKLE_PALETTE.length};
  const int SPRINKLE_KIND = ${kindNamed("sprinkle").id};

  // The kinds' numbers, indexed by kind id, from src/cake/place.js; row 0
  // is no kind. Half heights and reaches, the radius of the bounding
  // sphere, are in metres at scale 1; embeds, translucencies and varies
  // unitless; tilts in radians.
  ${kindArray("DECORATION_EMBEDS", (kind) => kind.embed)}
  ${kindArray("DECORATION_HALF_HEIGHTS_METERS", halfHeightOf)}
  ${kindArray("DECORATION_REACHES_METERS", boundingRadiusMeters)}
  ${kindArray("DECORATION_ROUGHNESSES", (kind) => kind.roughness)}
  ${kindArray("DECORATION_TILTS_RADIANS", (kind) => kind.tiltRadians)}
  ${kindArray("DECORATION_TRANSLUCENCIES", (kind) => kind.translucency ?? 0)}
  ${kindArray("DECORATION_VARIES", (kind) => kind.vary)}
  // The sprinkles' colours, SPRINKLE_PALETTE in linear space.
  const vec3 SPRINKLE_COLORS[${SPRINKLE_PALETTE.length}] = vec3[](
    ${SPRINKLE_PALETTE.map(linearColorOf).join(",\n    ")}
  );

  // The distance to a kind's item at scale 1, centred on the origin and
  // upright, its own axes the world's, in metres.
  float decorationKindDistance(int kind, vec3 p) {
    ${DECORATION_KINDS.map(kindDistanceLine).join("\n    ")}
    return NO_SURFACE_METERS;
  }

  // A 2D vector turned by an angle, in radians, anticlockwise.
  vec2 turnVector(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }

  // The nearest scattered item to p, after iq's domain repetition,
  // https://iquilezles.org/articles/sdfrepetition/: x its distance in
  // metres, y its colour's draw, 0 to 1. The grid's cells are
  // scatterCellMeters square in x and z, each holding one item jittered by
  // up to SCATTER_JITTER of a cell, and the cell p lies in and its nearest
  // neighbours on each axis are checked, four cells. An item is drawn
  // only where it lies wholly within the cap's flat, where
  // toppingSurfaceHeight() is exact. Its rotation is the yaw about Y after
  // the tilts about X and then Z, as src/cake/place.js builds a slot's, so
  // the point is turned back by the yaw, then the tilts.
  vec2 scatterNearest(vec3 p) {
    int kind = int(scatterKind + 0.5);
    float cell = scatterCellMeters;
    float capRadius = toppingCapRadius();
    float flatRadius = capRadius - toppingCapRounding(capRadius);
    float vary = DECORATION_VARIES[kind];
    float greatestScale = scatterScale * (1.0 + vary);
    float reach = DECORATION_REACHES_METERS[kind] * greatestScale;

    // Every item lies within the flat's radius of the axis, and every item
    // in an unchecked cell lies SCATTER_UNCHECKED_CELLS of a cell away.
    float outside = length(p.xz) - flatRadius;
    float unchecked = SCATTER_UNCHECKED_CELLS * cell - reach;
    if (outside >= unchecked) return vec2(outside, 0.0);

    vec2 inCells = p.xz / cell;
    vec2 base = floor(inCells);
    vec2 side = 2.0 * step(0.5, inCells - base) - 1.0;
    vec2 nearest = vec2(unchecked, 0.0);
    for (int i = 0; i < 4; i++) {
      vec2 id = base + vec2(float(i & 1), float(i >> 1)) * side;
      uvec2 key = uvec2(id + SCATTER_CELL_SHIFT);
      uint hash = lowbias32(key.x + lowbias32(key.y));
      vec2 jitter = vec2(unitOfHash(hash), unitOfHash(nextHash(hash)));
      vec2 centre = (id + 0.5 + SCATTER_JITTER * (2.0 * jitter - 1.0)) * cell;
      float radius = length(centre);
      if (radius + reach > flatRadius) continue;

      hash = nextHash(nextHash(hash));
      float scale = scatterScale *
        (1.0 + vary * (2.0 * unitOfHash(hash) - 1.0));
      hash = nextHash(hash);
      float yaw = 2.0 * PI * unitOfHash(hash);
      hash = nextHash(hash);
      float tilt = DECORATION_TILTS_RADIANS[kind];
      float tiltX = tilt * (2.0 * unitOfHash(hash) - 1.0);
      hash = nextHash(hash);
      float tiltZ = tilt * (2.0 * unitOfHash(hash) - 1.0);
      hash = nextHash(hash);

      float halfHeight = DECORATION_HALF_HEIGHTS_METERS[kind] * scale;
      float y = toppingSurfaceHeight(radius) -
        DECORATION_EMBEDS[kind] * 2.0 * halfHeight + halfHeight +
        scatterOffsetMeters;
      vec3 local = p - vec3(centre.x, y, centre.y);
      local.xz = turnVector(local.xz, yaw);
      local.yz = turnVector(local.yz, -tiltX);
      local.xy = turnVector(local.xy, -tiltZ);
      float d = decorationKindDistance(kind, local / scale) * scale;
      if (d < nearest.x) nearest = vec2(d, unitOfHash(hash));
    }
    nearest.x = max(nearest.x, outside);
    return nearest;
  }

  // The field of the decorations: x is the distance in metres, negative
  // inside an item, and y its material id. They are evaluated only within
  // a slab from DECORATION_SLAB_BELOW_METERS below the topping's base up
  // to stackBoundTopMeters, and outside it the field is the distance to
  // the slab. Each slot is skipped where its bounding sphere, or first its
  // bounding cylinder, is no nearer than the nearest item so far, so the
  // field is that of every item evaluated. A slot's point is turned into
  // the item's frame by the transpose of its rotation, p * M in GLSL, and
  // its scale, uniform, multiplies the distance back. The slot hiddenSlot
  // is left out; any number outside 0 to DECORATION_SLOTS - 1 hides none.
  vec2 decorationsField(vec3 p, int hiddenSlot) {
    float slab = max(
      toppingBaseMeters - DECORATION_SLAB_BELOW_METERS - p.y,
      p.y - stackBoundTopMeters
    );
    if (slab > DECORATION_SLAB_SKIP_METERS) {
      return vec2(slab, MATERIAL_SLOT_FIRST);
    }

    vec2 nearest = vec2(NO_SURFACE_METERS, MATERIAL_SLOT_FIRST);
    for (int i = 0; i < DECORATION_SLOTS; i++) {
      if (i >= decorationCount) break;
      float scale = decorationScales[i];
      if (scale <= 0.0 || i == hiddenSlot) continue;
      int kind = int(decorationKinds[i] + 0.5);
      vec3 offset = decorationOffsets[i];
      float reach = DECORATION_REACHES_METERS[kind] * scale;
      if (length(p.xz - offset.xz) - reach >= nearest.x) continue;

      float halfHeight = DECORATION_HALF_HEIGHTS_METERS[kind] * scale;
      vec3 centre = vec3(
        offset.x,
        toppingSurfaceHeight(length(offset.xz)) - decorationEmbedsMeters[i] +
          halfHeight + offset.y,
        offset.z
      );
      vec3 toPoint = p - centre;
      if (length(toPoint) - reach >= nearest.x) continue;
      float d = decorationKindDistance(
        kind,
        toPoint * decorationRotations[i] / scale
      ) * scale;
      if (d < nearest.x) nearest = vec2(d, MATERIAL_SLOT_FIRST + float(i));
    }

    if (scatterKind > 0.5 && scatterScale > 0.0) {
      float d = scatterNearest(p).x;
      if (d < nearest.x) {
        float material = int(scatterKind + 0.5) == SPRINKLE_KIND
          ? MATERIAL_SPRINKLE
          : MATERIAL_FLAKE;
        nearest = vec2(d, material);
      }
    }
    return nearest;
  }

  // A decoration's albedo, from its material id and the point hit: a
  // slot's colour, a sprinkle's by its cell's hash, or the flakes'.
  vec3 decorationAlbedoOf(float materialId, vec3 point) {
    if (materialId < MATERIAL_SPRINKLE - 0.5) {
      return decorationColors[int(materialId - MATERIAL_SLOT_FIRST + 0.5)];
    }
    if (materialId < MATERIAL_FLAKE - 0.5) {
      int index = int(
        scatterNearest(point).y * float(SPRINKLE_COLOR_COUNT)
      );
      return SPRINKLE_COLORS[min(index, SPRINKLE_COLOR_COUNT - 1)];
    }
    return scatterColor;
  }

  // A decoration's roughness, from its material id: a slot's own, or the
  // scattered kind's.
  float decorationRoughnessOf(float materialId) {
    if (materialId < MATERIAL_SPRINKLE - 0.5) {
      return decorationRoughnesses[
        int(materialId - MATERIAL_SLOT_FIRST + 0.5)
      ];
    }
    return DECORATION_ROUGHNESSES[int(scatterKind + 0.5)];
  }
`;

/** #### Declares a GLSL const float array of one number per kind
 * - Indexed by kind id, so row 0, no kind, is 0.
 */
function kindArray(name, numberOf) {
  // Declared as a function so it is hoisted above the chunk that calls it.
  const values = [0, ...DECORATION_KINDS.map(numberOf)].map(toGlslFloat);
  return (
    `const float ${name}[${values.length}] = float[](\n` +
    `    ${values.join(", ")}\n  );`
  );
}

/** Gives a kind's half height at scale 1, in metres. */
function halfHeightOf(kind) {
  return 0.5 * kind.sizeMeters[1];
}

/** Gives the GLSL line that returns a kind's distance at scale 1. */
function kindDistanceLine(kind) {
  const [x, y, z] = kind.sizeMeters.map((size) => toGlslFloat(0.5 * size));
  const [length, thickness] = kind.sizeMeters;
  // A capsule lies along x: its segment runs the length less its two caps.
  const segment = toGlslFloat(length - thickness);
  const halfSegment = toGlslFloat(0.5 * (length - thickness));
  const expressions = {
    box: `boxDistance(p, vec3(${x}, ${y}, ${z}))`,
    capsule:
      `verticalCapsuleDistance(vec3(p.y, p.x + ${halfSegment}, p.z), ` +
      `${segment}, ${y})`,
    cylinder: `cappedCylinderDistance(p, ${y}, ${x})`,
    ellipsoid: `ellipsoidDistance(p, vec3(${x}, ${y}, ${z}))`,
    sphere: `sphereDistance(p, ${x})`,
  };
  return `if (kind == ${kind.id}) return ${expressions[kind.primitive]};`;
}

/** Gives an sRGB `#rrggbb` colour as a GLSL vec3 in linear space. */
export function linearColorOf(hex) {
  const color = new Color().setStyle(hex, SRGBColorSpace);
  return `vec3(${[color.r, color.g, color.b].map(toGlslFloat).join(", ")})`;
}

/** Writes a number as a GLSL float literal, with a decimal point. */
export function toGlslFloat(value) {
  const text = String(Number(value.toPrecision(6)));
  return text.includes(".") || text.includes("e") ? text : `${text}.0`;
}
