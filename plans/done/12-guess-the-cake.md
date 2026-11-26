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
  [Plan 05](./05-transitions.md) and
  [Plan 07](./07-sliders.md), and the twelve cakes of
  [Plan 10](./10-presentation-prep.md).
- Feeds [Plan 13](./13-autoplay-presentation.md), which turns the cakes from
  `#pancake` to `#custard-pie` into an autoplaying presentation. Until it
  lands, those cakes walk by hand as they do today.
- Dialogs use the HTML `<dialog>` element,
  [opened with `show()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show),
  and the hash is written with
  [`history.replaceState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState),
  as `goToCake()` in `docs/src/main.js` writes it today.

## Decisions

1. **The tour is one ordered list of pages**, `PAGES`, in a new pure
   module, `docs/src/tour/pages.js`. It replaces the walk round the loop:
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
     { "id": "5", "kind": "presentation", "isOffTour": true },
     { "id": "fun-facts", "kind": "interlude" },
     { "id": "pancake", "kind": "presentation" },
     { "id": "thanks", "kind": "interlude" }
   ]
   ```

   with every cake from `pancake` to `custard-pie`, in `RECIPES` order, as
   a `presentation` page between `fun-facts` and `thanks`. A cake page's
   `id` is its recipe's `id`. `isOffTour`, when true, leaves a page off
   the tour's steps.
2. **A missing or unknown hash names the welcome page.** `#5`, the one
   recipe off the tour, still loads by its hash as a `presentation` page
   with no prompts. Stepping from `#4` or `#fun-facts` skips it, and from
   it the steps reach its list neighbours: Left goes to `#4`, Right to
   `#fun-facts`.
3. **The welcome, fun-facts and thanks pages stage nothing.** The current
   recipe is resolved with every part's presence at 0, so the cake and its
   plate shrink away on the springs, and the camera fits
   `MIN_FIT_RADIUS_METERS`. A load on one of these pages holds the first
   recipe, `1`, with nothing shown. Arriving on a cake from one of these pages
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
   `#custard-pie`, `#thanks`; Left from `#1` reaches the welcome page. On
   a `guess` page, Right goes on only once Reveal has been pressed on this
   arrival; until then it stays, and prompts for Reveal (Decision 9).
7. **Each dialog closes only on leaving its page**: by its button, by
   Left from an interlude, or by a hash change. The three dialogs are
   non-modal `<dialog>` elements opened with `show()`, which Escape does not
   close (per MDN's [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
   reference; untested here). A modal dialog's `cancel` event cannot be
   relied on to stay cancelled, so `showModal()` is not used. The dialog
   centres in the viewport by CSS, and its button takes focus on opening,
   so Enter presses it. Space stays the turntable's, since
   `docs/src/ui/keys.js` takes it in the capture phase.
8. **Dialog copy lives in `docs/index.html`**, one `<dialog>` per page,
   found by a `data-page` attribute holding its page's `id`: `welcome`
   for the welcome page, `fun-facts` and `thanks`:
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
   - `UP_PROMPT_DELAY_SECONDS = 5`: five seconds after that moment, six
     after arriving, whether or not the stop stepped, if the visitor has
     still not moved the reveal slider, the Up prompt shows.
     Any change of the reveal slider by the visitor (key, click or drag)
     hides it for good on this arrival.
   - Until the visitor's first Right (key or button) on this arrival, the
     reveal stop is capped one below the top, by every route: Up, a click
     or drag of the slider (which snaps back to the cap), and arrival
     (where snapRevealStop() could give the top). The slider's `max` stays
     the cake's top stop. A drag of the eaten slider does not count as a
     Right. The four guess cakes' top stops are 7, 3, 5 and 7, so the cap
     is always above the automatic step's stop 1.
   - `BITE_PROMPT_DELAY_SECONDS = 20`: before that first Right, the bite
     prompt shows from twenty seconds after arriving, or at once at the
     stop below the top, replacing the Up prompt. The first Right hides it
     for good on this arrival, and lifts the cap; the Up prompt may then
     show again if the visitor has never touched the reveal slider.
   - At the reveal slider's top stop, which only a Right makes reachable,
     the guess prompt shows, replacing the Up prompt; below the top stop
     it hides again, until Reveal is pressed.
   - Before Reveal, Right (key or button) at the eaten slider's last step
     does not walk on (Decision 6). It sets a block, whose prompt outranks
     every other but the name: the blocked-Up prompt below the reveal
     slider's top stop, the blocked-Reveal prompt at it, following the
     stop live. Reveal ends the block. `canWalkOn()` tells `main.js`
     whether Right may walk on.
   - Reveal replaces the guess or blocked-Reveal prompt with the name
     prompt, which nothing outranks and which stays for the rest of this
     arrival, at every reveal stop and eaten step, whatever Right does;
     leaving the page ends it. Rights after Reveal do what Right does
     today.
   - `NAME_NOTE_DELAY_SECONDS = 5`: the name's note is the first of
     Decision 10's for five seconds after Reveal, timed from the moment
     of Reveal by the same `deltaSeconds`, then a later one, which
     depends on whether this is the last `guess` page: the one whose next
     page on the tour is not a `guess` page (`#4` today), derived from
     `PAGES` by `isLastGuessPage()`, never a hard-coded id.
10. **Prompts share one element**, `.prompt` in `docs/index.html`, at the
    top centre of the viewport, with `role="status"`, so a screen reader
    announces each one. It stays visible when Escape hides the controls.
    Its texts:
    - Up: "Press the ‘Up’ key ↑ for more layers…"
    - Bite: "Press the ‘Right’ key → to take a bite…"
    - Guess: "Make your guess: what cake is this?", with a `<button>`
      "Reveal…"
    - Blocked Up: "No next cake until this one is revealed: press the
      ‘Up’ key ↑ for more layers…"
    - Blocked Reveal: "No next cake until this one is revealed: press
      ‘Reveal…’", sharing the guess prompt's one "Reveal…" button
    - Name: the page's `cakeName` as a heading, and "Press the ‘Right’
      key → for the next cake." for `NAME_NOTE_DELAY_SECONDS` after
      Reveal; from then on "Keep pressing ‘Right’ → to reach the next
      cake", or on the last `guess` page "Keep pressing ‘Right’ → to delve
      deeper". The three notes share the one heading.

    The two blocked texts were drafted by the orchestrator from the Lead
    Developer's ruling, for the Lead Developer to reword.
11. **No performance step.** Nothing here runs per pixel or per march step:
    the loop gains one constant-time step of a small state object and
    writes to the DOM only when a prompt changes.

## Steps

### Step 1: Model the tour's pages [P]

- Add `docs/src/tour/pages.js`: `PAGES`, the page list of Decision 1,
  built from `RECIPES`; `pageIndexForHash(hash, pages)`, giving the welcome
  page for a missing or unknown hash; and `nextPageIndex(index, pages)`
  and `previousPageIndex(index, pages)`, each skipping a page whose
  `isOffTour` is true, so `#5` works per Decision 2, and each `null` past
  the tour's ends; and `isLastGuessPage(index, pages)`, per Decision 9.
- Delete `docs/src/cake/walk.js` and `docs/src/cake/select.js`; remove
  `isOffWalk` from recipe `5`, with the comment above it, and its doc
  comment in `docs/src/cake/recipes.js`.
- It should name the welcome page for `""`, `"#"` and `"#nope"` (Agent QA).
- It should order the pages welcome, `1`–`4`, `5`, `fun-facts`, `pancake`
  to `custard-pie`, `thanks`, with `null` before the first and after the
  last (Agent QA).
- It should step from `#4` to `#fun-facts` and back, skipping `#5`, and
  from `#5` to `#4` and `#fun-facts` (Agent QA).
- It should derive the last `guess` page, `#4`, from `PAGES`, and no other
  page (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { PAGES, pageIndexForHash } from "./docs/src/tour/pages.js"; console.log(PAGES.map((p) => p.id || "-").join(" "), pageIndexForHash("", PAGES), pageIndexForHash("#", PAGES), pageIndexForHash("#nope", PAGES));'`
- Expect: `- 1 2 3 4 5 fun-facts pancake pepionkh-honey-cake artemis-offering sachertorte bolo-formigueiro banh-bo custard-pie thanks 0 0 0`
- Do: `node --input-type=module -e 'import { PAGES, nextPageIndex, previousPageIndex } from "./docs/src/tour/pages.js"; console.log(previousPageIndex(0, PAGES), nextPageIndex(PAGES.length - 1, PAGES));'`
- Expect: `null null`
- Do: `node --input-type=module -e 'import { PAGES, nextPageIndex as n, pageIndexForHash as h, previousPageIndex as p } from "./docs/src/tour/pages.js"; const id = (i) => PAGES[i].id; console.log(id(n(h("#4", PAGES), PAGES)), id(p(h("#fun-facts", PAGES), PAGES)), id(h("#5", PAGES)), id(p(h("#5", PAGES), PAGES)), id(n(h("#5", PAGES), PAGES)));'`
- Expect: `fun-facts 4 5 4 fun-facts`
- Do: `node --input-type=module -e 'import { PAGES, isLastGuessPage } from "./docs/src/tour/pages.js"; console.log(PAGES.filter((p, i) => isLastGuessPage(i, PAGES)).map((p) => p.id).join(" "), isLastGuessPage(0, PAGES), isLastGuessPage(PAGES.length - 1, PAGES));'`
- Expect: `4 false false`
- Do: `grep -rn "walk.js\|select.js\|isOffWalk" docs/src`
- Expect: no output.

### Step 2: Model the guess flow [P]

- Add `docs/src/tour/guess.js`: `createGuess(isLastGuess)`, which
  `main.js` calls with isLastGuessPage(), `stepGuess(guess,
  deltaSeconds, revealStop)`, which returns whether to auto-step the
  reveal slider this frame, and `noteRevealByVisitor()`, `noteReveal()`,
  `noteRight()`, `noteBlocked()`, `canWalkOn(guess)`, giving whether
  Right may walk on, `revealCapOf(guess, revealMax)`, giving the highest
  reveal stop allowed, and `promptOf(guess, revealStop, revealMax)`,
  giving `null`, `"up"`, `"bite"`, `"guess"`, `"blocked-up"`,
  `"blocked-reveal"`, `"name"`, `"name-next"` or `"name-deeper"`, per
  Decision 9.
- It should auto-step once at 1 s, and only from stop 0 untouched
  (Agent QA).
- It should give the Up prompt at 6 s untouched, and never after a
  visitor's change (Agent QA).
- It should give `"guess"` at the top stop, only after a Right, and
  `"name"` after Reveal, at any stop, whatever Right does (Agent QA).
- It should switch the name's note 5 s after Reveal and not before, to
  `"name-next"`, or `"name-deeper"` on the last `guess` page, whatever
  Right does (Agent QA).
- It should cap the reveal stop one below the top until a Right, and
  lift the cap after it (Agent QA).
- It should give `"bite"` at 20 s or at once at the stop below the top,
  before a Right, and never after one (Agent QA).
- It should refuse the walk on before Reveal and allow it after, and
  after a blocked Right give `"blocked-up"` below the top stop and
  `"blocked-reveal"` at it, until Reveal (Agent QA).

**Agent QA**

- Do: a `node --input-type=module -e` script that steps a fresh guess by
  0.5 s twelve times at stop 0 and prints each `stepGuess()` result and
  `promptOf()`.
- Expect: the auto-step is `true` on the second step only; `promptOf()` is
  `null` until the twelfth step, then `"up"`.
- Do: the same, but twenty-four steps, with `noteRevealByVisitor()` called
  after the third step.
- Expect: `promptOf()` never gives `"up"`.
- Do: step a fresh guess by 0.5 s four times at stop 2, and another at
  stop 0 with `noteRevealByVisitor()` called before its first step.
- Expect: `stepGuess()` never gives `true`.
- Do: on a fresh guess, print `promptOf()` at the top stop; call
  `noteRight()` then `noteReveal()`, and print it at the top stop and at
  stop 0; call `noteRight()`, and print it at the top stop.
- Expect: `bite name name name`.
- Do: `node --input-type=module -e 'import { createGuess, noteReveal, noteRight, promptOf, stepGuess } from "./docs/src/tour/guess.js"; const o = []; for (const last of [false, true]) { const g = createGuess(last); noteRight(g); stepGuess(g, 30, 7); noteReveal(g); noteRight(g); noteRight(g); o.push(promptOf(g, 0, 7)); stepGuess(g, 4.9, 0); o.push(promptOf(g, 7, 7)); stepGuess(g, 0.1, 0); noteRight(g); o.push(promptOf(g, 3, 7)); } console.log(o.join(" "));'`
- Expect: `name name name-next name name name-deeper`: the name stays through
  Rights, its note switching at 5 s after Reveal, not at 4.9 s, and
  differing on the last `guess` page.
- Do: `node --input-type=module -e 'import { createGuess, noteRight, revealCapOf } from "./docs/src/tour/guess.js"; const g = createGuess(); const c = revealCapOf(g, 7); noteRight(g); console.log(c, revealCapOf(g, 7));'`
- Expect: `6 7`
- Do: `node --input-type=module -e 'import { createGuess, promptOf, stepGuess } from "./docs/src/tour/guess.js"; const g = createGuess(); const o = []; for (let i = 0; i < 40; i++) { stepGuess(g, 0.5, 1); o.push(promptOf(g, 1, 7)); } const h = createGuess(); console.log(o.slice(38).join(" "), String(promptOf(h, 5, 7)), promptOf(h, 6, 7), promptOf(h, 7, 7));'`
- Expect: `up bite null bite bite`: the bite prompt at 20 s, and at once at
  the stop below the top or the top, before a Right.
- Do: `node --input-type=module -e 'import { createGuess, noteRevealByVisitor, noteRight, promptOf, stepGuess } from "./docs/src/tour/guess.js"; const g = createGuess(); stepGuess(g, 25, 6); noteRevealByVisitor(g); const o = [promptOf(g, 6, 7)]; noteRight(g); o.push(promptOf(g, 6, 7), promptOf(g, 7, 7)); stepGuess(g, 10, 6); o.push(promptOf(g, 6, 7)); console.log(o.map(String).join(" "));'`
- Expect: `bite null guess null`: hidden for good after a Right, and the
  guess prompt reachable.
- Do: `node --input-type=module -e 'import { canWalkOn, createGuess, noteBlocked, noteReveal, noteRight, promptOf } from "./docs/src/tour/guess.js"; const g = createGuess(); noteRight(g); const o = [canWalkOn(g)]; noteBlocked(g); o.push(promptOf(g, 6, 7), promptOf(g, 7, 7), promptOf(g, 6, 7)); noteReveal(g); o.push(promptOf(g, 6, 7), canWalkOn(g)); noteRight(g); o.push(String(promptOf(g, 7, 7))); console.log(o.join(" "));'`
- Expect: `false blocked-up blocked-reveal blocked-up name true name`: no
  walk on before Reveal; the blocked prompt follows the stop; Reveal ends
  it and allows the walk on, and a Right keeps the name.

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
- Expect: the one call, in `writeHash()`, which `goToPage()` and the load
  both call, writing the bare path for the welcome page.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { maskResolvedCake } from "./docs/src/cake/reveal.js"; import { fitSphereOfBounds } from "./docs/src/camera/fit.js"; import { createCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES[0]; const c = resolveRecipe(r); c.decorations = { scatter: placeScatter(r), slots: placeDecorations(r) }; const m = createCakeMotion(maskResolvedCake(c, { plate: 0, layers: r.layers.map(() => 0), topping: 0, decorations: 0 })); console.log(JSON.stringify(m.values.bounds.stack), JSON.stringify(fitSphereOfBounds(m.values.bounds, {})));'`
- Expect: `{"bottomMeters":0,"radiusMeters":0,"topMeters":0}
  {"centerMeters":0,"radiusMeters":0}`: the empty stage fits a finite
  sphere, never `NaN` or `Infinity` (Manual QA 3).

### Step 4: Show the dialogs and the guess prompts

- `docs/index.html`: the three `<dialog data-page="…">` elements of
  Decision 8 and the `.prompt` element of Decision 10.
- Add `docs/src/ui/dialogs.js`, which shows the dialog of an interlude or
  welcome page with `show()`, focuses its button, closes the rest, and
  calls a handler on each button; and `docs/src/ui/prompt.js`, which shows
  one of Decision 10's prompts, or none, writing to the DOM only on a
  change, and calls a handler on Reveal. A part's `data-prompt` may name
  several kinds, so the guess and blocked-Reveal prompts share one
  Reveal button.
- `docs/styles/main.css`: the dialog centred and the prompt at the top
  centre, with custom properties for their colours, sizes and gaps, in
  the page's light and dark colours, as the arrow buttons have.
- `docs/src/main.js`: steps the guess flow each frame on a `guess` page,
  routes the visitor's reveal changes, Reveal and Right to it, and shows
  `promptOf()`. It caps the reveal stop at revealCapOf() on a `guess`
  page wherever the stop is set: in stepReveal(), which Up and the
  automatic step use, in the slider's handler, which snaps the slider
  back to the cap, and on arrival in goToPage(). Past the last eaten step
  on a `guess` page, stepEaten() walks on only if canWalkOn() allows it,
  else calls noteBlocked() and stays.
- It should close each dialog only on leaving its page, never by Escape
  (Manual QA 2, 10).
- It should step the reveal slider one second after arriving, and prompt
  for Up five seconds later (Manual QA 3, 4).
- It should hold the reveal slider one below the top, with the bite
  prompt, until a Right, by key, click, drag or arrival (Manual QA 5, 7).
- It should prompt a guess at the top stop, name the cake on Reveal, and
  keep the name while Right eats and walks on, its note changing after
  5 s, and on `#4` differing (Manual QA 5–8).
- It should keep Right at a guess cake's last eaten step from walking on
  until Reveal, prompting Up below the top stop and Reveal at it (Manual
  QA 7).
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
5. **Do:** Press Up until the reveal slider stops, then drag it to the
   top.
   - **Expect:** It stops one below the top, with "Press the ‘Right’ key →
     to take a bite…"; the drag snaps back. Press Right: the hint goes and
     a slice is eaten. Press Up: "Make your guess: what cake is this?"
     with a "Reveal…" button. Press Down once: it hides; Up again: it is
     back.
6. **Do:** Press "Reveal…".
   - **Expect:** "Black Forest Gateau" with "Press the ‘Right’ key → for
     the next cake." About five seconds later the note becomes "Keep
     pressing ‘Right’ → to reach the next cake"; the name stays.
7. **Do:** Press Right repeatedly.
   - **Expect:** The name and its note stay while the presses eat slices,
     and go only as the presses walk on to `#2`. There, touch nothing for
     20 seconds: the bite hint replaces the Up prompt. Steps 4 and 5 then
     repeat; press Down once, then Right until a press eats nothing: no
     walk on, and "No next cake until this one is revealed: press the
     ‘Up’ key ↑ for more layers…". Press Up: "…press ‘Reveal…’" with one
     "Reveal…" button; Down and Up swap the two. Press "Reveal…":
     "Cheesecake".
     Left back from `#2`'s step 0 brings `#1` back one stop below the
     top, with the bite hint, and Right will not leave it until Reveal.
     Walk on to `#3` "Victoria Sponge Cake" and `#4` "Birthday Cake"
     likewise.
8. **Do:** On `#4`, after Reveal, wait five seconds, then press Right
   until it walks on.
   - **Expect:** The note under "Birthday Cake" becomes "Keep pressing
     ‘Right’ → to delve deeper", and stays until the address bar ends
     `#fun-facts`; the cake and plate
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
    - **Expect:** The welcome page, with the address bar showing no `#`;
      the off-tour cake with no prompts; the fun-facts dialog over an empty
      stage.
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
- **2026-11-26T17:05:21Z** — **reviewed**: Minor only. `#5` joins `PAGES` with
  `isOffTour`, which the step functions skip, so Decision 2 is
  expressible and proved; `PAGES` named; `data-page` values given; the
  load-time recipe of an empty stage set; dialogs close on leaving their
  page; the Up prompt timed from arrival; a Right before Reveal ruled out.
  Agent QA gains `#`, the `#5` steps, the non-zero and touched auto-step
  and the name at any stop; the touched run lengthens to 24 steps.
- **2026-11-26T17:10:46Z** — **implemented**: Steps 1–4. Added `docs/src/tour/pages.js`,
  `docs/src/tour/guess.js`, `docs/src/ui/dialogs.js` and
  `docs/src/ui/prompt.js`; changed `docs/src/main.js`,
  `docs/src/ui/sliders.js`, `docs/src/ui/cake-arrows.js`,
  `docs/src/cake/recipes.js`, `docs/index.html` and
  `docs/styles/main.css`; deleted `docs/src/cake/walk.js` and
  `docs/src/cake/select.js`. Every Agent QA block failed first for a
  missing module or no dialogs, then passed. The empty stage uses an
  all-zero mask built in `main.js`; the dialogs’ targets are a map there.
  Disabled arrow buttons are greyed by `--disabled-opacity`. Manual QA
  unchanged.
- **2026-11-26T17:10:47Z** — **verified**: agent checks pass: 9 modules parse, no long
  lines but the favicon’s, all changed files served (200) by the Lead
  Developer’s server on 2222, vendored checksums match; browser not run.
- **2026-11-26T17:13:35Z** — **quality-checked**: Fixed: a load on an
  unknown hash (`#nope`) kept it in the address bar, against Decision 4,
  since the load never wrote the hash; `history.replaceState()` moves from
  `goToPage()` into a new `writeHash()`, which the load also calls
  (`docs/src/main.js`); Step 3’s Agent QA Expect and Manual QA 14 updated
  to match. Deferred: the automatic step resetting `transitionTimeScale`
  to 1 during a slow walk back (accepted by the orchestrator); the nested
  ternary in `showPageControls()` (readable, style only); mutants of
  `pages.js` and `guess.js` reasoned against the Agent QA, not run.
  Verified fine: per-frame path (`stepGuess()`, `promptOf()`,
  `showPrompt()` and the `cakeName` read allocate nothing; `revealMax`
  cached); `emptyMaskFor()` matches `presenceMaskFor()`’s shape and runs
  only on a change; key gating in `goLeft()`, `goRight()` and
  `revealByVisitor()`, with only the visitor’s changes noted; sliders’
  `setDisabled()` keeps the eaten slider disabled at `max` 0 in either
  call order; `showPageControls()` per page kind; dialog targets; CSS
  `[hidden]` and closed dialogs left to the browser; no new GPU resource,
  resize and disposal untouched; agent checks 1–4 pass; browser not run.
- **2026-11-26T18:05:18Z** — **fixed**: Manual QA 3 failed: from the
  welcome page, “Feed me cake!” showed no plate or cake at any stop, on
  every later cake, with a clean console. Cause: on the empty stage,
  `maskResolvedCake()` keeps the topping’s thickness, so
  `writeCakeBounds()` gave the stack a positive radius over an infinite
  span (`bottomMeters` `Infinity`, `topMeters` `-Infinity`); with the
  plate also at radius 0, `fitSphereOfBounds()` gave a `NaN` centre and
  the camera’s springs never recovered. Fixed at the root in
  `docs/src/cake/resolve.js`, outside this plan’s file list, since the
  bug predates the plan and Plan 12 first exposes it: a stack with no
  layer taller than 0 takes radius 0, so the all-zero miss cylinder.
  Step 3’s Agent QA gains the finite-fit line; Node shows the motion still
  converging to `#1`’s stop-0 plate bounds; browser not run.
- **2026-11-26T18:19:46Z** — **ruled**: mid manual QA, the Lead Developer
  ruled that a guess page caps the reveal slider one below the top until
  the visitor’s first Right, with a bite prompt, “Press the ‘Right’ key →
  to take a bite…”, after 20 s or at the stop below the top, hidden for
  good by that Right. Folded into Decisions 9 and 10, Steps 2 and 4 and
  Manual QA 5 and 7; built in `guess.js` (`revealCapOf()`), `main.js`,
  `prompt.js` and `index.html`. Four mutants of `guess.js` each failed
  the new Agent QA.
- **2026-11-26T18:27:30Z** — **ruled**: mid manual QA, the Lead Developer
  ruled that Right at a guess cake's last eaten step walks on only after
  Reveal, prompting “No next cake until this one is revealed: …” with Up
  below the top stop, or Reveal (sharing the one Reveal button) at it;
  texts drafted by the orchestrator for rewording. Folded into Decisions
  6, 9 and 10, Steps 2 and 4 and Manual QA 7; built in `guess.js`
  (`canWalkOn()`, `noteBlocked()`), `main.js` (`stepEaten()`),
  `prompt.js` and `index.html`. Three mutants each failed the new Agent
  QA; clearing the block in noteReveal() proved redundant, as Reveal
  outranks it, so it is not cleared.
- **2026-11-26T18:42:29Z** — **ruled**: after manual QA, the Lead
  Developer ruled that the revealed name stays for the rest of the
  arrival, no longer dismissed by the first Right after Reveal, and that
  its note becomes “Keep pressing ‘Right’ → to reach the next cake” after
  5 s, or “Keep pressing ‘Right’ → to delve deeper” on the last guess
  page. Folded into Decisions 9 and 10, Steps 1, 2 and 4 and Manual QA
  6–8; built in `guess.js` (`NAME_NOTE_DELAY_SECONDS`,
  `revealedAtSeconds`, `createGuess(isLastGuess)`, `"name-next"`,
  `"name-deeper"`; `isNameDismissed` removed), `pages.js`
  (`isLastGuessPage()`), `main.js`, `prompt.js` and `index.html`. Five
  mutants failed the new Agent QA; one moving the delay to 4.95 s
  survived, as the probe sits at 4.9 s.
- **2026-11-26T18:47:55Z** — **done**: the Lead Developer’s manual QA
  passed, after the empty-stack bounds fix and three rulings (the bite
  gate, the reveal gate and the lasting name).
