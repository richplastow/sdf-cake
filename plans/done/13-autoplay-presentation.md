---
title: Autoplay presentation
description: Captions the cakes from the pancake to the custard pie with sections 2 to 8 of the Cake Day notes, one chunk per slider position, autoplays each cake with a Play/Pause button, and keeps the visitor's slider moves to autoplay's path.
type: plan
---

## Context

- After the fun-facts interlude of [Plan 12](./12-guess-the-cake.md), each
  cake from `#pancake` to `#custard-pie` tells its part of the story in
  sections 2 to 8 of
  [20261126-cake-day.md](../../20261126-cake-day.md#2-intro-pancake): the
  pancake, the Pepi’Onkh honey cake, the Artemis offering, the
  Sachertorte, the Bolo Formigueiro, the Bánh Bò and, for the jokes, the
  custard pie.
- Depends on Plan 12: its page list (`docs/src/tour/pages.js`), its
  `presentation` page kind, which has no reveal cap and no walk-on gate,
  its `.prompt` element, whose parts show by their `data-prompt` kind
  (`docs/src/ui/prompt.js`), and its pure, per-frame state machines,
  which this plan follows.
- Each caption is tied to a position of the two sliders, so the text
  arrives in order whether the sliders are moved by hand or by the
  autoplay, and a line such as “with sesame seeds on top” appears as the
  seeds fall.

## Decisions

1. **A script is a list of beats per `presentation` page**, in a new data
   module, `docs/src/tour/scripts.js`, which exports them as `SCRIPTS`. A
   beat is a slider position and one short chunk of text, plain text with
   curly quotes and no markup. The title is the section’s, shown above
   every beat. The pancake’s script is this example, word for word:

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
   section fits; the custard pie’s 8 hold Tim Vine’s three jokes, a
   set-up and a punchline each. The text is the section’s, cut into
   chunks. The first chunk that names one of these parts sits at the
   reveal stop that brings the part in, with the beat before it below
   that stop: the Pepi’Onkh honey cake’s honey (stop 2) and sesame seeds
   (stop 5), the Artemis offering’s candles (stop 8), the Sachertorte’s
   apricot jam (stop 2) and chocolate seal (stop 6), and the Bolo
   Formigueiro’s sprinkles (stop 3), as revealPartsOf() orders them. The Pepi’Onkh’s
   vacuum seal is no part, and the custard pie’s jokes name none. So the
   Artemis opening is cut before “putting candles on cakes”, and a
   sentence naming two parts, such as the Sachertorte’s settlement, is
   cut between them. The Sachertorte’s first two beats hold 15 words or
   fewer each, and its background not needed before the seal (the head
   chef falling ill, Hotel Sacher’s bankruptcy, Sacher’s son joining
   Demel) follows the seal at the eaten steps, lightly bridged.
3. **The caption is a pure function of the sliders**, `beatIndexAt(beats,
   eatenStep, revealStop)` in `docs/src/tour/beats.js`: the last beat
   whose `eaten` and `reveal` are both at or below the sliders. Moving a
   slider back, as Decision 9 allows, shows the earlier caption. The
   caption shows at the bottom centre, above the eaten slider, like a
   subtitle, clear of the reveal slider up the right as the prompt is,
   with `role="status"`, and stays visible when Escape hides the
   controls.
4. **Autoplay holds a beat, then moves one stop at a time to the next.**
   Arrival and Play each start at the beat the sliders are at, by
   beatIndexAt(). Autoplay holds that beat for `max(MIN_HOLD_SECONDS,
   words × READING_SECONDS_PER_WORD)`, with `MIN_HOLD_SECONDS = 2.5` and
   `READING_SECONDS_PER_WORD = 0.35`, a word being a run of
   non-whitespace characters, counted without allocating. Then, every
   `AUTOPLAY_STEP_SECONDS = 0.8`, it moves one slider up one stop towards
   the next beat: the reveal slider while it is below the next beat’s
   stop, else the eaten slider. It never moves a slider down, so a cake
   arrived at part-revealed carries on from there. On reaching a later
   beat it holds that one. All three are first guesses, to tune by eye.
   It is a pure state machine, `docs/src/tour/autoplay.js`, stepped by
   the loop’s `deltaSeconds`, mutating in place, as Plan 12’s guess flow
   is.
5. **Autoplay starts on every arrival at a `presentation` page**, the
   page load included, except `#5`, which has no script. The visitor’s
   arrow key, arrow button or slider change pauses it for this cake, even
   when Decision 9 blocks the move, and otherwise does what it does today
   within that gate; the pause is noted before the input acts, so a Left
   or Right that walks to another cake leaves that cake’s autoplay
   playing. Autoplay’s own moves never pause it. The next cake
   autoplays afresh.
6. **A Play/Pause button sits at the top right**, inside `.controls`, so
   Escape hides it with the rest: a real `<button>` whose icon and
   `aria-label` show the action it takes, “Pause” while playing and “Play”
   while paused or stopped. Play resumes from the beat the sliders are
   at, holding it afresh. It shows only on a page with a script, and at
   the end, where autoplay has stopped, it shows Play, disabled.
7. **The end of a cake is its last beat**, reached by autoplay or by hand.
   Autoplay stops there. Once the sliders have stayed at the end for
   `END_PROMPT_DELAY_SECONDS = 4`, playing or paused, and the visitor has
   not pressed Right since reaching it, Plan 12’s `.prompt` shows a new
   kind, `"end"`: “Press the ‘Right’ key → for the next cake.”, which the
   first Right dismisses. Leaving the end resets both.
8. **No performance step.** As in Plan 12, the loop gains one
   constant-time state step, and the DOM is written only when the caption,
   the button or the prompt changes.
9. **The visitor’s moves keep to autoplay’s path.** On a page with a
   script, the sliders only ever sit on the path: the positions autoplay
   visits from `(0, 0)` to the last beat, one stop per move, reveal
   before eaten towards each next beat, as Decision 4 moves. `pathOf()`
   in `docs/src/tour/path.js` builds it once per arrival, never per
   frame. From path position k, only the slider that moves at k → k+1 may
   move forward, and only the one that moved at k−1 → k back, one stop per
   arrow key, arrow button or slider `input` event, however far a drag or
   click asks; any other move is blocked, and the slider’s thumb snaps
   back. Left at eaten step 0 still walks back a page; Right past the last
   eaten step walks on only at the path’s end. A walk back arrives at
   eaten step 0 with its reveal stop capped to the path’s greatest there;
   arriving forward lands at `(0, 0)`, as before. Guess pages and `#5`
   are not gated.
10. **A blocked move prompts the key that works.** Plan 12’s `.prompt`
    shows a hint: forward, “Next, press the ‘Up’ key ↑” or “Next, press
    the ‘Right’ key →”; back, “To go back, press the ‘Down’ key ↓” or “To
    go back, press the ‘Left’ key ←”, as kinds `"next-up"`,
    `"next-right"`, `"back-down"` and `"back-left"`. It stays until the
    sliders next move or the page changes, and outranks the end prompt.
    The arrow buttons stay enabled, so a blocked press shows its hint.

## Steps

### Step 1: Write the scripts and the caption rule

- Add `docs/src/tour/scripts.js`, one script per `presentation` page but
  `#5`, from sections 2 to 8 of the notes, per Decisions 1 and 2.
- Add `docs/src/tour/beats.js`: `beatIndexAt()` per Decision 3, and
  `holdSecondsOf(beat)` per Decision 4.
- It should give every presentation page but `#5` a script whose beats
  follow Decision 2 within that cake’s sliders, the Sachertorte’s first
  two at 15 words or fewer (Agent QA).
- It should caption the last beat at or below the sliders (Agent QA).

**Agent QA**

- Do: a `node --input-type=module -e` script that checks `SCRIPTS`
  against `PAGES`, and each script against `revealPartsOf()` and
  `stepCountOf()` of its recipe: one script for each `presentation` page
  but `#5` and no other; a title; every beat’s text present, with no
  `'`, `"`, `*`, `_`, `<` or `>`; the first beat at `(0, 0)`; each later
  beat at or above the one before on both sliders and above it on one;
  the last at the last eaten step and the top reveal stop; and for each
  part Decision 2 names, the first beat whose text contains its word
  (`honey`, `sesame`, `candles`, `apricot jam`, `seal`, `sprinkles`,
  ignoring case) at that part’s stop, with the beat before it below; and
  the Sachertorte’s first two beats at 15 words or fewer. It prints `ok`
  and the count, or the first failing page and beat.
- Expect: `ok 7`.
- Do: `beatIndexAt()` on the pancake’s beats at `(0, 0)`, `(3, 1)` and
  `(4, 0)`, each pair `(eatenStep, revealStop)`.
- Expect: `0 3 0`.

### Step 2: Model the autoplay

- Add `docs/src/tour/autoplay.js`: `createAutoplay()`;
  `stepAutoplay(autoplay, beats, deltaSeconds, eatenStep, revealStop)`,
  returning the move to make this frame, `"reveal"` or `"eaten"`, each
  one stop up, or `null`, and keeping the end’s timing whether playing or
  paused; and `pause(autoplay)`, `play(autoplay)`, `isAtEnd(autoplay)`,
  `isEndPromptDue(autoplay)` and `noteRight(autoplay)`, per Decisions 4,
  6 and 7. The state holds whether it is paused, so the button can show
  its action.
- It should hold each beat for its reading time, then step one stop per
  0.8 s, reveal first, never down (Agent QA).
- It should stop at the last beat and ask for the end prompt 4 s later,
  playing or paused, unless Right was pressed (Agent QA).
- It should make no move while paused, and hold the beat afresh on Play
  (Agent QA).

**Agent QA**

Each script runs in 0.1 s steps, applying each move to its own sliders,
and prints each move with the seconds since the previous one, or since
the start, and the seconds from the last move, or from the hand move, to
the first frame the end prompt is due. Times hold to within 0.1 s.

- Do: play the pancake’s script from `(0, 0)` for 40 s.
- Expect: `reveal 7.1, eaten 6.05, eaten 3.3, eaten 5.0, eaten 0.8`,
  ending at `(4, 1)` with no move after it, and the end prompt due 4.0 s
  after the last move. The holds are 18, 15, 6 and 12 words: 6.3, 5.25,
  2.5 (the floor) and 4.2 s, each followed by 0.8 s to the move.
- Do: play the beats `(0, 0, "a")` and `(2, 2, "b")` from `(0, 0)`, then
  from `(0, 3)`.
- Expect: from `(0, 0)`, `reveal 3.3, reveal 0.8, eaten 0.8, eaten 0.8`,
  ending at `(2, 2)`; from `(0, 3)`, `eaten 3.3, eaten 0.8`, ending at
  `(2, 3)`, with no reveal move.
- Do: play the pancake’s script, pause() at 1 s and play() at 9 s.
- Expect: no move while paused, though one was due at 7.1 s; the first
  move 7.1 s after Play, at 16.1 s.
- Do: play the pancake’s script, pause() at 0.5 s and set the sliders by
  hand to `(4, 1)`.
- Expect: no move; isAtEnd() true; the end prompt due 4.0 s after the
  hand move.
- Do: play the pancake’s script to its end, and call noteRight() 1 s
  after the last move.
- Expect: the end prompt never due.
- Do: play the pancake’s script from `(3, 1)`, pause() and noteRight(),
  then set the sliders by hand to `(4, 1)`.
- Expect: the end prompt due 4.0 s after the hand move, as a Right short
  of the end dismisses nothing.
- Do: set the pancake’s sliders by hand to `(4, 1)`, call noteRight() at
  1 s, set them to `(3, 1)` at 3 s and back to `(4, 1)` at 5 s.
- Expect: the end prompt due 4.0 s after the return, not before, as
  leaving the end resets its time and the Right.

### Step 3: Caption, play and prompt in the page

- `docs/index.html`: the caption element, outside `.controls`; the
  Play/Pause button inside `.controls`; and a `data-prompt="end"` part in
  `.prompt` holding Decision 7’s text.
- `docs/src/ui/prompt.js`: its doc comment lists the `"end"` kind.
- Add `docs/src/ui/caption.js` and `docs/src/ui/play-button.js`, each
  writing to the DOM only on a change.
- `docs/styles/main.css`: the caption at the bottom centre, above the
  eaten slider, clear of the reveal slider; the button fixed at the top
  right, out of the bar’s flow as the reveal slider is; and
  `--prompt-side-clearance` widened, through a `calc()` of the button’s
  custom properties, so the top-centre prompt clears the button. Custom
  properties for their sizes and colours, in the page’s light and dark
  colours.
- `docs/src/main.js`: creates the autoplay on load and in goToPage() for
  a `presentation` page with a script, else `null`, as `guess` is; steps
  it each frame and applies its moves through `setEatenStep()` and
  `setRevealStop()`; pauses it per Decision 5 in goLeft(), goRight(),
  revealByVisitor() and the two slider handlers, before each acts, and
  never in stepEaten(), stepReveal() or the setters, which its own moves
  use; notes Right in goRight(); and shows the caption, the button and
  the prompt, the guess flow’s kind on a `guess` page, else `"end"` when
  isEndPromptDue(), else none.
- It should play each cake from plate to last bite, its captions in
  order, and stop at the end (Manual QA 1, 2).
- It should pause on an arrow key and resume on Play (Manual QA 3, 4).
- It should follow the sliders by hand, back and forth (Manual QA 5).
- It should prompt for Right at the end and walk on (Manual QA 6).
- It should pause only on the visitor’s input (Agent QA, Manual QA 3).

**Agent QA**

- Do: `for f in docs/src/main.js docs/src/ui/caption.js docs/src/ui/play-button.js docs/src/ui/prompt.js docs/src/tour/autoplay.js docs/src/tour/beats.js docs/src/tour/scripts.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -n "pause(" docs/src/main.js`
- Expect: calls only within goLeft(), goRight(), revealByVisitor(), the
  `onEaten` and `onReveal` handlers, and the Play/Pause button's
  `onPress` handler, whose Pause is Decision 6’s.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

### Step 4: Keep the visitor’s moves to autoplay’s path

- Add `docs/src/tour/path.js`: `pathOf(beats)`;
  `gateMove(delta, eatenStep, path, revealStop, slider)`, giving the
  stops a move may take, the sign of `delta` or 0; `hintOf(delta,
  eatenStep, path, revealStop)`, the blocked move’s prompt kind; and
  `startRevealMaxOf(path)`, the walk back’s cap; per Decisions 9 and 10.
- `docs/index.html`: four `data-prompt` parts holding Decision 10’s
  hints; `docs/src/ui/prompt.js`: its doc comment lists them.
- `docs/src/main.js`: builds the path where it creates the autoplay;
  gates goLeft(), goRight(), revealByVisitor() and the two slider
  handlers through one helper, gatedDeltaOf(), after each pauses
  autoplay, which sets the hint on a block; clears the hint in the two
  setters and goToPage(); caps a walk back’s reveal stop by
  startRevealMaxOf(); and shows the hint before the end prompt.
- It should let only the path’s next move forward and its last move
  back, one stop per key, press or slider event, walking off the eaten
  slider’s ends as Decision 9 says (Agent QA, Manual QA 12, 13).
- It should show the hint for the key that works when a move is blocked,
  until the sliders next move or the page changes (Agent QA, Manual QA
  12).
- It should land a walk back on the path, and autoplay along the path
  from every position on it (Agent QA, Manual QA 14).
- It should leave guess pages and `#5` ungated (Manual QA 10).

**Agent QA**

- Do: a `node --input-type=module -e` script that prints pathOf() of the
  pancake’s beats, and checks every script’s path: its length the cake’s
  positions, from `(0, 0)`, one stop up per move, through every beat.
- Expect: `pancake 0,0 0,1 1,1 2,1 3,1 4,1` and `paths 7`.
- Do: for every script, and the made-up beats `(0, 0)`, `(1, 0)`,
  `(1, 2)`, `(3, 2)` and `(3, 3)`, whose reveal rises after eating and
  whose last move is the reveal’s, call gateMove() at every path
  position for the eaten and reveal sliders, each way, asking 1, 2 and 3
  stops; expect the sign when the move reaches the next or previous path
  position, or is Left at eaten step 0, or Right at the path’s end, else
  0; and for each blocked move, hintOf() naming the key gateMove() lets
  through that way.
- Expect: `gate 70 positions, 170 moves allowed, 0 bad`.
- Do: per script, then the made-up beats, startRevealMaxOf(), checking
  that every reveal stop of the cake, capped by it, is on the path at
  eaten step 0, and one above it is not.
- Expect: `lands 1 5 8 6 3 3 4 0`.
- Do: on the made-up beats at `(0, 1)`, off the path, gateMove() for
  Right, Up, Down and Left, then hintOf() forward.
- Expect: `off 0 0 0 -1 null`.
- Do: stepAutoplay() on a fresh autoplay, with a 100 s step, at every
  path position of every script and the made-up beats.
- Expect: `autoplay 70/70`: each moves to the next position, and the
  last makes no move.
- Do: `node --check docs/src/tour/path.js; grep -n "gatedDeltaOf(\|startRevealMaxOf(\|hint = " docs/src/main.js`
- Expect: no parse output; besides comments and the hint’s declaration,
  gatedDeltaOf() called only within revealByVisitor(), goLeft(),
  goRight(), `onEaten` and `onReveal`; startRevealMaxOf() only in
  goToPage(); the hint set only in gatedDeltaOf(), and cleared in
  goToPage(), setEatenStep() and setRevealStop().

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
     notes’ order; the top-right button shows Pause, then Play, disabled,
     at the end.
2. **Do:** Walk on to `#pepionkh-honey-cake` and watch.
   - **Expect:** The line about sesame seeds appears as the seeds fall.
3. **Do:** Walk on to `#artemis-offering` and, while the reveal slider is
   below its top, press Up.
   - **Expect:** The reveal slider steps up, the autoplay stops, and the
     button shows Play.
4. **Do:** Press Play.
   - **Expect:** The button shows Pause; the caption showing stays for
     its reading time, then the sliders move on from where they are,
     never back.
5. **Do:** On the next cake, once autoplay has moved both sliders up,
   press Down, then Left back to eaten step 0, then Down; then Up and
   Right to move on again by hand, each as the hint names.
   - **Expect:** The first Down moves nothing and shows “To go back,
     press the ‘Left’ key ←” at the top centre. The sliders then retrace
     autoplay’s moves one stop at a time, the caption following them, an
     earlier chunk returning as they move back.
6. **Do:** Let a cake reach its end and wait.
   - **Expect:** About four seconds later, “Press the ‘Right’ key → for
     the next cake.” at the top centre; Right hides it and walks on to
     the next cake, which autoplays.
7. **Do:** On `#custard-pie`, watch to the end.
   - **Expect:** Three Tim Vine jokes, the sponge front door, the
     tiramisu and the hundreds and thousands, each punchline one beat
     after its set-up, and no cake-shop pun; Right at the end reaches
     `#thanks`.
8. **Do:** Press Escape on a playing cake, then Space.
   - **Expect:** The controls and the Play/Pause button hide; the caption
     stays; the autoplay carries on; Space stops the turntable only.
9. **Do:** Tab to the Play/Pause button and press Enter.
   - **Expect:** A visible focus ring; Enter toggles it, and its label
     reads the action it takes.
10. **Do:** Load `#5`, and move both sliders by hand.
    - **Expect:** No caption and no Play/Pause button; the sliders move
      freely, as before, and no hint shows. The guess pages move as
      before too.
11. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools’
    device mode, in light and dark colour schemes, and wait at the end.
    - **Expect:** The caption wraps within the viewport above the eaten
      slider, clear of the reveal slider, and reads clearly; the button
      sits clear of the reveal slider and of the end prompt.
12. **Do:** Load `#sachertorte` and, at the first caption, press Right,
    then Down, then Up.
    - **Expect:** The first caption is short, and “He invented The
      Sachertorte.” follows on Up. Right moves nothing, pauses autoplay
      and shows “Next, press the ‘Up’ key ↑” at the top centre; Down
      moves nothing and shows “To go back, press the ‘Left’ key ←”; Up
      moves on and hides the hint. After the seal falls, the head chef,
      the bankruptcy and the Sweet Seven Years’ War follow on the eaten
      steps.
13. **Do:** On a cake whose reveal slider is part-way up, drag its thumb
    to the top in one sweep, then click far along the eaten slider’s
    track.
    - **Expect:** Each slider moves only while it is the path’s next
      move, one stop per movement, and its thumb snaps back where it may
      not go; the hint names the key that works.
14. **Do:** From `#bolo-formigueiro` at its first caption, press Left.
    - **Expect:** The Sachertorte arrives at eaten step 0, on a caption
      in order; Right or Up, as the hint says, carries on from there.

## Audit

- **2026-11-26T16:38:29Z** — **drafted**: split from the Cake Day tour
  request, after Plan 12. Proposed by the agent: the beat data model and
  the caption rule, the timing constants, the caption’s position, Play
  resuming from the current beat, the button disabled at the end, and the
  end prompt’s 4 s delay.
- **2026-11-26T16:55:03Z** — **ruled**: the Lead Developer accepted every
  agent proposal in the drafted entry.
- **2026-11-26T18:58:14Z** — **reviewed**: checked against Plan 12’s
  final code; no Major finding. Fixed: the end prompt as a new `"end"`
  kind in `.prompt`, and where pauses go in `main.js`; part-named beats
  listed per cake (the Pepi’Onkh’s vacuum seal is no part); the pancake
  pinned to Decision 1’s example; autoplay’s timing, never-down moves,
  Play’s fresh hold and the end timing while paused pinned; Play shown
  disabled at the end; `stepAutoplay()` arguments A-Z and its return
  pinned; `[P]` dropped, as Step 2 uses Step 1; the prompt’s clearance of
  the button; Agent QA pinned, after modelling `beatIndexAt()`,
  `holdSecondsOf()`, the autoplay and the scripts check in Node, where 26
  mutants each failed a line; Manual QA 1, 3, 4 and 11 sharpened.
- **2026-11-26T19:08:06Z** — **implemented**: Steps 1 to 3. Added
  `docs/src/tour/{scripts,beats,autoplay}.js` and
  `docs/src/ui/{caption,play-button}.js`; changed `docs/index.html`, the
  `docs/src/ui/prompt.js` doc comment, `docs/styles/main.css` and
  `docs/src/main.js`. Agent QA: Step 1 prints `ok 7` and `0 3 0`; Step 2
  prints `reveal 7.2, eaten 6.1, eaten 3.3, eaten 5.1, eaten 0.8`, ending
  at `(4, 1)` with the end prompt due 4.0 s after the last move, each
  within 0.1 s, the extra frame being floating-point rounding of 0.1 s
  steps; the other Step 2 lines as expected; Step 3 parses and its grep
  finds pause() only where its Expect says. Step 3’s grep Expect also
  names the Play/Pause button’s `onPress` handler, since Decision 6’s
  Pause must call pause(). Manual QA unchanged. Scripts: the Artemis
  opening cut before “putting candles on cakes” with an ellipsis either
  side; the Sachertorte’s story before the jam held in two long beats at
  stops 0 and 1, and its settlement split between the jam (stop 2) and
  the seal (stop 6); the custard pie’s four jokes fill all eight
  positions.
- **2026-11-26T19:08:06Z** — **verified**: agent checks pass: 7 modules
  parse, no long lines but the favicon’s, `/` and every changed file
  served with status 200 by the server already on port 2222, vendored
  checksums match; browser not run.
- **2026-11-26T19:14:06Z** — **quality-checked**: Fixed: no code; Step 2
  Agent QA gained two lines, a Right short of the end then the end by
  hand, and leaving the end and coming back, since mutants dropping
  noteRight()’s end check or either reset on leaving the end passed every
  earlier line (a Right one step short would have stopped the end prompt
  for good); Manual QA 5 now waits for autoplay to move both sliders up,
  as Left at step 0 walks back a cake. Deferred: long Sachertorte beats
  (38 and 43 words) may stand tall over the cake at phone width, left to
  Manual QA 11, as no browser ran; a move frame allocates through
  stageCake() in setRevealStop(), once per move, as the guess flow’s
  stepReveal(1) does. Verified fine: Step 1 `ok 7` and `0 3 0` against
  the current recipes (Artemis top stop 8, last step 4, candles at the
  decorations stop) and every beat’s text against the notes; Step 2 at
  0.1 s gives 7.2 and 5.1, and at exact 0.125 s steps 7.125 and 5.0, so
  the extra frame is float accumulation, not an off-by-one; 17 mutants
  of `beats.js` and `autoplay.js` each fail a line; per-frame path
  (stepAutoplay(), beatIndexAt(), promptKindNow(), playActionNow(),
  showCaption(), showPlayButton()) allocates nothing; pauses only in
  goLeft(), goRight(), revealByVisitor(), `onEaten`, `onReveal` and
  `onPress`; noteRightAtEnd() before stepEaten(); `.play-button[hidden]`
  outranks `.play-button`, icons chosen by `data-action`; Escape hides
  the button by opacity and pointer, leaving the caption; no Three.js
  resource or API added; agent checks 1 to 4 pass.
- **2026-11-26T19:45:14Z** — **ruled**: after manual QA (“Works well”),
  the Lead Developer ruled three changes: remove the Classic British
  Cake-Shop Pun from the custard pie; cut the Sachertorte’s first two
  beats short, moving background after the chocolate seal falls; and a
  “dual unlocking” gate, so dragging or arrows must follow autoplay’s
  order, with hints at the top saying what to press next when blocked.
- **2026-11-26T19:45:14Z** — **implemented**: the rulings. Changed
  `docs/src/tour/scripts.js` (Sachertorte re-cut to 15, 15, 11, 15, 15,
  15, 15 and 25 words; custard pie’s three jokes at `(0, 0)`/`(0, 1)`,
  `(0, 3)`/`(0, 4)` and `(2, 4)`/`(3, 4)`), `docs/src/main.js`,
  `docs/index.html` and the `docs/src/ui/prompt.js` doc comment; added
  `docs/src/tour/path.js`. Plan: Decisions 2, 3 and 5 amended, 9 and 10
  added; Step 1’s first criterion and scripts check gained the
  Sachertorte’s length; Step 4 added, with four criteria and six Agent
  QA lines; Manual QA 5, 7 and 10 rewritten, 12 to 14 added. Agent QA:
  Step 1 `ok 7` and `0 3 0`; Step 2’s pancake line as before (`reveal
  7.2, eaten 6.1, eaten 3.3, eaten 5.1, eaten 0.8`); Step 3 parses, its
  grep unchanged; Step 4 as each Expect says, its checks failing first
  on the missing module. Twelve mutants of `path.js` each fail a Step 4
  line: the other slider let through, a two-stop drag, the wrong back
  slider, two walk-ons before the end, three walk-back landings off the
  path, no walk back mid-reveal, an open gate off the path, swapped
  hints and eaten-before-reveal paths. The walk-back cap never bites on
  today’s scripts, whose start maximum is the top stop; the made-up
  beats test it. Hint wording kept as ruled.
- **2026-11-26T19:45:14Z** — **verified**: agent checks pass: 8 modules
  parse, no long lines but the favicon’s, `/` and every changed file
  served with status 200 by a server this stage started and stopped,
  vendored checksums match; browser not run.
- **2026-11-26T19:49:56Z** — **quality-checked**: Fixed: no code;
  Manual QA 13 now starts with the reveal slider part-way up, as every
  path reveals first, so on a cake part-way along its eaten steps the
  reveal drag fires no `input` and tests nothing. Deferred: a drag of
  the eaten slider cannot walk to another cake, as the range input
  clamps at 0 and its `max` and fires nothing past them, while Left and
  Right do, as before the gate; the hints name keys a phone has none of
  but the Left and Right arrow buttons, as ruled. Verified fine: the
  rulings’ diff and `path.js`: one stop per `input` event, the thumb
  snapped back by showSliders(), the whole delta where `path` is `null`;
  the guess and path caps in goToPage() are both minima, so their order
  is moot, and every script’s path is on it at eaten step 0 up to its
  start maximum; the hint cleared by autoplay’s moves only after Play,
  as every block pauses first; noteRightAtEnd() before the gate, which
  passes Right at the path’s end, the made-up beats’ reveal-last end
  included; Up at the top stop prompts Right; Down at `(0, 0)` prompts
  Left, which walks back a cake from every reveal stop at eaten step 0;
  promptKindNow() allocates nothing; Manual QA 5, 12 and 14 against the
  paths (all reveal first, the Sachertorte’s `(0, 0)` to `(0, 6)` then
  eaten); captions at most 25 words; agent checks 1 to 4 pass, with a
  server this run started and stopped; browser not run.
- **2026-11-26T21:38:41Z** — **done**: the Lead Developer’s manual QA
  passed, both the first walk and the re-check after three rulings (the
  pun dropped, the Sachertorte re-cut, the path gate and its hints).
