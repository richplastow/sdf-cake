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
 *   index, 16 to 39, a sprinkle's 48, a flake's 49, a candle's wick's
 *   `MATERIAL_WICK_FIRST` plus its slot, 64 to 87, or its flame's
 *   `MATERIAL_FLAME_FIRST` plus its slot, 96 to 119. It leaves out the
 *   slot it is given, so a ray refracted into a translucent item can
 *   march to the part beneath.
 * - Each item stands on toppingSurfaceHeight() at its radius, less its
 *   embed, so it rides the topping as it moves, raised by its animated
 *   offset: a slot's own, or for a scattered item the shower's, at the
 *   item's own hashed cue, so the scatter falls and sinks as a shower. It
 *   rides the wonky top too: a slot's offset holds its top offset, placed
 *   by src/cake/place.js, and a scattered item adds its cell's,
 *   layerStackTopOffsetAt() at its centre.
 * - decorationAlbedoOf() and decorationRoughnessOf() map a decoration's
 *   material id to its surface; a sprinkle's colour is found again from
 *   the point, by its cell's hash.
 * - A candle carries a wick and a flame in its own frame, so they tilt
 *   with it. The flame, an emissive ellipsoid that lights nothing,
 *   flickers on its slot's own hashed timeline from `flameSeconds`, and
 *   flameRadianceAt() gives the light it emits.
 */
export const decorationsChunk = /* glsl */ `
  uniform vec3 decorationColors[${DECORATION_SLOTS}];
  uniform int decorationCount;
  uniform float decorationEmbedsMeters[${DECORATION_SLOTS}];
  uniform float decorationKinds[${DECORATION_SLOTS}];
  // x, the animated height offset and z, in metres, and the flame, 0 out
  // to 1 lit.
  uniform vec4 decorationOffsets[${DECORATION_SLOTS}];
  uniform float decorationRoughnesses[${DECORATION_SLOTS}];
  uniform mat3 decorationRotations[${DECORATION_SLOTS}];
  uniform float decorationScales[${DECORATION_SLOTS}];
  uniform float flameSeconds; // the flicker clock, in seconds
  uniform float scatterCellMeters;
  uniform vec3 scatterColor;
  uniform float scatterKind;
  uniform float scatterScale;
  // The scatter's shower: x its clock and y its cues' spread, both in one
  // item's fall or sink, z its phase, 1 dropping, -1 sinking and 0 at
  // rest, and w its reach in metres, the drop's height or the sink's
  // depth.
  uniform vec4 scatterShower;

  const int DECORATION_SLOTS = ${DECORATION_SLOTS};
  // How far outside the decorations' slab a point must lie for them to be
  // skipped, in metres: ten times the march's surface epsilon, so the
  // slab's own faces never count as a hit.
  const float DECORATION_SLAB_SKIP_METERS = 0.001;
  // How far below the topping's base the decorations' slab reaches, in
  // metres: past it, a sinking item is inside the cake and is not drawn.
  const float DECORATION_SLAB_BELOW_METERS = 0.01;
  // The materials: a slot's id is MATERIAL_SLOT_FIRST plus its index, and
  // a candle's wick's and flame's are MATERIAL_WICK_FIRST and
  // MATERIAL_FLAME_FIRST plus its slot, above the inclusions' 50 to 52.
  const float MATERIAL_FLAKE = 49.0;
  const float MATERIAL_FLAME_FIRST = 96.0;
  const float MATERIAL_SLOT_FIRST = 16.0;
  const float MATERIAL_SPRINKLE = 48.0;
  const float MATERIAL_WICK_FIRST = 64.0;
  const int CANDLE_KIND = ${kindNamed("candle").id};
  // The candle's half height at scale 1, in metres, where its wick stands.
  const float CANDLE_HALF_HEIGHT_METERS = ${toGlslFloat(
    halfHeightOf(kindNamed("candle")),
  )};
  // The wick: a black capped cylinder on the candle's top, in metres.
  const float WICK_HEIGHT_METERS = 0.006;
  const float WICK_RADIUS_METERS = 0.0005;
  const float WICK_ROUGHNESS = 0.9;
  const vec3 WICK_COLOR = ${linearColorOf("#1a1410")};
  // The flame: an ellipsoid on the wick's top, its semi-axes in metres at
  // full flame, and the light it emits, linear, before tone mapping, from
  // its base's colour to its tip's. First guesses, to tune by eye.
  const float FLAME_HALF_HEIGHT_METERS = 0.006;
  const float FLAME_RADIANCE = 2.5;
  const float FLAME_RADIUS_METERS = 0.0025;
  const vec3 FLAME_BASE_COLOR = ${linearColorOf("#fff3c4")};
  const vec3 FLAME_TIP_COLOR = ${linearColorOf("#ff8c1a")};
  // The flicker: a shimmer in height of FLICKER_AMPLITUDE, unitless, at
  // FLICKER_RATE_HERTZ, less a brief dip of GUTTER_DEPTH, unitless, about
  // every cycle at GUTTER_RATE_HERTZ, sharpened by GUTTER_SHARPNESS, a
  // power, and a sway of FLAME_SWAY_METERS. Each slot's rate varies by up
  // to FLICKER_RATE_VARY either way, unitless.
  const float FLAME_SWAY_METERS = 0.0012;
  const float FLICKER_AMPLITUDE = 0.12;
  const float FLICKER_RATE_HERTZ = 9.0;
  const float FLICKER_RATE_VARY = 0.15;
  const float GUTTER_DEPTH = 0.35;
  const float GUTTER_RATE_HERTZ = 1.3;
  const float GUTTER_SHARPNESS = 8.0;
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
  // the point is turned back by the yaw, then the tilts. Each item draws
  // its cue, 0 to 1, after its colour, and moves in the shower from
  // scatterShower.x - cue * scatterShower.y, its own progress: dropping,
  // it is not drawn before 0, then falls from the reach, eased in;
  // sinking, it sinks the reach below its rest, eased out, shrinking to
  // scale 0, when it is not drawn. stepItem() in src/motion/cake-motion.js
  // moves a slot's item by the same curves. Each item stands on the wonky
  // top, raised by layerStackTopOffsetAt() at its centre.
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
      float cue = unitOfHash(nextHash(hash));

      float progress = scatterShower.x - cue * scatterShower.y;
      if (scatterShower.z > 0.0 && progress < 0.0) continue;
      progress = clamp(progress, 0.0, 1.0);
      float offset = 0.0;
      if (scatterShower.z > 0.0) {
        offset = scatterShower.w * (1.0 - progress * progress);
      } else if (scatterShower.z < 0.0) {
        float left = 1.0 - progress;
        offset = -scatterShower.w * (1.0 - left * left);
        scale *= 1.0 - progress * progress;
        if (scale <= 0.0) continue;
      }

      float halfHeight = DECORATION_HALF_HEIGHTS_METERS[kind] * scale;
      float y = toppingSurfaceHeight(radius) +
        layerStackTopOffsetAt(centre) -
        DECORATION_EMBEDS[kind] * 2.0 * halfHeight + halfHeight + offset;
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

  // A slot's item's centre, in metres: on toppingSurfaceHeight() at its
  // radius, less its embed, raised by its offset, its animated offset and
  // its wonky top offset, which writeCakeUniforms() adds together.
  vec3 decorationCenterOf(int slot, int kind, float scale) {
    vec4 offset = decorationOffsets[slot];
    float halfHeight = DECORATION_HALF_HEIGHTS_METERS[kind] * scale;
    return vec3(
      offset.x,
      toppingSurfaceHeight(length(offset.xz)) - decorationEmbedsMeters[slot] +
        halfHeight + offset.y,
      offset.z
    );
  }

  // A candle's flame in its frame at scale 1: xyz its centre and w its
  // half height, both in metres; its radius is FLAME_RADIUS_METERS times
  // the flame, and its base stays on the wick's top. Its phase and rate
  // come from lowbias32() of the slot, so no two flicker together, and
  // every axis scales by the flame, 0 out to 1 lit.
  vec4 flameShapeOf(int slot, float flame) {
    uint hash = lowbias32(uint(slot) + 1u);
    float phase = 2.0 * PI * unitOfHash(hash);
    float rate = 1.0 + FLICKER_RATE_VARY *
      (2.0 * unitOfHash(nextHash(hash)) - 1.0);
    float seconds = flameSeconds * rate;
    float flicker = 2.0 * PI * FLICKER_RATE_HERTZ * seconds + phase;
    float gutter = 2.0 * PI * GUTTER_RATE_HERTZ * seconds + phase;
    float height = 1.0 + FLICKER_AMPLITUDE * sin(flicker) -
      GUTTER_DEPTH * pow(max(sin(gutter), 0.0), GUTTER_SHARPNESS);
    float halfHeight = FLAME_HALF_HEIGHT_METERS * height * flame;
    return vec4(
      FLAME_SWAY_METERS * cos(flicker),
      CANDLE_HALF_HEIGHT_METERS + WICK_HEIGHT_METERS + halfHeight,
      FLAME_SWAY_METERS * cos(gutter),
      halfHeight
    );
  }

  // The nearest of a candle's wick and flame to p, in its frame at scale
  // 1: x the distance in metres and y the material id. A flame at 0 is
  // skipped and costs nothing.
  vec2 candleCrownDistance(vec3 p, int slot, float flame) {
    vec3 wickPoint = p -
      vec3(0.0, CANDLE_HALF_HEIGHT_METERS + 0.5 * WICK_HEIGHT_METERS, 0.0);
    vec2 nearest = vec2(
      cappedCylinderDistance(
        wickPoint,
        0.5 * WICK_HEIGHT_METERS,
        WICK_RADIUS_METERS
      ),
      MATERIAL_WICK_FIRST + float(slot)
    );
    if (flame <= 0.0) return nearest;
    vec4 shape = flameShapeOf(slot, flame);
    float radius = FLAME_RADIUS_METERS * flame;
    float d = ellipsoidDistance(
      p - shape.xyz,
      vec3(radius, shape.w, radius)
    );
    if (d < nearest.x) nearest = vec2(d, MATERIAL_FLAME_FIRST + float(slot));
    return nearest;
  }

  // The light a flame emits at the point hit, linear, before tone mapping:
  // FLAME_RADIANCE times a mix from its base's colour to its tip's by the
  // point's height in it. It is not shaded and lights nothing.
  vec3 flameRadianceAt(float materialId, vec3 point) {
    int slot = int(materialId - MATERIAL_FLAME_FIRST + 0.5);
    float scale = decorationScales[slot];
    vec3 center = decorationCenterOf(slot, CANDLE_KIND, scale);
    // A flame is hit only at a scale and a flame above 0, and its half
    // height never falls below half its full one, so neither divides by 0.
    vec3 local = (point - center) * decorationRotations[slot] / scale;
    vec4 shape = flameShapeOf(slot, decorationOffsets[slot].w);
    float height = clamp(
      (local.y - shape.y + shape.w) / (2.0 * shape.w),
      0.0,
      1.0
    );
    return FLAME_RADIANCE * mix(FLAME_BASE_COLOR, FLAME_TIP_COLOR, height);
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
  // A shadow ray reads every flame as out, as a flame casts no shadow, and
  // evaluates the items outside the slab too: the soft shadow reads the
  // slab's distance as a near miss of a real caster, which shades lit
  // ground in contours wherever a shadow ray nears the slab's faces.
  vec2 decorationsField(vec3 p, int hiddenSlot, bool isShadowRay) {
    float slab = max(
      toppingBaseMeters - DECORATION_SLAB_BELOW_METERS - p.y,
      p.y - stackBoundTopMeters
    );
    if (!isShadowRay && slab > DECORATION_SLAB_SKIP_METERS) {
      return vec2(slab, MATERIAL_SLOT_FIRST);
    }

    vec2 nearest = vec2(NO_SURFACE_METERS, MATERIAL_SLOT_FIRST);
    for (int i = 0; i < DECORATION_SLOTS; i++) {
      if (i >= decorationCount) break;
      float scale = decorationScales[i];
      if (scale <= 0.0 || i == hiddenSlot) continue;
      int kind = int(decorationKinds[i] + 0.5);
      vec4 offset = decorationOffsets[i];
      float reach = DECORATION_REACHES_METERS[kind] * scale;
      if (length(p.xz - offset.xz) - reach >= nearest.x) continue;

      vec3 toPoint = p - decorationCenterOf(i, kind, scale);
      if (length(toPoint) - reach >= nearest.x) continue;
      vec3 local = toPoint * decorationRotations[i] / scale;
      vec2 item = vec2(
        decorationKindDistance(kind, local),
        MATERIAL_SLOT_FIRST + float(i)
      );
      // A candle's wick and flame need its slot, for the flame and its
      // timeline, so they are drawn here rather than by its kind.
      if (kind == CANDLE_KIND) {
        vec2 crown = candleCrownDistance(
          local,
          i,
          isShadowRay ? 0.0 : offset.w
        );
        if (crown.x < item.x) item = crown;
      }
      item.x *= scale;
      if (item.x < nearest.x) nearest = item;
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
  // flame's base colour, a wick's, a slot's colour, a sprinkle's by its
  // cell's hash, or the flakes'. A flame is only shaded beneath a
  // translucent part; main() gives a direct hit flameRadianceAt().
  vec3 decorationAlbedoOf(float materialId, vec3 point) {
    if (materialId > MATERIAL_FLAME_FIRST - 0.5) return FLAME_BASE_COLOR;
    if (materialId > MATERIAL_WICK_FIRST - 0.5) return WICK_COLOR;
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

  // A decoration's roughness, from its material id: a wick's, which a
  // flame shares, a slot's own, or the scattered kind's.
  float decorationRoughnessOf(float materialId) {
    if (materialId > MATERIAL_WICK_FIRST - 0.5) return WICK_ROUGHNESS;
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
