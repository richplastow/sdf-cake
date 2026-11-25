/**
 * @fileoverview
 * The cake in motion: a damped spring per animated number of the resolved
 * cake, the layers' bottoms following the stack beneath them, the eased
 * slice, the drips withdrawn and run down, the decorations sunk and
 * dropped, and the `values` the uniforms' writer reads, with the topping's
 * footing and the bounding cylinders derived from them every frame. Pure:
 * nothing here imports from `three`, so Node can run it.
 */

import { DECORATION_KINDS, greatestHeightMeters } from "../cake/place.js";
import { writeCakeBounds } from "../cake/resolve.js";
import { DECORATION_SLOTS, LAYER_SLOTS } from "../cake/slots.js";
import {
  COLOR_SPRING,
  createSpring,
  LENGTH_SPRING,
  STACK_SPRING,
  stepSpring,
} from "./spring.js";

// How long after a cake change starts the body of the cake retargets, in
// seconds, so the old decorations begin to sink first.
const BODY_DELAY_SECONDS = 0.2;
// How long after a cake change starts the new cake's first item drops, in
// seconds, how far above its rest it drops from, in metres, and how long
// its fall takes, in seconds.
const DROP_DELAY_SECONDS = 1.1;
const DROP_HEIGHT_METERS = 0.12;
const DROP_SECONDS = 0.45;
// How long after a reveal stop brings the decorations back the first one
// drops, in seconds: a first guess, to tune by eye.
const REVEAL_DROP_DELAY_SECONDS = 0.15;
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
// How far an item sinks, as a multiple of its height, unitless, and how
// long its sink takes, in seconds.
const SINK_DEPTH_FACTOR = 2.5;
const SINK_SECONDS = 0.4;
// How long the slice takes to ease to a new angle, in seconds.
const SLICE_SECONDS = 0.6;
// How long after one item's sink or drop the next one's starts, in
// seconds.
const SLOT_STAGGER_SECONDS = 0.03;

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

// A decoration's phases: none in its slot, placed and waiting for its
// drop, falling, at rest, and sinking away.
const ITEM_DROPPING = "dropping";
const ITEM_EMPTY = "empty";
const ITEM_RESTING = "resting";
const ITEM_SINKING = "sinking";
const ITEM_WAITING = "waiting";

/** #### Creates the cake's motion, at rest on a resolved cake
 * - Creates every spring and the `values` object once, for the page's
 *   life: later cakes retarget them in place.
 * - `values` has the resolved cake's shape, with each colour as sRGB
 *   channels `r`, `g` and `b`, from 0 to 1, and the topping's footing and
 *   the bounds derived from the layers, which at rest equal the
 *   resolver's.
 * - `values.decorations` holds `DECORATION_SLOTS` items and the scatter,
 *   each with its animated `offsetMeters` and `scale`, the `count` of
 *   slots in use, the greatest drop offset above rest, `liftMeters`, and
 *   the tallest present kind's height, `reachMeters`. The cake's own
 *   decorations stand at rest.
 * @param cake The resolved cake, as resolveRecipe() returns it, with its
 *   `decorations`: `slots`, as placeDecorations() returns them, and
 *   `scatter`, as placeScatter() returns it.
 * @returns The motion, whose `values` the uniforms' writer reads.
 */
export const createCakeMotion = (cake) => {
  const decorations = {
    count: 0,
    items: Array.from({ length: DECORATION_SLOTS }, createItem),
    liftMeters: 0,
    reachMeters: 0,
    scatter: createItem(),
  };
  installDecorations(decorations, cake.decorations, true, 0);
  const values = {
    decorations,
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
    // Seconds since the last cake change, and the decorations and the body
    // still to come from it.
    changeSeconds: Infinity,
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
    pendingBody: null,
    pendingDecorations: null,
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
 * - At once, every present decoration sinks from where it is, each
 *   `SLOT_STAGGER_SECONDS` after the last and the scatter last, and any
 *   drop still pending is cancelled. The body retargets
 *   `BODY_DELAY_SECONDS` later, and the new cake's decorations are placed
 *   and drop from `DROP_DELAY_SECONDS`, the scatter last.
 * - Every spring keeps its value and velocity, so a change mid transition
 *   carries on smoothly.
 * - A vanishing part keeps its colour: a slot of target height 0, a plate
 *   of target rim radius 0 and a topping of target coverage 0 leave their
 *   colour and surface springs alone. A part appearing from nothing takes
 *   its colour and surface numbers at once.
 * - The slice restarts its ease from its current angle; the drips draw
 *   back up, unless already doing so or waiting at 0.
 * - Under reduced motion every spring, the slice and the drips go straight
 *   to the target, and the new cake's decorations stand at rest at once:
 *   nothing sinks, waits or drops.
 * - Allocates nothing.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param cake The resolved cake to move towards, with its `decorations`,
 *   as createCakeMotion() takes them.
 * @param options `reducedMotion`, true to skip the animation.
 */
export const retargetCakeMotion = (motion, cake, { reducedMotion }) => {
  const { decorations } = motion.values;
  motion.changeSeconds = 0;
  if (reducedMotion) {
    motion.pendingBody = null;
    motion.pendingDecorations = null;
    retargetBody(motion, cake);
    installDecorations(decorations, cake.decorations, true, 0);
    snapCakeMotion(motion);
    stepCakeMotion(motion, 0);
    return;
  }
  motion.pendingBody = cake;
  motion.pendingDecorations = cake.decorations;
  sinkDecorations(decorations);
};

/** #### Retargets the body of the cake, every spring, the slice and drips
 * - Allocates nothing.
 */
const retargetBody = (motion, cake) => {
  retargetParts(motion, cake);
  const { slice } = motion;
  slice.fromRadians = motion.values.eatenAngleRadians;
  slice.progress = 0;
  slice.toRadians = cake.eatenAngleRadians;
};

/** #### Retargets which parts of the cake show, within one cake
 * - Takes the masked cake's plate, layers and topping at once, with no
 *   `BODY_DELAY_SECONDS`, and leaves the slice alone. The drips draw back
 *   up, unless already doing so or waiting at 0, and run down again once
 *   the layers settle.
 * - Decorations the mask hides sink from where they are; decorations it
 *   brings back drop from `REVEAL_DROP_DELAY_SECONDS`, the scatter last.
 *   Either restarts `changeSeconds`, which times the sink and the drop.
 * - Mid cake change, the body and the decorations still pending take the
 *   masked cake's in place of the old, so the change lands on them.
 * - Under reduced motion every spring and the drips go straight to the
 *   target, and the decorations stand at rest at once.
 * - Allocates nothing.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param cake The masked resolved cake to move towards, with its
 *   `decorations`, as createCakeMotion() takes them.
 * @param options `reducedMotion`, true to skip the animation.
 */
export const retargetPresence = (motion, cake, { reducedMotion }) => {
  const { decorations } = motion.values;
  if (reducedMotion) {
    retargetParts(motion, cake);
    installDecorations(decorations, cake.decorations, true, 0);
    snapCakeMotion(motion);
    stepCakeMotion(motion, 0);
    return;
  }
  if (motion.pendingBody) motion.pendingBody = cake;
  else retargetParts(motion, cake);
  if (motion.pendingDecorations) {
    motion.pendingDecorations = cake.decorations;
    return;
  }
  const { scatter, slots } = cake.decorations;
  const isShown = slots.length > 0 || scatter.kindId > 0;
  if (isShown === hasStandingDecorations(decorations)) return;
  motion.changeSeconds = 0;
  if (isShown) {
    installDecorations(
      decorations,
      cake.decorations,
      false,
      REVEAL_DROP_DELAY_SECONDS,
    );
  } else {
    sinkDecorations(decorations);
  }
};

/** #### Starts the slice towards another eaten angle, within one cake
 * - Restarts the slice's ease from its current angle; nothing else moves.
 * - Mid cake change, the body still pending takes the angle instead, so
 *   the change lands on it.
 * - Under reduced motion the slice goes straight to the angle.
 * - Allocates nothing.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param eatenAngleRadians The eaten angle to move towards, in radians.
 * @param options `reducedMotion`, true to skip the animation.
 */
export const retargetSlice = (motion, eatenAngleRadians, { reducedMotion }) => {
  if (motion.pendingBody) {
    motion.pendingBody.eatenAngleRadians = eatenAngleRadians;
    return;
  }
  const { slice, values } = motion;
  if (reducedMotion) values.eatenAngleRadians = eatenAngleRadians;
  slice.fromRadians = values.eatenAngleRadians;
  slice.progress = reducedMotion ? 1 : 0;
  slice.toRadians = eatenAngleRadians;
};

/** #### Retargets every spring of the body and the drips, not the slice
 * - Allocates nothing.
 */
const retargetParts = (motion, cake) => {
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

  const { drips } = motion;
  drips.targetMeters = cake.topping.dripMeters;
  drips.targetWaves = cake.topping.dripWaves;
  if (drips.phase === DRIPS_RESTING || drips.phase === DRIPS_RUNNING) {
    drips.fromMeters = drips.meters;
    drips.phase = DRIPS_WITHDRAWING;
    drips.progress = 0;
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
 * - Retargets the body once `BODY_DELAY_SECONDS` have passed since a
 *   change, and places the new cake's decorations once
 *   `DROP_DELAY_SECONDS` have, then sinks and drops each decoration.
 * - Derives the topping's footing by toppingFooting(), and the bounding
 *   cylinders by writeCakeBounds(), from the values just written.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param motion The motion, as createCakeMotion() made it, mutated.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 */
export const stepCakeMotion = (motion, deltaSeconds) => {
  const { values } = motion;
  const dt = Math.max(deltaSeconds, 0);

  motion.changeSeconds += dt;
  if (motion.pendingBody && motion.changeSeconds >= BODY_DELAY_SECONDS) {
    retargetBody(motion, motion.pendingBody);
    motion.pendingBody = null;
  }
  if (
    motion.pendingDecorations &&
    motion.changeSeconds >= DROP_DELAY_SECONDS
  ) {
    installDecorations(
      values.decorations,
      motion.pendingDecorations,
      false,
      DROP_DELAY_SECONDS,
    );
    motion.pendingDecorations = null;
  }
  stepDecorations(values.decorations, motion.changeSeconds);

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
  writeCakeBounds(
    values.bounds,
    values.decorations.reachMeters,
    values.layers,
    values.plate,
    values.topping,
  );
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

/** #### Creates one decoration's state and values, empty
 * - Its `rotation` is nine numbers, column-major; its `color`, sRGB
 *   channels. The scatter uses the same shape, with `cellMeters`.
 */
const createItem = () => ({
  cellMeters: 0,
  color: { r: 0, g: 0, b: 0 },
  delaySeconds: 0,
  embedMeters: 0,
  fromMeters: 0,
  fromScale: 0,
  heightMeters: 0,
  kindId: 0,
  offsetMeters: 0,
  phase: ITEM_EMPTY,
  reachMeters: 0,
  restScale: 0,
  rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  roughness: 0,
  scale: 0,
  xMeters: 0,
  zMeters: 0,
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

/** #### Places a cake's decorations in the items, at rest or to drop
 * - Each slot's item takes its kind's height at its scale, for the sink,
 *   and its kind's greatest height, for the bound. Slots past the cake's
 *   are emptied.
 * - To drop, each item waits at `DROP_HEIGHT_METERS` above its rest until
 *   `dropDelaySeconds` after the change, plus `SLOT_STAGGER_SECONDS` per
 *   slot before it; the scatter waits for every slot.
 */
const installDecorations = (
  decorations,
  { scatter, slots },
  isAtRest,
  dropDelaySeconds,
) => {
  for (let slot = 0; slot < DECORATION_SLOTS; slot++) {
    const item = decorations.items[slot];
    const placed = slots[slot];
    if (!placed) {
      item.phase = ITEM_EMPTY;
      item.scale = 0;
      continue;
    }
    const kind = DECORATION_KINDS[placed.kindId - 1];
    item.embedMeters = placed.embedMeters;
    item.kindId = placed.kindId;
    item.restScale = placed.scale;
    item.roughness = placed.roughness;
    item.xMeters = placed.xMeters;
    item.zMeters = placed.zMeters;
    for (let index = 0; index < 9; index++) {
      item.rotation[index] = placed.rotation[index];
    }
    for (let index = 0; index < COLOR_CHANNELS.length; index++) {
      item.color[COLOR_CHANNELS[index]] = channelOfHex(placed.color, index);
    }
    placeItemState(
      item,
      kind,
      dropDelaySeconds + slot * SLOT_STAGGER_SECONDS,
      isAtRest,
      placed.scale,
    );
  }

  const item = decorations.scatter;
  if (scatter.kindId <= 0) {
    item.phase = ITEM_EMPTY;
    item.scale = 0;
    return;
  }
  item.cellMeters = scatter.cellMeters;
  item.kindId = scatter.kindId;
  for (let index = 0; index < COLOR_CHANNELS.length; index++) {
    item.color[COLOR_CHANNELS[index]] = channelOfHex(scatter.color, index);
  }
  placeItemState(
    item,
    DECORATION_KINDS[scatter.kindId - 1],
    dropDelaySeconds + slots.length * SLOT_STAGGER_SECONDS,
    isAtRest,
    1,
  );
};

/** #### Says whether any decoration stands, or waits or falls to stand
 * - An item that is empty or sinking away does not count.
 */
const hasStandingDecorations = (decorations) => {
  for (let slot = 0; slot <= DECORATION_SLOTS; slot++) {
    const item =
      slot === DECORATION_SLOTS ? decorations.scatter : decorations.items[slot];
    if (item.phase !== ITEM_EMPTY && item.phase !== ITEM_SINKING) return true;
  }
  return false;
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

/** #### Sets an item's phase, offset and scale, at rest or waiting to drop
 */
const placeItemState = (item, kind, delaySeconds, isAtRest, restScale) => {
  item.delaySeconds = delaySeconds;
  item.heightMeters = kind.sizeMeters[1] * restScale;
  item.offsetMeters = isAtRest ? 0 : DROP_HEIGHT_METERS;
  item.phase = isAtRest ? ITEM_RESTING : ITEM_WAITING;
  item.reachMeters = greatestHeightMeters(kind);
  item.restScale = restScale;
  item.scale = isAtRest ? restScale : 0;
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

/** #### Starts every present decoration sinking from where it is
 * - Each slot starts `SLOT_STAGGER_SECONDS` after the last present one,
 *   the scatter last; an item still waiting to drop is emptied.
 * - Allocates nothing.
 */
const sinkDecorations = (decorations) => {
  let order = 0;
  for (let slot = 0; slot < DECORATION_SLOTS; slot++) {
    if (sinkItem(decorations.items[slot], order * SLOT_STAGGER_SECONDS)) {
      order++;
    }
  }
  sinkItem(decorations.scatter, order * SLOT_STAGGER_SECONDS);
};

/** #### Starts one item sinking from where it is, after a delay
 * @returns Whether the item was present and now sinks.
 */
const sinkItem = (item, delaySeconds) => {
  if (item.phase === ITEM_EMPTY) return false;
  if (item.phase === ITEM_WAITING) {
    item.phase = ITEM_EMPTY;
    item.scale = 0;
    return false;
  }
  item.delaySeconds = delaySeconds;
  item.fromMeters = item.offsetMeters;
  item.fromScale = item.scale;
  item.phase = ITEM_SINKING;
  return true;
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

/** #### Advances every decoration to the time since the last change
 * - Sums the slots in use, the greatest drop offset above rest and the
 *   tallest present kind's height into the decorations' values.
 * - Allocates nothing.
 */
const stepDecorations = (decorations, changeSeconds) => {
  let count = 0;
  let liftMeters = 0;
  let reachMeters = 0;
  for (let slot = 0; slot <= DECORATION_SLOTS; slot++) {
    const isScatter = slot === DECORATION_SLOTS;
    const item = isScatter ? decorations.scatter : decorations.items[slot];
    stepItem(item, changeSeconds);
    if (item.phase === ITEM_EMPTY) continue;
    if (!isScatter) count = slot + 1;
    liftMeters = Math.max(liftMeters, item.offsetMeters);
    reachMeters = Math.max(reachMeters, item.reachMeters);
  }
  decorations.count = count;
  decorations.liftMeters = liftMeters;
  decorations.reachMeters = reachMeters;
};

/** #### Advances one decoration to the time since the last change
 * - Sinking, it falls `SINK_DEPTH_FACTOR` of its height below where it
 *   started over `SINK_SECONDS`, eased out, its scale falling to 0 as the
 *   sink ends, when it empties.
 * - Waiting, it starts its drop at its delay. Dropping, it falls from
 *   `DROP_HEIGHT_METERS` above its rest as under gravity, eased in, over
 *   `DROP_SECONDS`, and then rests.
 * - Allocates nothing.
 */
const stepItem = (item, changeSeconds) => {
  const elapsedSeconds = changeSeconds - item.delaySeconds;
  if (item.phase === ITEM_SINKING) {
    const progress = clampUnit(elapsedSeconds / SINK_SECONDS);
    const eased = 1 - (1 - progress) * (1 - progress);
    item.offsetMeters =
      item.fromMeters - SINK_DEPTH_FACTOR * item.heightMeters * eased;
    item.scale = item.fromScale * (1 - progress * progress);
    if (progress >= 1) {
      item.phase = ITEM_EMPTY;
      item.scale = 0;
    }
  } else if (item.phase === ITEM_WAITING) {
    if (changeSeconds >= item.delaySeconds) {
      item.phase = ITEM_DROPPING;
      item.scale = item.restScale;
    }
  }
  if (item.phase === ITEM_DROPPING) {
    const progress = clampUnit(elapsedSeconds / DROP_SECONDS);
    item.offsetMeters = DROP_HEIGHT_METERS * (1 - progress * progress);
    if (progress >= 1) {
      item.offsetMeters = 0;
      item.phase = ITEM_RESTING;
    }
  }
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
