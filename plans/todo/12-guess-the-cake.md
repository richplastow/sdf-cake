---
title: Guess the cake
description: "Turns the walk into a tour of pages for first-time visitors: a welcome dialog on an empty stage, prompted guessing for the first four cakes, a fun-facts interlude and a closing thank-you page."
type: plan
---

## Context

- International Cake Day (26 November) needs the app to lead a first-time
  visitor, not drop them on an empty plate. A route with no fragment now
  assumes a visitor who has never used the app, and the cakes become pages
  of a tour, following section 1 of
  [20261126-cake-day.md](../../20261126-cake-day.md#1-guess-the-cake).
- Builds on the walk, the sliders and the transitions of
  [Plan 05](../done/05-transitions.md) and
  [Plan 07](../done/07-sliders.md), and the twelve cakes of
  [Plan 10](../done/10-presentation-prep.md).
- Feeds [Plan 13](13-autoplay-presentation.md), which turns the cakes from
  `#pancake` to `#custard-pie` into an autoplaying presentation. Until it
  lands, those cakes walk by hand as they do today.
- Dialogs use the HTML `<dialog>` element,
  [opened with `show()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show),
  and the hash is written with
  [`history.replaceState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState),
  as `goToCake()` in `docs/src/main.js` writes it today.

## Decisions

1. **The tour is one ordered list of pages**, in a new pure module,
   `docs/src/tour/pages.js`. It replaces the walk round the loop:
   `docs/src/cake/walk.js` and `docs/src/cake/select.js` are deleted, and
   recipe `5` loses `isOffWalk`, since the page list now says what is on
   the tour. The tour does not wrap. Each page is one of four kinds:

   ```json
   [
     { "id": "", "kind": "welcome" },
     { "id": "1", "kind": "guess", "cakeName": "Black Forest Gateau" },
     { "id": "2", "kind": "guess", "cakeName": "Cheesecake" },
     { "id": "3", "kind": "guess", "cakeName": "Victoria Sponge Cake" },
     { "id": "4", "kind": "guess", "cakeName": "Birthday Cake" },
     { "id": "fun-facts", "kind": "interlude" },
     { "id": "pancake", "kind": "presentation" },
     { "id": "thanks", "kind": "interlude" }
   ]
   ```

   with every cake from `pancake` to `custard-pie`, in `RECIPES` order, as
   a `presentation` page between `fun-facts` and `thanks`. A cake page's
   `id` is its recipe's `id`.
2. **A missing or unknown hash names the welcome page.** `#5`, the one
   recipe off the tour, still loads by its hash as a `presentation` page
   with no prompts; Left from it goes to `#4`, Right to `#fun-facts`.
3. **The welcome, fun-facts and thanks pages stage nothing.** The current
   recipe is resolved with every part's presence at 0, so the cake and its
   plate shrink away on the springs, and the camera fits
   `MIN_FIT_RADIUS_METERS`. Arriving on a cake from one of these pages
   starts at eaten step 0 and reveal stop 0, so the plate grows from
   nothing.
4. **Hashes are written with `replaceState()`**, as today; the welcome page
   writes the bare path, with no `#`. Browser Back leaves the app rather
   than stepping through the tour.
5. **Controls by page kind:**

   | Kind         | Sliders  | Left (key, button)  | Right, Up, Down |
   | ------------ | -------- | ------------------- | --------------- |
   | welcome      | disabled | does nothing        | do nothing      |
   | interlude    | disabled | previous page, slow | do nothing      |
   | guess        | as today | as today            | as today        |
   | presentation | as today | as today            | as today        |

   "Slow" is `BACK_WALK_TIME_SCALE`, as Left from a cake's step 0 is today.
   Escape toggles the controls and Space the turntable on every page.
   Disabled means the inputs' and buttons' `disabled` attribute, so they
   leave the tab order.
6. **Right past a cake's last eaten step goes to the next page**, and
   resets the reveal stop to 0, as the walk does today; Left from step 0
   goes to the previous page. From `#4` Right reaches `#fun-facts`; from
   `#custard-pie`, `#thanks`; Left from `#1` reaches the welcome page.
7. **Each dialog closes only by its button.** The three dialogs are
   non-modal `<dialog>` elements opened with `show()`, which Escape does not
   close (per MDN's [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
   reference; untested here). A modal dialog's `cancel` event cannot be
   relied on to stay cancelled, so `showModal()` is not used. The dialog
   centres in the viewport by CSS, and its button takes focus on opening,
   so Enter presses it. Space stays the turntable's, since
   `docs/src/ui/keys.js` takes it in the capture phase.
8. **Dialog copy lives in `docs/index.html`**, one `<dialog>` per page,
   found by a `data-page` attribute:
   - Welcome. Heading: "Happy International Cake Day!" Subheading: "So
     let’s start with… ‘Guess the cake!’" Text: "Up ↑ and Down ↓ build the
     cake layer by layer. Left ← and Right → eat it, and walk between
     cakes. Space stops and starts the turntable, and Escape hides the
     controls. Drag to orbit the cake, scroll or pinch to zoom, and
     double-click to reset the view." Button: "Feed me cake!", to `#1`.
   - Fun facts. Heading: "Fun facts!" Subheading: "Now for a slice of
     cake history." Text: "Each cake tells its own story. Watch, or take
     over with the arrow keys." Button: "Tell me more!", to `#pancake`.
   - Thanks. Heading: "Thanks for watching". Subheading: "Now go eat some
     cake!" Button: "Restart…", to the welcome page.
9. **The guess flow is a pure state machine**, `docs/src/tour/guess.js`,
   stepped by the animation loop's `deltaSeconds`, never `setTimeout()`,
   so it is frame-rate independent and pauses with a hidden tab. It is
   created afresh on each arrival at a `guess` page, and mutates in place,
   so the per-frame path allocates nothing:
   - `GUESS_AUTO_STEP_DELAY_SECONDS = 1`: one second after arriving, if the
     visitor has not moved the reveal slider and its stop is still 0, the
     stop becomes 1, as if Up were pressed.
   - `UP_PROMPT_DELAY_SECONDS = 5`: five seconds after that step, if the
     visitor has still not moved the reveal slider, the Up prompt shows.
     Any change of the reveal slider by the visitor (key, click or drag)
     hides it for good on this arrival.
   - At the reveal slider's top stop, by any means, the guess prompt
     shows, replacing the Up prompt; below the top stop it hides again,
     until Reveal is pressed.
   - Reveal replaces the guess prompt with the name prompt, which stays,
     whatever the reveal slider does, until the visitor's first Right (key
     or button). That Right also does what Right does today.
10. **Prompts share one element**, `.prompt` in `docs/index.html`, at the
    top centre of the viewport, with `role="status"`, so a screen reader
    announces each one. It stays visible when Escape hides the controls.
    Its texts:
    - Up: "Press the ‘Up’ key ↑ for more layers…"
    - Guess: "Make your guess: what cake is this?", with a `<button>`
      "Reveal…"
    - Name: the page's `cakeName` as a heading, and "Press the ‘Right’
      key → for the next cake."
11. **No performance step.** Nothing here runs per pixel or per march step:
    the loop gains one constant-time step of a small state object and
    writes to the DOM only when a prompt changes.

## Steps

### Step 1: Model the tour's pages [P]

- Add `docs/src/tour/pages.js`: the page list of Decision 1, built from
  `RECIPES`; `pageIndexForHash(hash, pages)`, giving the welcome page for a
  missing or unknown hash; `nextPageIndex()` and `previousPageIndex()`,
  each `null` past the tour's ends; and Decision 2's handling of `#5`.
- Delete `docs/src/cake/walk.js` and `docs/src/cake/select.js`; remove
  `isOffWalk` from recipe `5` and its doc comment in
  `docs/src/cake/recipes.js`.
- It should name the welcome page for `""`, `"#"` and `"#nope"` (Agent QA).
- It should order the pages welcome, `1`–`4`, `fun-facts`, `pancake` to
  `custard-pie`, `thanks`, with `null` before the first and after the last
  (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { PAGES, pageIndexForHash } from "./docs/src/tour/pages.js"; console.log(PAGES.map((p) => p.id || "-").join(" "), pageIndexForHash("", PAGES), pageIndexForHash("#nope", PAGES));'`
- Expect: `- 1 2 3 4 fun-facts pancake pepionkh-honey-cake artemis-offering sachertorte bolo-formigueiro banh-bo custard-pie thanks 0 0`
- Do: `node --input-type=module -e 'import { PAGES, nextPageIndex, previousPageIndex } from "./docs/src/tour/pages.js"; console.log(previousPageIndex(0, PAGES), nextPageIndex(PAGES.length - 1, PAGES));'`
- Expect: `null null`
- Do: `grep -rn "walk.js\|select.js\|isOffWalk" docs/src`
- Expect: no output.

### Step 2: Model the guess flow [P]

- Add `docs/src/tour/guess.js`: `createGuess()`, `stepGuess(guess,
  deltaSeconds, revealStop)`, which returns whether to auto-step the
  reveal slider this frame, and `noteRevealByVisitor()`, `noteReveal()`,
  `noteRight()` and `promptOf(guess, revealStop, revealMax)`, giving
  `null`, `"up"`, `"guess"` or `"name"`, per Decision 9.
- It should auto-step once at 1 s, and only from stop 0 untouched
  (Agent QA).
- It should give the Up prompt at 6 s untouched, and never after a
  visitor's change (Agent QA).
- It should give `"guess"` at the top stop and `"name"` after Reveal until
  Right (Agent QA).

**Agent QA**

- Do: a `node --input-type=module -e` script that steps a fresh guess by
  0.5 s twelve times at stop 0 and prints each `stepGuess()` result and
  `promptOf()`.
- Expect: the auto-step is `true` on the second step only; `promptOf()` is
  `null` until the twelfth step, then `"up"`.
- Do: the same with `noteRevealByVisitor()` called after the third step.
- Expect: `promptOf()` never gives `"up"`.
- Do: `promptOf()` at the top stop, then after `noteReveal()`, then after
  `noteRight()`.
- Expect: `guess name null`.

### Step 3: Walk the pages, and stage nothing between cakes

- `docs/src/main.js`: replace `cakeIndex` and `goToCake()` with the
  current page and `goToPage(index, timeScale)`, which stages the page's
  cake, or nothing per Decision 3, writes the hash per Decision 4, and
  applies Decision 5. `stepEaten()` walks pages per Decision 6. The
  `hashchange` listener goes to the page the hash names. Update the
  `@fileoverview`.
- `docs/src/ui/sliders.js` and `docs/src/ui/cake-arrows.js`: add setters
  that disable the sliders, and each arrow button on its own.
- It should show nothing, not an empty plate, on a load with no fragment
  (Manual QA 1).
- It should grow the plate from nothing on arriving at a cake from a page
  that stages nothing (Manual QA 3).
- It should take Right from `#4`'s last step to `#fun-facts`, and from
  `#custard-pie`'s to `#thanks`, shrinking the cake away (Manual QA 8,
  11).
- It should take Left from an interlude, and from `#1`'s step 0, back one
  page slowly, and do nothing on the welcome page (Manual QA 2, 10, 13).

**Agent QA**

- Do: `node --check docs/src/main.js && node --check docs/src/ui/sliders.js && node --check docs/src/ui/cake-arrows.js`
- Expect: no output.
- Do: `grep -n "replaceState" docs/src/main.js`
- Expect: the one call in `goToPage()`, writing the bare path for the
  welcome page.

### Step 4: Show the dialogs and the guess prompts

- `docs/index.html`: the three `<dialog data-page="…">` elements of
  Decision 8 and the `.prompt` element of Decision 10.
- Add `docs/src/ui/dialogs.js`, which shows the dialog of an interlude or
  welcome page with `show()`, focuses its button, closes the rest, and
  calls a handler on each button; and `docs/src/ui/prompt.js`, which shows
  one of Decision 10's prompts, or none, writing to the DOM only on a
  change, and calls a handler on Reveal.
- `docs/styles/main.css`: the dialog centred and the prompt at the top
  centre, with custom properties for their colours, sizes and gaps, in
  the page's light and dark colours, as the arrow buttons have.
- `docs/src/main.js`: steps the guess flow each frame on a `guess` page,
  routes the visitor's reveal changes, Reveal and Right to it, and shows
  `promptOf()`.
- It should close each dialog only by its button, never by Escape
  (Manual QA 2).
- It should step the reveal slider one second after arriving, and prompt
  for Up five seconds later (Manual QA 3, 4).
- It should prompt a guess at the top stop, name the cake on Reveal, and
  dismiss the name on the first Right (Manual QA 5–7).
- It should take Restart… back to the welcome page (Manual QA 12).

**Agent QA**

- Do: `for f in docs/src/main.js docs/src/ui/dialogs.js docs/src/ui/prompt.js docs/src/tour/guess.js docs/src/tour/pages.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -c "<dialog" docs/index.html`
- Expect: `3`
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and a load
with no fragment leads, by buttons and arrow keys alone, through the
welcome dialog, the four guessed cakes, the fun-facts dialog, the
presentation cakes and the thanks dialog, back to the welcome dialog.

## Manual QA

Preconditions: run `npx serve docs -p 2222` from the repo root, open
`http://localhost:2222/` (no `#`) in Chrome with the dev tools console
open, and hard-reload. Keep the console in view throughout: every step
also expects no errors or warnings.

1. **Do:** Look at the page after the reload.
   - **Expect:** No plate or cake; a centred dialog headed "Happy
     International Cake Day!" with its subheading, help text and a
     focused "Feed me cake!" button; both sliders and both arrow buttons
     greyed out.
2. **Do:** Press Up, Down, Left and Right, then Escape twice, then Tab.
   - **Expect:** The arrows do nothing; Escape hides and shows the
     controls but the dialog stays; Tab never reaches a slider or arrow
     button.
   - **Why:** A modal `cancel` or an ungated key would let the visitor
     past the welcome.
3. **Do:** Press "Feed me cake!".
   - **Expect:** The dialog closes, the address bar ends `#1`, the plate
     grows from nothing, and about a second later the first layer rises
     and the reveal slider moves up one stop.
4. **Do:** Touch nothing for six seconds.
   - **Expect:** "Press the ‘Up’ key ↑ for more layers…" at the top
     centre. Press Up: it goes and does not come back.
5. **Do:** Press Up until the reveal slider is at the top.
   - **Expect:** "Make your guess: what cake is this?" with a "Reveal…"
     button. Press Down once: it hides; Up again: it is back.
6. **Do:** Press "Reveal…".
   - **Expect:** "Black Forest Gateau" with "Press the ‘Right’ key → for
     the next cake."
7. **Do:** Press Right repeatedly.
   - **Expect:** The first press hides the name and eats a slice; the
     presses walk on to `#2`, where steps 3 to 6 repeat with
     "Cheesecake", and likewise `#3` "Victoria Sponge Cake" and `#4`
     "Birthday Cake".
8. **Do:** On `#4`, press Right until it walks on.
   - **Expect:** The address bar ends `#fun-facts`; the cake and plate
     shrink to nothing; the fun-facts dialog shows; the sliders and the
     Right arrow are greyed out, the Left arrow is not.
9. **Do:** Press its button.
   - **Expect:** `#pancake`, its plate growing from nothing, with no
     prompts; it walks by hand as before this plan.
10. **Do:** Press Left at the pancake’s step 0, then Left on `#fun-facts`.
    - **Expect:** Back to `#fun-facts` (cake shrinking away slowly), then
      to `#4`, its plate growing slowly, then its first layer after a
      second.
11. **Do:** Walk on with Right to the last cake, `#custard-pie`, and past
    its last step.
    - **Expect:** `#thanks`; the cake and plate shrink to nothing; a dialog
      "Thanks for watching", "Now go eat some cake!", "Restart…".
12. **Do:** Press "Restart…".
    - **Expect:** The welcome dialog, with the address bar showing no `#`.
13. **Do:** Press "Feed me cake!", then Left at once.
    - **Expect:** `#1` shrinks away slowly and the welcome dialog returns;
      Left there does nothing.
14. **Do:** Load `http://localhost:2222/#nope`, then `#5`, then
    `#fun-facts`.
    - **Expect:** The welcome page; the off-tour cake with no prompts; the
      fun-facts dialog over an empty stage.
15. **Do:** Repeat steps 1, 3 and 6 at a phone-sized viewport in the dev
    tools' device mode, in light and dark colour schemes.
    - **Expect:** The dialog fits the viewport with no horizontal scroll;
      the prompt never covers the reveal slider; both read clearly in
      both schemes.

**Looks wrong, but isn't:** Space never presses a dialog's button (it
stays the turntable's; Enter and a click do), and browser Back leaves the
app rather than stepping back through the tour.

## Audit

- **2026-11-26T16:38:29Z** — **drafted**: split from the Cake Day tour
  request; the autoplaying presentation follows in Plan 13. Proposed by
  the agent: the fun-facts copy, the welcome help text, the prompt
  position, the stop-0 condition on the auto-step, the guess prompt
  hiding below the top stop, `#5`’s neighbours, the stage-nothing arrival
  at reveal stop 0, and deleting `walk.js`, `select.js` and `isOffWalk`.
- **2026-11-26T16:55:03Z** — **ruled**: the Lead Developer accepted every
  agent proposal in the drafted entry, with the fun-facts copy folded into
  Decision 8, and set the first cake’s name to “Black Forest Gateau”
  (no accent).
