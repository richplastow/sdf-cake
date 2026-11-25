/**
 * @fileoverview
 * The cake in motion: a damped spring per animated number of the resolved
 * cake, the layers' bottoms following the stack beneath them, the eased
 * slice, the drips withdrawn and run down, and the `values` the uniforms'
 * writer reads, with the topping's footing and the bounding cylinders
 * derived from them every frame. Pure: nothing here imports from `three`,
 * so Node can run it.
 */

import { writeCakeBounds } from "../cake/resolve.js";
import { LAYER_SLOTS } from "../cake/slots.js";
import {
  COLOR_SPRING,
  createSpring,
  LENGTH_SPRING,
  STACK_SPRING,
  stepSpring,
} from "./spring.js";

// How long the drips take to run down once the layers settle, in seconds.
const DRIP_RUN_SECONDS = 0.6;
// How long the drips take to draw back up when a transition starts, in
// seconds.
const DRIP_WITHDRAW_SECONDS = 0.2;
// How tall a slot must be to carry the topping's full footing, in metres:
// half the thinnest layer any recipe holds, so every used layer at rest
// does.
const FOOTING_HEIGHT_METERS = 0.002;
// How wide a slot's top must be, against the footing so far, to carry the
// full footing, unitless: below it a slot takes the radius before it lifts
// the base. Every recipe's layers pass it at rest; the least is 0.976.
const FOOTING_RADIUS_RATIO = 0.9;
// How near its target the coverage must be for the layers to count as
// settled, unitless.
const SETTLE_COVERAGE = 0.005;
// How near its target, in metres, and how slow, in metres per second,
// every length spring must be for the layers to count as settled.
const SETTLE_METERS = 0.0005;
const SETTLE_METERS_PER_SECOND = 0.005;
// How long the slice takes to ease to a new angle, in seconds.
const SLICE_SECONDS = 0.6;

// The sprung numbers of each part, as the resolver names them: lengths on
// the length spring, and surface numbers on the colour spring.
const COLOR_CHANNELS = ["r", "g", "b"];
const LAYER_LENGTH_KEYS = [
  "bottomRadiusMeters",
  "heightMeters",
  "roundingMeters",
  "topRadiusMeters",
];
const LAYER_SURFACE_KEYS = ["roughness"];
const PLATE_LENGTH_KEYS = [
  "baseRadiusMeters",
  "lipHeightMeters",
  "rimRadiusMeters",
  "sweepHeightMeters",
  "thicknessMeters",
];
const PLATE_SURFACE_KEYS = ["metalness", "roughness"];
const TOPPING_LENGTH_KEYS = ["pileMeters", "roundingMeters", "thicknessMeters"];
const TOPPING_SURFACE_KEYS = ["roughness", "translucency"];

// The drips' phases: at their target, drawing back up, at 0 waiting for
// the layers to settle, and running down.
const DRIPS_RESTING = "resting";
const DRIPS_RUNNING = "running";
const DRIPS_WAITING = "waiting";
const DRIPS_WITHDRAWING = "withdrawing";

/** #### Creates the cake's motion, at rest on a resolved cake
 * - Creates every spring and the `values` object once, for the page's
 *   life: later cakes retarget them in place.
 * - `values` has the resolved cake's shape, with each colour as sRGB
 *   channels `r`, `g` and `b`, from 0 to 1, and the topping's footing and
 *   the bounds derived from the layers, which at rest equal the
 *   resolver's.
 * @param cake The resolved cake, as resolveRecipe() returns it.
 * @returns The motion, whose `values` the uniforms' writer reads.
 */
export const createCakeMotion = (cake) => {
  const values = {
    eatenAngleRadians: cake.eatenAngleRadians,
    layers: cake.layers.map(copyPart),
    plate: copyPart(cake.plate),
    topping: copyPart(cake.topping),
    bounds: {
      plate: { ...cake.bounds.plate },
      stack: { ...cake.bounds.stack },
    },
  };
  const motion = {
    bottoms: cake.layers.map((layer) => createSpring(layer.bottomMeters)),
    coverage: createSpring(cake.topping.coverage),
    drips: {
      fromMeters: 0,
      meters: cake.topping.dripMeters,
      phase: DRIPS_RESTING,
      progress: 1,
      targetMeters: cake.topping.dripMeters,
      targetWaves: cake.topping.dripWaves,
      waves: cake.topping.dripWaves,
    },
    layers: cake.layers.map((layer, slot) =>
      createPart(
        layer,
        LAYER_LENGTH_KEYS,
        LAYER_SURFACE_KEYS,
        values.layers[slot],
      ),
    ),
    plate: createPart(
      cake.plate,
      PLATE_LENGTH_KEYS,
      PLATE_SURFACE_KEYS,
      values.plate,
    ),
    slice: {
      fromRadians: cake.eatenAngleRadians,
      progress: 1,
      toRadians: cake.eatenAngleRadians,
    },
    topping: createPart(
      cake.topping,
      TOPPING_LENGTH_KEYS,
      TOPPING_SURFACE_KEYS,
      values.topping,
    ),
    values,
  };
  stepCakeMotion(motion, 0);
  return motion;
};

/** #### Starts the motion towards another resolved cake, from where it is
 * - Every spring keeps its value and velocity, so a change mid transition
 *   carries on smoothly.
 * - A vanishing part keeps its colour: a slot of target height 0, a plate
 *   of target rim radius 0 and a topping of target coverage 0 leave their
 *   colour and surface springs alone. A part appearing from nothing takes
 *   its colour and surface numbers at once.
 * - The slice restarts its ease from its current angle; the drips draw
 *   back up, unless already doing so or waiting at 0.
 * - Under reduced motion every spring, the slice and the drips go straight
 *   to the target.
 * - Allocates nothing.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param cake The resolved cake to move towards.
 * @param options `reducedMotion`, true to skip the animation.
 */
export const retargetCakeMotion = (motion, cake, { reducedMotion }) => {
  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    const part = motion.layers[slot];
    const target = cake.layers[slot];
    retargetPart(
      part,
      target,
      target.heightMeters > 0,
      part.lengths.heightMeters.value < SETTLE_METERS,
    );
  }
  retargetPart(
    motion.plate,
    cake.plate,
    cake.plate.rimRadiusMeters > 0,
    motion.plate.lengths.rimRadiusMeters.value < SETTLE_METERS,
  );
  retargetPart(
    motion.topping,
    cake.topping,
    cake.topping.coverage > 0,
    motion.coverage.value < SETTLE_COVERAGE,
  );
  motion.coverage.target = cake.topping.coverage;

  const { drips, slice } = motion;
  slice.fromRadians = motion.values.eatenAngleRadians;
  slice.progress = 0;
  slice.toRadians = cake.eatenAngleRadians;

  drips.targetMeters = cake.topping.dripMeters;
  drips.targetWaves = cake.topping.dripWaves;
  if (drips.phase === DRIPS_RESTING || drips.phase === DRIPS_RUNNING) {
    drips.fromMeters = drips.meters;
    drips.phase = DRIPS_WITHDRAWING;
    drips.progress = 0;
  }

  if (reducedMotion) {
    snapCakeMotion(motion);
    stepCakeMotion(motion, 0);
  }
};

/** #### Advances the cake's motion by a time step and updates its values
 * - Steps every spring, then each layer's bottom towards the sum of the
 *   current heights beneath it, each clamped at 0, so upper layers hang
 *   over a shrinking stack and bounce on a growing one.
 * - Eases the slice by smoothstep over `SLICE_SECONDS`.
 * - Withdraws the drips linearly over `DRIP_WITHDRAW_SECONDS`, switches
 *   their wave count at 0, and runs them down by smoothstep over
 *   `DRIP_RUN_SECONDS` once the layers settle.
 * - Derives the topping's footing by toppingFooting(), and the bounding
 *   cylinders by writeCakeBounds(), from the values just written.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 */
export const stepCakeMotion = (motion, deltaSeconds) => {
  const { values } = motion;
  const dt = Math.max(deltaSeconds, 0);

  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    stepPart(motion.layers[slot], dt);
  }
  stepPart(motion.plate, dt);
  stepPart(motion.topping, dt);
  stepSpring(motion.coverage, LENGTH_SPRING, dt);
  values.topping.coverage = motion.coverage.value;

  let stackMeters = 0;
  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    const bottom = motion.bottoms[slot];
    const layer = values.layers[slot];
    bottom.target = stackMeters;
    stepSpring(bottom, STACK_SPRING, dt);
    layer.bottomMeters = bottom.value;
    stackMeters += Math.max(layer.heightMeters, 0);
  }

  const { slice } = motion;
  slice.progress = Math.min(slice.progress + dt / SLICE_SECONDS, 1);
  const eased = smoothstep(slice.progress);
  values.eatenAngleRadians =
    slice.fromRadians * (1 - eased) + slice.toRadians * eased;

  toppingFooting(values.layers, values.topping);
  stepDrips(motion, dt);
  writeCakeBounds(values.bounds, values.layers, values.plate, values.topping);
};

/** #### Derives the topping's footing, its base and crown radius, in place
 * - Folds the slots from the bottom up, from a base and radius of 0. Each
 *   slot weighs its height over `FOOTING_HEIGHT_METERS` times its top
 *   radius over `FOOTING_RADIUS_RATIO` of the radius so far, each clamped
 *   to 0 to 1, the second 1 while the radius so far is 0. The radius moves
 *   to the slot's top radius by the weight, and the base to the slot's top
 *   by the weight cubed, so a narrow slot takes the radius before it lifts
 *   the base.
 * - At rest every used layer weighs 1 and every unused slot 0, so the
 *   footing is the resolver's exactly.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param layers The layers, each its `bottomMeters`, `heightMeters` and
 *   `topRadiusMeters`.
 * @param footing The object to write, mutated: `baseMeters` and
 *   `radiusMeters`.
 * @returns The footing.
 */
export const toppingFooting = (layers, footing) => {
  let baseMeters = 0;
  let radiusMeters = 0;
  for (let slot = 0; slot < layers.length; slot++) {
    const layer = layers[slot];
    const heightWeight = clampUnit(layer.heightMeters / FOOTING_HEIGHT_METERS);
    const widthWeight =
      radiusMeters > 0
        ? clampUnit(
            layer.topRadiusMeters / (FOOTING_RADIUS_RATIO * radiusMeters),
          )
        : 1;
    const weight = heightWeight * widthWeight;
    const baseWeight = weight * weight * weight;
    // Mixed as `a × (1 − w) + b × w`, which gives exactly b at w = 1.
    radiusMeters = radiusMeters * (1 - weight) + layer.topRadiusMeters * weight;
    baseMeters =
      baseMeters * (1 - baseWeight) +
      (layer.bottomMeters + layer.heightMeters) * baseWeight;
  }
  footing.baseMeters = baseMeters;
  footing.radiusMeters = radiusMeters;
  return footing;
};

/** Gives one sRGB channel, 0 to 1, of a `#rrggbb` colour. */
const channelOfHex = (hex, index) =>
  parseInt(hex.slice(1 + 2 * index, 3 + 2 * index), 16) / 255;

/** Clamps a number to 0 to 1. */
const clampUnit = (value) => Math.min(Math.max(value, 0), 1);

/** Copies a resolved part, with its colour as sRGB channels. */
const copyPart = (part) => ({
  ...part,
  color: {
    r: channelOfHex(part.color, 0),
    g: channelOfHex(part.color, 1),
    b: channelOfHex(part.color, 2),
  },
});

/** #### Creates the springs of one part, at rest on its resolved values
 * @param resolved The resolved part: a layer, the plate or the topping.
 * @param lengthKeys The names of its lengths, on the length spring.
 * @param surfaceKeys The names of its surface numbers, on the colour
 *   spring.
 * @param partValues The part's entry in the motion's `values`, which
 *   stepPart() writes.
 * @returns The part: its springs, keys and values.
 */
const createPart = (resolved, lengthKeys, surfaceKeys, partValues) => {
  const part = {
    color: {},
    lengthKeys,
    lengths: {},
    surfaceKeys,
    surfaces: {},
    values: partValues,
  };
  for (const key of lengthKeys) part.lengths[key] = createSpring(resolved[key]);
  for (const key of surfaceKeys) {
    part.surfaces[key] = createSpring(resolved[key]);
  }
  for (const channel of COLOR_CHANNELS) {
    part.color[channel] = createSpring(partValues.color[channel]);
  }
  return part;
};

/** Says whether a length spring is settled on its target. */
const isLengthSettled = (spring) =>
  Math.abs(spring.value - spring.target) < SETTLE_METERS &&
  Math.abs(spring.velocity) < SETTLE_METERS_PER_SECOND;

/** Says whether every length spring of a part is settled. */
const isPartSettled = (part) => {
  for (let index = 0; index < part.lengthKeys.length; index++) {
    if (!isLengthSettled(part.lengths[part.lengthKeys[index]])) return false;
  }
  return true;
};

/** #### Says whether the layers have settled, so the drips can run down
 * - Every length spring, the layers' bottoms included, is within
 *   `SETTLE_METERS` of its target and slower than
 *   `SETTLE_METERS_PER_SECOND`, the coverage within `SETTLE_COVERAGE` of
 *   its target, and the slice's ease is done.
 */
const isSettled = (motion) => {
  if (motion.slice.progress < 1) return false;
  const { coverage } = motion;
  if (Math.abs(coverage.value - coverage.target) >= SETTLE_COVERAGE) {
    return false;
  }
  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    if (!isLengthSettled(motion.bottoms[slot])) return false;
    if (!isPartSettled(motion.layers[slot])) return false;
  }
  return isPartSettled(motion.plate) && isPartSettled(motion.topping);
};

/** #### Retargets one part's springs on a resolved part
 * - Its lengths always take the new targets.
 * - Its colour and surface numbers keep their targets when the part is
 *   vanishing, jump to the new ones when it is appearing from nothing, and
 *   take the new targets otherwise.
 */
const retargetPart = (part, resolved, isPresent, isAppearing) => {
  for (const key of part.lengthKeys) part.lengths[key].target = resolved[key];
  if (!isPresent) return;
  for (const key of part.surfaceKeys) {
    retargetSpring(part.surfaces[key], resolved[key], isAppearing);
  }
  for (let index = 0; index < COLOR_CHANNELS.length; index++) {
    retargetSpring(
      part.color[COLOR_CHANNELS[index]],
      channelOfHex(resolved.color, index),
      isAppearing,
    );
  }
};

/** Sets a spring's target, and with `isJump` puts it there at rest. */
const retargetSpring = (spring, target, isJump) => {
  spring.target = target;
  if (isJump) snapSpring(spring);
};

/** #### Puts every spring, the slice and the drips at their targets
 * - The layers' bottoms take the sums of the target heights beneath them,
 *   added in slot order as the resolver adds them, so they match it
 *   exactly.
 */
const snapCakeMotion = (motion) => {
  let stackMeters = 0;
  for (let slot = 0; slot < LAYER_SLOTS; slot++) {
    const part = motion.layers[slot];
    snapPart(part);
    const bottom = motion.bottoms[slot];
    bottom.target = stackMeters;
    snapSpring(bottom);
    stackMeters += Math.max(part.lengths.heightMeters.value, 0);
  }
  snapPart(motion.plate);
  snapPart(motion.topping);
  snapSpring(motion.coverage);

  motion.slice.progress = 1;

  const { drips } = motion;
  drips.meters = drips.targetMeters;
  drips.phase = DRIPS_RESTING;
  drips.progress = 1;
  drips.waves = drips.targetWaves;
};

/** Puts every spring of a part at its target, at rest. */
const snapPart = (part) => {
  for (const key of part.lengthKeys) snapSpring(part.lengths[key]);
  for (const key of part.surfaceKeys) snapSpring(part.surfaces[key]);
  for (const channel of COLOR_CHANNELS) snapSpring(part.color[channel]);
};

/** Puts a spring at its target, at rest. */
const snapSpring = (spring) => {
  spring.value = spring.target;
  spring.velocity = 0;
};

/** #### Eases a linear progress, slow at both ends and fastest midway
 * - The curve of r187's MathUtils.smoothstep(), `p² × (3 − 2p)`, written
 *   here so that this module needs no Three.js, as src/input/view.js does.
 */
const smoothstep = (progress) => {
  const p = clampUnit(progress);
  return p * p * (3 - 2 * p);
};

/** #### Advances the drips one time step, and writes them to the topping
 * - Withdrawing, the amplitude falls linearly from where it started to 0;
 *   at 0 the wave count switches to the target's, and the drips wait.
 * - Waiting, they take any new wave count, and start running down once
 *   the layers settle.
 * - Running, the amplitude rises by smoothstep to the target's.
 * - Allocates nothing.
 */
const stepDrips = (motion, dt) => {
  const { drips } = motion;
  if (drips.phase === DRIPS_WITHDRAWING) {
    drips.progress = Math.min(drips.progress + dt / DRIP_WITHDRAW_SECONDS, 1);
    drips.meters = drips.fromMeters * (1 - drips.progress);
    if (drips.progress >= 1) {
      drips.meters = 0;
      drips.phase = DRIPS_WAITING;
    }
  }
  if (drips.phase === DRIPS_WAITING) {
    drips.waves = drips.targetWaves;
    if (isSettled(motion)) {
      drips.phase = DRIPS_RUNNING;
      drips.progress = 0;
    }
  } else if (drips.phase === DRIPS_RUNNING) {
    drips.progress = Math.min(drips.progress + dt / DRIP_RUN_SECONDS, 1);
    drips.meters = drips.targetMeters * smoothstep(drips.progress);
    if (drips.progress >= 1) drips.phase = DRIPS_RESTING;
  }
  motion.values.topping.dripMeters = drips.meters;
  motion.values.topping.dripWaves = drips.waves;
};

/** #### Steps one part's springs and writes their values
 * - Lengths on `LENGTH_SPRING`, colour channels and surface numbers on
 *   `COLOR_SPRING`.
 * - Allocates nothing.
 */
const stepPart = (part, dt) => {
  const { color, lengthKeys, lengths, surfaceKeys, surfaces, values } = part;
  for (let index = 0; index < lengthKeys.length; index++) {
    const key = lengthKeys[index];
    stepSpring(lengths[key], LENGTH_SPRING, dt);
    values[key] = lengths[key].value;
  }
  for (let index = 0; index < surfaceKeys.length; index++) {
    const key = surfaceKeys[index];
    stepSpring(surfaces[key], COLOR_SPRING, dt);
    values[key] = surfaces[key].value;
  }
  for (let index = 0; index < COLOR_CHANNELS.length; index++) {
    const channel = COLOR_CHANNELS[index];
    stepSpring(color[channel], COLOR_SPRING, dt);
    values.color[channel] = color[channel].value;
  }
};
