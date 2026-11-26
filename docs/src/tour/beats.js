/**
 * @fileoverview
 * The beats of a cake's script, src/tour/scripts.js: which one the sliders
 * caption, and how long autoplay holds each one for reading. Pure and
 * allocation-free, so the per-frame path can call it; Node can run it.
 */

// The least time autoplay holds a beat, however short its text, in
// seconds. A first guess, to tune by eye.
const MIN_HOLD_SECONDS = 2.5;
// The reading time autoplay allows per word of a beat's text, in seconds.
// A first guess, to tune by eye.
const READING_SECONDS_PER_WORD = 0.35;

/** #### Gives the index of the beat the sliders caption
 * - The last beat whose `eaten` and `reveal` are both at or below the
 *   sliders, so moving a slider back shows an earlier beat. A script's
 *   first beat is at `(0, 0)`, so one always qualifies.
 * @param beats The script's beats, as src/tour/scripts.js holds them.
 * @param eatenStep The eaten slider's current step.
 * @param revealStop The reveal slider's current stop.
 * @returns The beat's index in `beats`.
 */
export const beatIndexAt = (beats, eatenStep, revealStop) => {
  let index = 0;
  for (let i = 0; i < beats.length; i += 1) {
    if (beats[i].eaten <= eatenStep && beats[i].reveal <= revealStop) {
      index = i;
    }
  }
  return index;
};

/** #### Gives how long autoplay holds a beat for reading, in seconds
 * - Its words times `READING_SECONDS_PER_WORD`, but never below
 *   `MIN_HOLD_SECONDS`.
 * @param beat A beat, with its `text`.
 * @returns The hold, in seconds.
 */
export const holdSecondsOf = (beat) =>
  Math.max(MIN_HOLD_SECONDS, wordCountOf(beat.text) * READING_SECONDS_PER_WORD);

/** #### Counts the words in a text, allocating nothing
 * - A word is a run of non-whitespace characters, as `\s` defines
 *   whitespace in a regular expression.
 */
const wordCountOf = (text) => {
  let count = 0;
  let isInWord = false;
  for (let i = 0; i < text.length; i += 1) {
    const isSpace = isWhitespaceCode(text.charCodeAt(i));
    if (!isSpace && !isInWord) count += 1;
    isInWord = !isSpace;
  }
  return count;
};

/** #### Tells whether a UTF-16 code unit is whitespace, as `\s` matches
 * - The ECMAScript WhiteSpace and LineTerminator code points:
 *   https://tc39.es/ecma262/#sec-white-space
 */
const isWhitespaceCode = (code) =>
  (code >= 0x09 && code <= 0x0d) ||
  code === 0x20 ||
  code === 0xa0 ||
  code === 0x1680 ||
  (code >= 0x2000 && code <= 0x200a) ||
  code === 0x2028 ||
  code === 0x2029 ||
  code === 0x202f ||
  code === 0x205f ||
  code === 0x3000 ||
  code === 0xfeff;
