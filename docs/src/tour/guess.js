/**
 * @fileoverview
 * The guess flow on a `guess` page: a nudge up the reveal slider, a prompt
 * to press Up, a prompt to press Right, which must come before the whole
 * cake shows, a prompt to guess at it, and its name on Reveal, which must
 * come before the walk on to the next page and stays until it. A pure
 * state machine, stepped by the animation loop's elapsed time and mutated
 * in place, so the per-frame path allocates nothing; Node can run it.
 */

// How long after arriving the reveal slider steps up by itself, from stop
// 0, if the visitor has not touched it, in seconds.
const GUESS_AUTO_STEP_DELAY_SECONDS = 1;
// How long after the automatic step's moment the Up prompt shows, if the
// visitor has still not touched the reveal slider, in seconds: six after
// arriving.
const UP_PROMPT_DELAY_SECONDS = 5;
const UP_PROMPT_AT_SECONDS =
  GUESS_AUTO_STEP_DELAY_SECONDS + UP_PROMPT_DELAY_SECONDS;
// How long after arriving the bite prompt shows, if the visitor has not
// pressed Right, in seconds.
const BITE_PROMPT_DELAY_SECONDS = 20;
// How long after Reveal the note under the cake's name changes to urge
// more Rights, in seconds.
const NAME_NOTE_DELAY_SECONDS = 5;

/** #### Creates the guess flow for one arrival at a `guess` page
 * @param isLastGuess Whether this is the tour's last `guess` page, as
 *   isLastGuessPage() gives it.
 * @returns The flow's state: the seconds since arriving and since then at
 *   Reveal, whether this is the last `guess` page, and whether the
 *   automatic step's moment has passed, a Right was blocked from walking
 *   on, the visitor has pressed Reveal, pressed Right, and changed the
 *   reveal slider.
 */
export const createGuess = (isLastGuess) => ({
  elapsedSeconds: 0,
  isAutoStepDone: false,
  isBlocked: false,
  isLastGuess,
  isRevealed: false,
  isRightPressed: false,
  isTouched: false,
  revealedAtSeconds: 0,
});

/** #### Tells whether a Right past the last eaten step may walk on
 * - Only once Reveal has been pressed on this arrival.
 * @param guess The flow.
 * @returns Whether to walk on to the next page.
 */
export const canWalkOn = (guess) => guess.isRevealed;

/** #### Gives the highest reveal stop the flow allows now
 * - One below the top until the visitor's first Right, so the whole cake
 *   shows only once they know a slice can be eaten; the top after it.
 * @param guess The flow.
 * @param revealMax The reveal slider's top stop.
 * @returns The highest reveal stop allowed.
 */
export const revealCapOf = (guess, revealMax) =>
  guess.isRightPressed ? revealMax : revealMax - 1;

/** #### Steps the guess flow by the time elapsed since the last frame
 * - At `GUESS_AUTO_STEP_DELAY_SECONDS`, once, it asks for the reveal
 *   slider to step up one stop, as Up would, only if the visitor has not
 *   touched it and its stop is still 0.
 * @param guess The flow, as createGuess() gives it, mutated.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 * @param revealStop The reveal slider's current stop.
 * @returns Whether to step the reveal slider up one stop this frame.
 */
export const stepGuess = (guess, deltaSeconds, revealStop) => {
  guess.elapsedSeconds += deltaSeconds;
  if (
    guess.isAutoStepDone ||
    guess.elapsedSeconds < GUESS_AUTO_STEP_DELAY_SECONDS
  ) {
    return false;
  }
  guess.isAutoStepDone = true;
  return !guess.isTouched && revealStop === 0;
};

/** #### Notes the visitor's own change of the reveal slider
 * - By key, click or drag, never the automatic step: the Up prompt never
 *   shows again on this arrival, and the automatic step no longer fires.
 * @param guess The flow, mutated.
 */
export const noteRevealByVisitor = (guess) => {
  guess.isTouched = true;
};

/** #### Notes a press of Reveal, which names the cake
 * - It ends any block too, since promptOf() and canWalkOn() put Reveal
 *   first.
 * @param guess The flow, mutated.
 */
export const noteReveal = (guess) => {
  guess.isRevealed = true;
  guess.revealedAtSeconds = guess.elapsedSeconds;
};

/** #### Notes a Right past the last eaten step that canWalkOn() refused
 * - The block's prompt shows until Reveal.
 * @param guess The flow, mutated.
 */
export const noteBlocked = (guess) => {
  guess.isBlocked = true;
};

/** #### Notes a Right, by key or button
 * - The first hides the bite prompt for good and lifts the reveal cap.
 * @param guess The flow, mutated.
 */
export const noteRight = (guess) => {
  guess.isRightPressed = true;
};

/** #### Gives the prompt the flow shows now
 * - From Reveal on, at any stop, whatever Right does: `"name"` for
 *   `NAME_NOTE_DELAY_SECONDS`, then `"name-deeper"` on the last `guess`
 *   page, else `"name-next"`. Before Reveal, after a blocked Right:
 *   `"blocked-reveal"` at the reveal slider's top stop, else
 *   `"blocked-up"`. Before Reveal, with no block: after a Right, `"guess"`
 *   at the reveal slider's top stop; before one, `"bite"` from
 *   `BITE_PROMPT_DELAY_SECONDS` or at the stop below the top; else `"up"`
 *   from `UP_PROMPT_AT_SECONDS` if the visitor has not touched the slider;
 *   else none.
 * @param guess The flow.
 * @param revealStop The reveal slider's current stop.
 * @param revealMax The reveal slider's top stop.
 * @returns `"name"`, `"name-next"`, `"name-deeper"`, `"blocked-reveal"`,
 *   `"blocked-up"`, `"guess"`, `"bite"`, `"up"` or `null`.
 */
export const promptOf = (guess, revealStop, revealMax) => {
  if (guess.isRevealed) {
    if (
      guess.elapsedSeconds - guess.revealedAtSeconds <
      NAME_NOTE_DELAY_SECONDS
    ) {
      return "name";
    }
    return guess.isLastGuess ? "name-deeper" : "name-next";
  }
  if (guess.isBlocked) {
    return revealStop >= revealMax ? "blocked-reveal" : "blocked-up";
  }
  if (guess.isRightPressed) {
    if (revealStop >= revealMax) return "guess";
  } else if (
    guess.elapsedSeconds >= BITE_PROMPT_DELAY_SECONDS ||
    revealStop >= revealMax - 1
  ) {
    return "bite";
  }
  if (!guess.isTouched && guess.elapsedSeconds >= UP_PROMPT_AT_SECONDS) {
    return "up";
  }
  return null;
};
