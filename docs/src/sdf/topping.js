import {
  DRIP_SWELL,
  DRIP_SWELL_WAVES,
  DRIP_WARP_RADIANS,
  DRIP_WARP_WAVES,
} from "../cake/resolve.js";
import { toGlslFloat } from "./decorations.js";

/** #### The GLSL chunk of the topping's field
 * - Needs the primitives chunk, src/sdf/primitives.js, and the layers'
 *   chunk, src/sdf/layers.js, pasted before it, and the smoothed stack's
 *   distance, from layersField(), which the caller passes in.
 * - toppingSkirtBlend() gives the blend, in metres, the caller's layer
 *   walk smooths the stack with.
 * - One coverage, 0 to 1, places the topping: below `COVERAGE_TOP` a
 *   dollop that grows from the crown's centre into a full cap, and above
 *   it a skirt that runs down the sides to the plate, with drips where
 *   the recipe gives them an amplitude. At coverage 0 or less nothing
 *   draws.
 * - The cap and the skirt are cut from one surface, the smoothed stack
 *   grown by the thickness, so they meet with no groove, nothing jumps as
 *   the skirt starts, and the coat runs thick over the channels between
 *   layers, leaving a slight dip. A pile, a smooth bump whose slope falls
 *   to 0 at its rim, rises from the cap's top.
 * - The topping is a shell: copies of the layers without their holes or
 *   irregularity, drawn in a little and overlapping at their seams, are
 *   subtracted from it, so the slice's cut shows the layers inside the
 *   coat, the coat thick in each channel, and the topping only a little
 *   way into the outermost and topmost holes, never filling every one.
 * - toppingField() returns the distance in metres, negative inside the
 *   topping, and its material id, `MATERIAL_TOPPING`.
 * - toppingSurfaceHeight() returns the height of the topping's top at a
 *   radius, in metres, for the decorations: exact over the cap's flat and
 *   the pile.
 */
export const toppingChunk = /* glsl */ `
  uniform float toppingBaseMeters;
  uniform vec3 toppingColor;
  uniform float toppingCoverage;
  uniform float toppingDripMeters;
  uniform float toppingDripWaves;
  uniform float toppingPileMeters;
  uniform float toppingRadiusMeters;
  uniform float toppingRoughness;
  uniform float toppingRoundingMeters;
  uniform float toppingThicknessMeters;
  uniform float toppingTranslucency;
  // Above 0.5 for an invisible topping, which draws nothing but still
  // gives the scattered decorations its cap to sit on.
  uniform float toppingInvisible;

  // How far below the stack's top the carving copies stop, in metres, so
  // the topping sinks a little into the topmost layer's holes.
  const float CARVE_DIP_METERS = 0.0015;
  // The topping's distance beyond which the carve is not read, in metres:
  // the carve only raises the distance, so the uncarved one is a lower
  // bound there, and lies too far from the surface to stop the march.
  const float CARVE_GATE_METERS = 0.001;
  // How far the carving copies' radii are drawn in, in metres, so the
  // topping fills the outermost holes a little.
  const float CARVE_INSET_METERS = 0.0015;
  // How far each carving copy reaches below its layer's bottom, in metres,
  // so it overlaps the copy beneath and no topping shows at the seam.
  const float CARVE_SEAM_METERS = 0.002;
  // The coverage at which the cap is full and the skirt starts, unitless.
  const float COVERAGE_TOP = 0.5;
  // The drips' phase round the cake, in radians, so no drip lines up with
  // the slice, which is cut about +X.
  const float DRIP_PHASE_RADIANS = 0.7;
  // The drips' irregularity, from src/cake/resolve.js: a warp of their
  // phase, in radians, and a swell of their length, unitless, each with
  // its waves round the cake.
  const float DRIP_SWELL = ${toGlslFloat(DRIP_SWELL)};
  const float DRIP_SWELL_WAVES = ${toGlslFloat(DRIP_SWELL_WAVES)};
  const float DRIP_WARP_RADIANS = ${toGlslFloat(DRIP_WARP_RADIANS)};
  const float DRIP_WARP_WAVES = ${toGlslFloat(DRIP_WARP_WAVES)};
  // The fraction of the crown's radius taken as the least radius a drip
  // ends on, unitless, below every recipe's least layer radius less its
  // rounding over its crown radius, so the step factor is never too
  // large.
  const float DRIP_RADIUS_FRACTION = 0.9;
  // The topping's material id: the first after the plate's, 7.
  const float MATERIAL_TOPPING = 8.0;
  // The steepest slope of the pile's profile, (1 - u^2)^2 over u from 0 to
  // 1, unitless: 8 / (3 sqrt(3)), at u = 1 / sqrt(3), times the pile's
  // height over its radius.
  const float PILE_PEAK_SLOPE = 1.5396;
  // The pile's radius as a fraction of the cap's, unitless.
  const float PILE_RADIUS_FRACTION = 0.8;
  // The least blend the stack is smoothed with, in metres, so the smooth
  // minimum's blend stays above 0 for a topping of no thickness.
  const float SKIRT_BLEND_MIN_METERS = 0.0001;
  // The width of the fillet that fills the channel between neighbouring
  // layers' rounded edges before the coat is grown, as a multiple of the
  // thickness, unitless. Measured in a port of the coat's profile, a blend
  // equal to the thickness halves the steepest slope across each channel,
  // to 0.10 to 0.14, against a fixed 4 mm, leaving a dip of 0.3 mm or
  // less; a wider blend raises a ridge either side of it.
  const float SKIRT_BLEND_PER_THICKNESS = 1.0;

  // The cap's fraction of its full radius, 0 to 1, from the coverage.
  float toppingCapFraction() {
    return clamp(toppingCoverage / COVERAGE_TOP, 0.0, 1.0);
  }

  // The cap's radius from the axis, in metres.
  float toppingCapRadius() {
    return toppingCapFraction() *
      (toppingRadiusMeters + toppingThicknessMeters);
  }

  // The rounding of the cap's top edge, in metres: the least of the
  // recipe's rounding, half the thickness and the cap's radius.
  float toppingCapRounding(float capRadius) {
    return min(
      min(toppingRoundingMeters, 0.5 * toppingThicknessMeters),
      capRadius
    );
  }

  // The pile's radius, in metres: PILE_RADIUS_FRACTION of the cap's, held
  // within the cap's flat top, which a small dollop's rounding narrows, so
  // the pile's rim never stands past the rounded edge.
  float toppingPileRadius(float capRadius) {
    return min(
      PILE_RADIUS_FRACTION * capRadius,
      capRadius - toppingCapRounding(capRadius)
    );
  }

  // The pile's height above the cap's top at a radius, in metres:
  // h (1 - u^2)^2, u the radius over the pile's, so its slope falls to 0 at
  // the centre and at the rim, where it meets the cap's flat top with no
  // crease. The peak, h, scales with the pile's radius, which keeps the
  // slope the same at every coverage. 0 at and beyond the rim.
  float toppingPileRise(float radius, float pileRadius) {
    if (pileRadius <= 0.0 || radius >= pileRadius) return 0.0;
    float across = radius / pileRadius;
    float fall = 1.0 - across * across;
    float peak = toppingPileMeters * pileRadius /
      (PILE_RADIUS_FRACTION * (toppingRadiusMeters + toppingThicknessMeters));
    return peak * fall * fall;
  }

  // The blend the stack is smoothed with before the coat is grown from it,
  // in metres: SKIRT_BLEND_PER_THICKNESS times the thickness, and never
  // below SKIRT_BLEND_MIN_METERS.
  float toppingSkirtBlend() {
    return max(
      SKIRT_BLEND_PER_THICKNESS * toppingThicknessMeters,
      SKIRT_BLEND_MIN_METERS
    );
  }

  // The distance to the solid the topping is carved by, in metres,
  // negative inside it: each used layer's rounded cone, without its holes
  // or irregularity, its radii drawn in by CARVE_INSET_METERS and its
  // bottom lowered by CARVE_SEAM_METERS, all cut off CARVE_DIP_METERS below
  // the topping's base. A union of exact distances cut by a half-space,
  // iq's opUnion and opIntersection,
  // https://iquilezles.org/articles/distfunctions/, so a bound.
  float toppingCarveDistance(vec2 q) {
    float carve = NO_SURFACE_METERS;
    for (int slot = 0; slot < LAYER_SLOTS; slot++) {
      float height = layerHeightsMeters[slot];
      if (height <= 0.0) continue;
      float halfHeight = 0.5 * (height + CARVE_SEAM_METERS);
      float bottomRadius =
        max(layerBottomRadiiMeters[slot] - CARVE_INSET_METERS, 0.0);
      float topRadius =
        max(layerTopRadiiMeters[slot] - CARVE_INSET_METERS, 0.0);
      float center = layerBottomsMeters[slot] - CARVE_SEAM_METERS +
        halfHeight;
      carve = min(carve, roundedCappedConeDistance(
        q - vec2(0.0, center),
        bottomRadius,
        halfHeight,
        min(layerRoundingsMeters[slot], min(bottomRadius, topRadius)),
        topRadius
      ));
    }
    return max(carve, q.y - (toppingBaseMeters - CARVE_DIP_METERS));
  }

  // The field of the topping: x is the distance in metres, negative inside
  // it, and y its material id. It takes the point, p, the point in the
  // plane of revolution, q, and the uncut stack's smoothed distance, in
  // metres, the layers joined by toppingSkirtBlend().
  //
  // The skirt is the smoothed stack offset outwards by the thickness, iq's
  // opRound, cut off below a height by iq's opIntersection with a
  // half-space, both from https://iquilezles.org/articles/distfunctions/.
  // The cap is the same offset above the topping's base, limited to a
  // rounded cylinder of the cap's radius. The pile is a height field over
  // the cap's top, toppingPileRise(), held to the pile's cylinder and
  // standing on the base, unioned with the cap. The cap's floor lies
  // CARVE_DIP_METERS below the base, so it reaches into the top layer's
  // holes. toppingCarveDistance() is subtracted last.
  vec2 toppingField(vec3 p, vec2 q, float smoothStack) {
    if (toppingCoverage <= 0.0 || toppingInvisible > 0.5) {
      return vec2(NO_SURFACE_METERS, MATERIAL_TOPPING);
    }
    float capRadius = toppingCapRadius();
    float capTop = toppingBaseMeters + toppingThicknessMeters;
    float offset = smoothStack - toppingThicknessMeters;

    // The cylinder's top lies on the offset's flat top, so only its
    // radius and its rounded top edge limit the cap.
    float capRounding = toppingCapRounding(capRadius);
    float cylinder = roundedCylinderDistance(
      vec3(q.x, q.y - toppingBaseMeters, 0.0),
      toppingThicknessMeters,
      capRadius,
      capRounding
    );
    float solid = max(
      max(offset, toppingBaseMeters - CARVE_DIP_METERS - q.y),
      cylinder
    );

    float pileRadius = toppingPileRadius(capRadius);
    if (toppingPileMeters > 0.0 && pileRadius > 0.0) {
      // A height field's height above its surface overestimates the
      // distance by up to sqrt(1 + slope^2), so this term alone is scaled
      // by the inverse, a step factor below 1: about 0.997 for the Black
      // Forest's pile and 0.91 for the custard pie's.
      float slope = PILE_PEAK_SLOPE * toppingPileMeters /
        (PILE_RADIUS_FRACTION * (toppingRadiusMeters + toppingThicknessMeters));
      float above = (q.y - capTop - toppingPileRise(q.x, pileRadius)) *
        inversesqrt(1.0 + slope * slope);
      float pile = max(
        max(above, q.x - pileRadius),
        toppingBaseMeters - q.y
      );
      solid = min(solid, pile);
    }

    float skirtFraction = max(
      (toppingCoverage - COVERAGE_TOP) / (1.0 - COVERAGE_TOP),
      0.0
    );
    if (skirtFraction > 0.0) {
      float angle = atan(p.z, p.x);
      // Each drip's place is warped and its length swollen round the
      // cake, so no two drips match.
      float warp = DRIP_WARP_RADIANS * sin(DRIP_WARP_WAVES * angle);
      float swell = 1.0 - DRIP_SWELL *
        (0.5 + 0.5 * sin(DRIP_SWELL_WAVES * angle + 2.0));
      float wave = swell * (0.5 + 0.5 * sin(
        toppingDripWaves * angle + DRIP_PHASE_RADIANS + warp
      ));
      float cutOff = max(
        toppingBaseMeters * (1.0 - skirtFraction) -
          toppingDripMeters * skirtFraction * wave,
        0.0
      );
      // The drips break the bound: the cut-off's height above a point
      // overestimates the distance to its sloping face by up to
      // sqrt(1 + slope^2), so this term alone is scaled by the inverse, the
      // slope as src/cake/resolve.js's dripTermOf() gives it.
      float term = cutOff - q.y;
      if (toppingDripMeters > 0.0) {
        float slope = 0.5 * toppingDripMeters * skirtFraction * (
          toppingDripWaves +
          DRIP_WARP_RADIANS * DRIP_WARP_WAVES +
          DRIP_SWELL * DRIP_SWELL_WAVES
        ) / (DRIP_RADIUS_FRACTION * toppingRadiusMeters);
        term *= inversesqrt(1.0 + slope * slope);
      }
      solid = min(solid, max(offset, term));
    }

    if (solid > CARVE_GATE_METERS) return vec2(solid, MATERIAL_TOPPING);
    return vec2(
      subtractDistance(toppingCarveDistance(q), solid),
      MATERIAL_TOPPING
    );
  }

  // The height of the topping's top at a radius from the axis, in metres:
  // the cap's top raised by the pile, and the base beyond the cap. Exact
  // over the pile and the cap's flat; past the flat the cap's rim falls,
  // which this ignores.
  float toppingSurfaceHeight(float radius) {
    float capRadius = toppingCapRadius();
    if (toppingCoverage <= 0.0 || radius > capRadius) {
      return toppingBaseMeters;
    }
    return toppingBaseMeters + toppingThicknessMeters +
      toppingPileRise(radius, toppingPileRadius(capRadius));
  }
`;
