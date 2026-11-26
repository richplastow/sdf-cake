---
title: Autoplay presentation
description: Captions the cakes from the pancake to the custard pie with sections 2 to 8 of the Cake Day notes, one chunk per slider position, and autoplays each cake with a Play/Pause button.
type: plan
---

## Context

- After the fun-facts interlude of [Plan 12](12-guess-the-cake.md), each
  cake from `#pancake` to `#custard-pie` tells its part of the story in
  sections 2 to 8 of
  [20261126-cake-day.md](../../20261126-cake-day.md#2-intro-pancake): the
  pancake, the Pepi’Onkh honey cake, the Artemis offering, the
  Sachertorte, the Bolo Formigueiro, the Bánh Bò and, for the jokes, the
  custard pie.
- Depends on Plan 12: its page list (`docs/src/tour/pages.js`), its
  `presentation` page kind, its `.prompt` element and its pure, per-frame
  state machines, which this plan follows.
- Each caption is tied to a position of the two sliders, so the text
  arrives in order whether the sliders are moved by hand or by the
  autoplay, and a line such as “with sesame seeds on top” appears as the
  seeds fall.

## Decisions

1. **A script is a list of beats per `presentation` page**, in a new data
   module, `docs/src/tour/scripts.js`. A beat is a slider position and one
   short chunk of text, plain text with curly quotes and no markup. The
   title is the section’s, shown above every beat:

   ```json
   {
     "pageId": "pancake",
     "title": "Intro",
     "beats": [
       { "eaten": 0, "reveal": 0, "text": "The word ‘cake’ comes from the Old Norse kaka. But nobody’s really sure where that word comes from." },
       { "eaten": 0, "reveal": 1, "text": "For the first few hundred years, a cake was just bread that you’d flipped over." },
       { "eaten": 1, "reveal": 1, "text": "Bread stayed the right way up." },
       { "eaten": 2, "reveal": 1, "text": "If you turned it over on the hearthstone, it was a cake." },
       { "eaten": 4, "reveal": 1, "text": "So basically, pancakes were a typical ancient British breakfast." }
     ]
   }
   ```

2. **Beats follow the sliders’ natural path.** Within a script, each beat’s
   `eaten` and `reveal` are each at least the previous beat’s, and at
   least one is greater; the first beat is at `(0, 0)`, and the last at
   the top reveal stop and the last eaten step, so one Right from the end
   walks on. A cake’s positions number its reveal stops plus its eaten
   steps less one (the pancake 6, the Artemis offering 13), so every
   section fits; the custard pie’s 8 hold the four jokes as a set-up and a
   punchline each. The text is the section’s, cut into chunks; where a
   chunk names a part (the honey, the sesame seeds, the candles, the
   apricot jam, the seal, the sprinkles, the cherry), its beat is the
   reveal stop that brings that part in.
3. **The caption is a pure function of the sliders**, `beatIndexAt(beats,
   eatenStep, revealStop)` in `docs/src/tour/beats.js`: the last beat
   whose `eaten` and `reveal` are both at or below the sliders. Moving a
   slider back shows the earlier caption. The caption shows at the bottom
   centre, above the eaten slider, like a subtitle, with `role="status"`,
   and stays visible when Escape hides the controls.
4. **Autoplay moves the sliders one stop at a time** towards the next
   beat, reveal before eaten, every `AUTOPLAY_STEP_SECONDS = 0.8`, then
   holds the beat for `max(MIN_HOLD_SECONDS, words ×
   READING_SECONDS_PER_WORD)`, with `MIN_HOLD_SECONDS = 2.5` and
   `READING_SECONDS_PER_WORD = 0.35`. All three are first guesses, to tune
   by eye. It is a pure state machine, `docs/src/tour/autoplay.js`,
   stepped by the loop’s `deltaSeconds`, mutating in place, as Plan 12’s
   guess flow is.
5. **Autoplay starts on every arrival at a `presentation` page**, except
   `#5`, which has no script. The visitor’s arrow key, arrow button or
   slider change pauses it for this cake, and still does what it does
   today. The next cake autoplays afresh.
6. **A Play/Pause button sits at the top right**, inside `.controls`, so
   Escape hides it with the rest: a real `<button>` whose icon and
   `aria-label` show the action it takes, “Pause” while playing and “Play”
   while paused. Play resumes from the beat the sliders are at. It shows
   only on a page with a script, and is disabled at the end.
7. **The end of a cake is its last beat**, reached by autoplay or by hand.
   Autoplay stops there. After `END_PROMPT_DELAY_SECONDS = 4`, if the
   visitor has not pressed Right since reaching the end, Plan 12’s
   `.prompt` shows “Press the ‘Right’ key → for the next cake.”, which the
   first Right dismisses.
8. **No performance step.** As in Plan 12, the loop gains one
   constant-time state step, and the DOM is written only when the caption,
   the button or the prompt changes.

## Steps

### Step 1: Write the scripts and the caption rule [P]

- Add `docs/src/tour/scripts.js`, one script per `presentation` page but
  `#5`, from sections 2 to 8 of the notes, per Decisions 1 and 2.
- Add `docs/src/tour/beats.js`: `beatIndexAt()` per Decision 3, and
  `holdSecondsOf(beat)` per Decision 4.
- It should give every presentation page but `#5` a script whose beats
  follow Decision 2 within that cake’s sliders (Agent QA).
- It should give the last beat at or below the sliders (Agent QA).

**Agent QA**

- Do: a `node --input-type=module -e` script that, for each script, checks
  Decision 2 against `revealPartsOf()` and `stepCountOf()` of its recipe,
  and prints `ok` or the first failing page and beat.
- Expect: `ok`, with seven scripts.
- Do: `beatIndexAt()` on the pancake’s beats at `(0, 0)`, `(3, 1)` and
  `(4, 0)`.
- Expect: `0 3 0`.

### Step 2: Model the autoplay [P]

- Add `docs/src/tour/autoplay.js`: `createAutoplay()`,
  `stepAutoplay(autoplay, deltaSeconds, beats, eatenStep, revealStop)`,
  returning the slider move to make this frame, if any, and `pause()`,
  `play()`, `isAtEnd()` and `noteRight()`, with the end prompt’s timing
  of Decision 7.
- It should step one stop per 0.8 s, reveal first, and hold each beat
  for its reading time (Agent QA).
- It should stop at the last beat and ask for the end prompt 4 s later
  (Agent QA).

**Agent QA**

- Do: a `node --input-type=module -e` script that plays the pancake’s
  script in 0.1 s steps, applying each move, and prints each move with
  its time.
- Expect: reveal +1 at 0.8 s after the first beat’s hold, then each eaten
  step, ending at `(4, 1)`, with no move after it, and the end prompt
  asked for 4 s after the last beat.

### Step 3: Caption, play and prompt in the page

- `docs/index.html`: the caption element and the Play/Pause button.
- Add `docs/src/ui/caption.js` and `docs/src/ui/play-button.js`, each
  writing to the DOM only on a change.
- `docs/styles/main.css`: the caption at the bottom centre, above the
  eaten slider, and the button at the top right, with custom properties
  for their sizes and colours, in the page’s light and dark colours.
- `docs/src/main.js`: on a `presentation` page with a script, steps the
  autoplay each frame, applies its moves through `setEatenStep()` and
  `setRevealStop()`, pauses on the visitor’s input per Decision 5, and
  shows the caption and the end prompt.
- It should play each cake from plate to last bite, its captions in
  order, and stop at the end (Manual QA 1, 2).
- It should pause on an arrow key and resume on Play (Manual QA 3, 4).
- It should follow the sliders by hand, back and forth (Manual QA 5).
- It should prompt for Right at the end and walk on (Manual QA 6).

**Agent QA**

- Do: `for f in docs/src/main.js docs/src/ui/caption.js docs/src/ui/play-button.js docs/src/tour/autoplay.js docs/src/tour/beats.js docs/src/tour/scripts.js; do node --check "$f"; done`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
presentation plays from `#pancake` to `#thanks` with only a Right at the
end of each cake.

## Manual QA

Preconditions: run `npx serve docs -p 2222` from the repo root, open
`http://localhost:2222/#fun-facts` in Chrome with the dev tools console
open, and hard-reload. Every step also expects no errors or warnings in
the console.

1. **Do:** Press the fun-facts dialog’s button and watch without touching
   anything.
   - **Expect:** `#pancake` builds and is eaten stop by stop; the title
     “Intro” and one chunk at a time show above the eaten slider, in the
     notes’ order; the top-right button shows Pause, then becomes disabled
     at the end.
2. **Do:** Walk on to `#pepionkh-honey-cake` and watch.
   - **Expect:** The line about sesame seeds appears as the seeds fall.
3. **Do:** While it plays, press Up.
   - **Expect:** The reveal slider steps up, the autoplay stops, and the
     button shows Play.
4. **Do:** Press Play.
   - **Expect:** The autoplay resumes from the caption showing, with no
     jump back.
5. **Do:** On the next cake, press Down and Left to move the sliders back
   and forth by hand.
   - **Expect:** The caption follows the sliders, an earlier chunk
     returning as they move back.
6. **Do:** Let a cake reach its end and wait.
   - **Expect:** About four seconds later, “Press the ‘Right’ key → for
     the next cake.” at the top centre; Right hides it and walks on to
     the next cake, which autoplays.
7. **Do:** On `#custard-pie`, watch to the end.
   - **Expect:** Each joke’s punchline appears one beat after its set-up;
     Right at the end reaches `#thanks`.
8. **Do:** Press Escape on a playing cake, then Space.
   - **Expect:** The controls and the Play/Pause button hide; the caption
     stays; the autoplay carries on; Space stops the turntable only.
9. **Do:** Tab to the Play/Pause button and press Enter.
   - **Expect:** A visible focus ring; Enter toggles it, and its label
     reads the action it takes.
10. **Do:** Load `#5`.
    - **Expect:** No caption and no Play/Pause button.
11. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools’
    device mode, in light and dark colour schemes.
    - **Expect:** The caption wraps within the viewport above the eaten
      slider and reads clearly; the button sits clear of the reveal
      slider.

## Audit

- **2026-11-26T16:38:29Z** — **drafted**: split from the Cake Day tour
  request, after Plan 12. Proposed by the agent: the beat data model and
  the caption rule, the timing constants, the caption’s position, Play
  resuming from the current beat, the button disabled at the end, and the
  end prompt’s 4 s delay.
- **2026-11-26T16:55:03Z** — **ruled**: the Lead Developer accepted every
  agent proposal in the drafted entry.
