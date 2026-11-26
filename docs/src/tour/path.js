/**
 * @fileoverview
 * The autoplay path of a cake's script, src/tour/scripts.js, and the gate
 * that holds the visitor's slider moves to it, so the captions arrive in
 * the story's order whether autoplay or the visitor moves the sliders.
 * Pure; the gate allocates nothing; Node can run it.
 */

// The index pathIndexOf() gives for sliders off the path.
const NOT_ON_PATH = -1;

/** #### Gives the autoplay path of a script's beats
 * - The positions autoplay visits from the first beat to the last, one
 *   slider stop per move: towards each next beat, the reveal slider
 *   first, then the eaten slider, as stepAutoplay() moves them.
 * - Allocates the path, so it is built once per arrival at a page with a
 *   script, never per frame.
 * @param beats The script's beats, as src/tour/scripts.js holds them.
 * @returns The positions in order, each its `eaten` step and `reveal`
 *   stop.
 */
export const pathOf = (beats) => {
  let { eaten, reveal } = beats[0];
  const path = [{ eaten, reveal }];
  for (const beat of beats) {
    while (reveal < beat.reveal) {
      reveal += 1;
      path.push({ eaten, reveal });
    }
    while (eaten < beat.eaten) {
      eaten += 1;
      path.push({ eaten, reveal });
    }
  }
  return path;
};

/** #### Gives the stops the gate lets a visitor's slider move take
 * - From the path's position k, only the slider that moves at k → k+1
 *   may move forward, and only the one that moved at k−1 → k back, one
 *   stop per call, however far a drag or key asked: so the captions
 *   arrive in order both ways, and none is skipped.
 * - Walking off the eaten slider's ends passes too: back below step 0
 *   anywhere at step 0, to the previous page, and forward past the last
 *   step only at the path's end, to the next page.
 * - Off the path, every move but the walk back is blocked.
 * @param delta The stops asked for, negative for back; a drag can ask for
 *   several.
 * @param eatenStep The eaten slider's current step.
 * @param path The script's path, as pathOf() gives it.
 * @param revealStop The reveal slider's current stop.
 * @param slider The slider to move, `"eaten"` or `"reveal"`.
 * @returns The stops allowed: the sign of `delta` if allowed, else 0.
 */
export const gateMove = (delta, eatenStep, path, revealStop, slider) => {
  if (delta === 0) return 0;
  const sign = Math.sign(delta);
  if (slider === "eaten" && sign < 0 && eatenStep === 0) return sign;
  const index = pathIndexOf(eatenStep, path, revealStop);
  if (index === NOT_ON_PATH) return 0;
  const open =
    sign > 0 ? forwardSliderAt(index, path) : backSliderAt(index, path);
  return slider === open ? sign : 0;
};

/** #### Gives the hint for a blocked move: the key that works its way
 * @param delta The stops the blocked move asked for, negative for back.
 * @param eatenStep The eaten slider's current step.
 * @param path The script's path, as pathOf() gives it.
 * @param revealStop The reveal slider's current stop.
 * @returns The prompt kind: `"next-up"` or `"next-right"` forward,
 *   `"back-down"` or `"back-left"` back, or `null` off the path.
 */
export const hintOf = (delta, eatenStep, path, revealStop) => {
  const index = pathIndexOf(eatenStep, path, revealStop);
  if (index === NOT_ON_PATH) return null;
  if (delta > 0) {
    return forwardSliderAt(index, path) === "reveal"
      ? "next-up"
      : "next-right";
  }
  return backSliderAt(index, path) === "reveal" ? "back-down" : "back-left";
};

/** #### Gives the greatest reveal stop on the path at eaten step 0
 * - A walk back arrives at eaten step 0 with the reveal stop snapped from
 *   the last cake; capping it here lands it on the path.
 * @param path The script's path, as pathOf() gives it.
 * @returns The stop.
 */
export const startRevealMaxOf = (path) => {
  let stop = 0;
  for (const position of path) {
    if (position.eaten === 0) stop = Math.max(stop, position.reveal);
  }
  return stop;
};

/** #### Gives the slider that moved into the path's position at `index`
 * - At the first position, the eaten slider, whose Left walks back.
 */
const backSliderAt = (index, path) =>
  index > 0 && path[index].reveal > path[index - 1].reveal
    ? "reveal"
    : "eaten";

/** #### Gives the slider that moves on from the path's position at `index`
 * - At the last position, the eaten slider, whose Right walks on.
 */
const forwardSliderAt = (index, path) =>
  index < path.length - 1 && path[index + 1].reveal > path[index].reveal
    ? "reveal"
    : "eaten";

/** Gives the sliders' index on the path, or `NOT_ON_PATH`. */
const pathIndexOf = (eatenStep, path, revealStop) => {
  for (let i = 0; i < path.length; i += 1) {
    if (path[i].eaten === eatenStep && path[i].reveal === revealStop) {
      return i;
    }
  }
  return NOT_ON_PATH;
};
