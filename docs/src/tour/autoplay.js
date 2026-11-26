/**
 * @fileoverview
 * Autoplay on a `presentation` page with a script: it holds the beat the
 * sliders caption for its reading time, then moves one slider one stop
 * up at a time to the next beat, and stops at the last, where it asks for
 * the end prompt after a while. A pure state machine, stepped by the
 * animation loop's elapsed time and mutated in place, so the per-frame
 * path allocates nothing; Node can run it.
 */

import { beatIndexAt, holdSecondsOf } from "./beats.js";

// The time between autoplay's moves of one stop on the way to the next
// beat, and from the end of a beat's hold to the first, in seconds. A
// first guess, to tune by eye.
const AUTOPLAY_STEP_SECONDS = 0.8;
// How long the sliders stay at a script's last beat, playing or paused,
// before the end prompt shows, in seconds.
const END_PROMPT_DELAY_SECONDS = 4;
// The beat index that means no beat is held yet, so the next step holds
// the beat the sliders are at afresh.
const NO_BEAT = -1;

/** #### Creates autoplay for one arrival at a page with a script
 * - It plays from the first step, holding the beat the sliders are at.
 * @returns The state: the beat held, the seconds left until the next
 *   move, whether it is paused, whether the sliders are at the last beat
 *   and for how many seconds, and whether a Right came since they got
 *   there.
 */
export const createAutoplay = () => ({
  beatIndex: NO_BEAT,
  endSeconds: 0,
  isAtEnd: false,
  isPaused: false,
  isRightPressed: false,
  waitSeconds: 0,
});

/** #### Steps autoplay by the time elapsed since the last frame
 * - Whether playing or paused, it notes whether the sliders are at the
 *   last beat, and for how long; leaving it resets that time and any
 *   Right.
 * - While playing and short of the last beat, it holds each beat it
 *   reaches for holdSecondsOf() and `AUTOPLAY_STEP_SECONDS` more, then
 *   asks for a move every `AUTOPLAY_STEP_SECONDS`: the reveal slider
 *   while it is below the next beat's stop, else the eaten slider, each
 *   one stop up, never down.
 * @param autoplay The state, as createAutoplay() gives it, mutated.
 * @param beats The page's script's beats.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 * @param eatenStep The eaten slider's current step.
 * @param revealStop The reveal slider's current stop.
 * @returns `"reveal"` or `"eaten"`, the slider to move one stop up this
 *   frame, or `null`.
 */
export const stepAutoplay = (
  autoplay,
  beats,
  deltaSeconds,
  eatenStep,
  revealStop,
) => {
  const index = beatIndexAt(beats, eatenStep, revealStop);
  autoplay.isAtEnd = index === beats.length - 1;
  if (autoplay.isAtEnd) {
    autoplay.endSeconds += deltaSeconds;
  } else {
    autoplay.endSeconds = 0;
    autoplay.isRightPressed = false;
  }
  if (autoplay.isPaused || autoplay.isAtEnd) return null;
  if (index !== autoplay.beatIndex) {
    autoplay.beatIndex = index;
    autoplay.waitSeconds = holdSecondsOf(beats[index]) + AUTOPLAY_STEP_SECONDS;
  }
  autoplay.waitSeconds -= deltaSeconds;
  if (autoplay.waitSeconds > 0) return null;
  autoplay.waitSeconds += AUTOPLAY_STEP_SECONDS;
  return revealStop < beats[index + 1].reveal ? "reveal" : "eaten";
};

/** #### Tells whether the sliders are at the script's last beat
 * - As of the last step; autoplay makes no move there.
 * @param autoplay The state.
 * @returns Whether they are at the end.
 */
export const isAtEnd = (autoplay) => autoplay.isAtEnd;

/** #### Tells whether the end prompt is due
 * - Once the sliders have stayed at the last beat for
 *   `END_PROMPT_DELAY_SECONDS`, playing or paused, unless a Right came
 *   since they got there.
 * @param autoplay The state.
 * @returns Whether to show the end prompt.
 */
export const isEndPromptDue = (autoplay) =>
  autoplay.isAtEnd &&
  !autoplay.isRightPressed &&
  autoplay.endSeconds >= END_PROMPT_DELAY_SECONDS;

/** #### Notes a Right, by key or button
 * - At the end, it dismisses the end prompt until the sliders leave the
 *   end; elsewhere it does nothing, so a Right that reaches the end still
 *   prompts there.
 * @param autoplay The state, mutated.
 */
export const noteRight = (autoplay) => {
  if (autoplay.isAtEnd) autoplay.isRightPressed = true;
};

/** #### Pauses autoplay, which then makes no move until play()
 * @param autoplay The state, mutated.
 */
export const pause = (autoplay) => {
  autoplay.isPaused = true;
};

/** #### Resumes autoplay from the beat the sliders are at
 * - That beat is held afresh, for its full reading time.
 * @param autoplay The state, mutated.
 */
export const play = (autoplay) => {
  autoplay.isPaused = false;
  autoplay.beatIndex = NO_BEAT;
};
