/** #### The GLSL chunk of the topping's field
 * - Needs the primitives chunk, src/sdf/primitives.js, pasted before it,
 *   and the stack's distances, sharp and smoothed, from the layers' chunk,
 *   which the caller passes in.
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
 * - The topping is a shell: the sharp stack is subtracted from it, so the
 *   slice's cut shows the layers inside the coat, and the coat thick in
 *   each channel.
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

  // The coverage at which the cap is full and the skirt starts, unitless.
  const float COVERAGE_TOP = 0.5;
  // The drips' phase round the cake, in radians, so no drip lines up with
  // the slice, which is cut about +X.
  const float DRIP_PHASE_RADIANS = 0.7;
  // The factor on the drip cut-off's term, unitless. The cut-off's height
  // varies round the cake, so its lower face slopes, and the height above
  // a point overestimates the distance to it by up to sqrt(1 + term^2);
  // this keeps the term's gradient at or below 1 for a slope up to 1.98,
  // which src/cake/resolve.js's MAX_DRIP_TERM keeps every recipe below.
  const float DRIP_STEP_FACTOR = 0.45;
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

  // The field of the topping: x is the distance in metres, negative inside
  // it, and y its material id. It takes the point, p, the point in the
  // plane of revolution, q, and the uncut stack's distances, in metres:
  // smoothed, with the layers joined by toppingSkirtBlend(), and sharp.
  //
  // The skirt is the smoothed stack offset outwards by the thickness, iq's
  // opRound, cut off below a height by iq's opIntersection with a
  // half-space, both from https://iquilezles.org/articles/distfunctions/.
  // The cap is the same offset above the topping's base, limited to a
  // rounded cylinder of the cap's radius. The pile is a height field over
  // the cap's top, toppingPileRise(), held to the pile's cylinder and
  // standing on the base, unioned with the cap. The sharp stack is
  // subtracted last.
  vec2 toppingField(vec3 p, vec2 q, float smoothStack, float stack) {
    if (toppingCoverage <= 0.0) {
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
      max(offset, toppingBaseMeters - q.y),
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
      float wave = 0.5 + 0.5 * sin(
        toppingDripWaves * angle + DRIP_PHASE_RADIANS
      );
      float cutOff = max(
        toppingBaseMeters * (1.0 - skirtFraction) -
          toppingDripMeters * skirtFraction * wave,
        0.0
      );
      // The drips break the bound: their factor scales this term alone.
      float term = cutOff - q.y;
      if (toppingDripMeters > 0.0) term *= DRIP_STEP_FACTOR;
      solid = min(solid, max(offset, term));
    }

    return vec2(subtractDistance(stack, solid), MATERIAL_TOPPING);
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
