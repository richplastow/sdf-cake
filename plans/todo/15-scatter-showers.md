---
title: Scatter showers
description: Lets each sesame seed, sprinkle and flake fall and sink at its own moment, as a short shower, instead of the whole scatter moving as one flat sheet.
type: plan
---

## Context

- Delivers a shower: the scattered seeds, sprinkles and flakes drop in a
  burst over about a second, each at its own moment, and sink the same
  way, as the candles already light at their own hashed cues.
- Today the scatter is one item in motion: `scatterOffsetMeters` lifts
  every cell's item by the same height, so the sheet drops as one plane
  and sinks into the cake at one instant (read in stepItem() in
  `docs/src/motion/cake-motion.js` and scatterNearest() in
  `docs/src/sdf/decorations.js`, 2026-11-26).
- Builds on [Plan 06](../done/06-decorations.md), which drew the
  scatter, and [Plan 05](../done/05-transitions.md), which choreographed
  the drops; feeds nothing, and depends on no plan after it.

## Decisions

1. **Each cell has a cue.** scatterNearest() draws one more number from
   each cell's hash, `cue`, 0 to 1, after its colour draw, so the
   sprinkles' colours stay as tuned. The motion no longer gives the
   scatter one offset; it gives a shower the shader applies per cell.
2. **The shower is four numbers, one uniform.** `scatterShower`, a vec4:
   x the shower's clock since it began, in one item's fall,
   `DROP_SECONDS`, for a drop and one item's sink, `SINK_SECONDS`, for a
   sink, y the cues' spread in the same unit, z its phase, 1 dropping, −1
   sinking, 0 at rest, and w its reach in metres, `DROP_HEIGHT_METERS`
   for a drop or `SINK_DEPTH_FACTOR` times the kind's height for a sink.
   A cell's own progress is `clamp(x − cue × y, 0, 1)`: before 0 a
   dropping item is not drawn, then it falls from the reach as stepItem()
   drops a slot's item, eased in; a sinking item sinks from its rest as
   stepItem() sinks one, eased out, its scale falling to 0, and a cell at
   scale 0 is skipped. The cells' shrink is the shower's alone: the
   scatter's `scale`, and so `scatterScale`, stays at its rest scale
   through the sink until the shower ends and the scatter empties. Four
   numbers cannot say where each cell was, so a sink that interrupts a
   drop starts every cell from its rest, those still waiting included: a
   glitch possible until the last item lands, accepted. The motion's
   scatter item carries
   the same four numbers, which writeDecorationUniforms() packs:

   ```json
   {
     "kindId": 7,
     "cellMeters": 0.0052,
     "showerClock": 0.8,
     "showerSpread": 1.33,
     "showerPhase": 1,
     "showerReachMeters": 0.12
   }
   ```

   - The glitch, measured on the five scatter recipes at 60 frames a
     second, the sink arriving at every frame of the drop at 60 offsets
     within a frame, through Down and through a hash change alike (one
     path): a cell jumps down at most 120 mm in one frame, the whole
     drop height plus at most 0.4 mm of its first sink frame, and every
     cell not yet dropped (up to all of them) appears at rest at once.
     It can happen until the last cell lands, at most 1.05 s after the
     scatter's drop starts. Manual QA 6 shows it.

3. **The spreads**, first guesses to tune by eye: `SHOWER_DROP_SPREAD_SECONDS`,
   0.6, so a drop runs over 0.6 s plus one item's `DROP_SECONDS`, 0.45;
   and `SHOWER_SINK_SPREAD_SECONDS`, 0.3, plus one item's
   `SINK_SECONDS`, 0.4. The shower starts when the scatter's drop or sink
   starts today, after the slots.
4. **The bound follows the latest item.** The scatter's `offsetMeters`,
   which stepDecorations() folds into `liftMeters` for the march's copy
   of the stack's top, is the offset of the item whose cue is 1, so the
   bound covers every item until the last lands. Under reduced motion
   the shower is at rest at once, phase 0.
5. **No performance step.** The shader does one hash draw and a clamp
   more per checked cell, four cells per sample within the scatter's
   reach, whether or not a shower runs.

## Steps

### Step 1: Model the shower in the motion

- `docs/src/motion/cake-motion.js`: the scatter item's four shower
  numbers; installDecorations(), sinkDecorations() and stepItem() run
  the scatter as a shower by Decisions 2 to 4.
- `docs/src/sdf/cake.js`: createCakeUniforms() declares `scatterShower`
  in place of `scatterOffsetMeters`; writeDecorationUniforms() packs it.
- It should run a drop over the spread plus one fall, and a sink over
  its spread plus one sink (Agent QA).
- It should keep the stack's bound raised until the last item lands
  (Agent QA).
- It should stand the scatter at rest at once under reduced motion, its
  phase 0 (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES.find((x) => x.id === "pepionkh-honey-cake"); const cake = () => ({ ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }); const m = createCakeMotion(cake()); retargetCakeMotion(m, cake(), { reducedMotion: false }); let t = 0; const at = (s) => { while (t < s) { stepCakeMotion(m, 0.05); t += 0.05; } const d = m.values.decorations; return [d.scatter.showerPhase, d.liftMeters].join(" "); }; console.log(at(0.1), "|", at(1.2), "|", at(2.3));'`
- Expect: `-1 0 | 1 0.12 | 0 0`: sinking at once, dropping with the bound
  raised at 1.2 s, at rest after 1.1 + 0.6 + 0.45 s. The honey cake
  has no slots, so its shower starts at `DROP_DELAY_SECONDS`, 1.1 s.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES.find((x) => x.id === "pepionkh-honey-cake"); const cake = () => ({ ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }); const m = createCakeMotion(cake()); retargetCakeMotion(m, cake(), { reducedMotion: false }); let t = 0; const at = (s) => { while (t < s) { stepCakeMotion(m, 0.05); t += 0.05; } const d = m.values.decorations.scatter; return [d.showerPhase, (1000 * d.offsetMeters).toFixed(1)].join(" "); }; const a = at(0.52); const b = at(1.92); retargetCakeMotion(m, cake(), { reducedMotion: true }); const d = m.values.decorations.scatter; console.log(a, "|", b, "|", d.showerPhase, d.offsetMeters, d.scale);'`
- Expect: `-1 -1.7 | 1 83.0 | 0 0 1`: at 0.55 s the last cell's sink is
  under way, timed in `SINK_SECONDS` over the sink's spread; at 1.95 s
  the last cell's fall is, timed in `DROP_SECONDS`; under reduced
  motion the scatter rests at once at its rest scale.
- Do: `grep -c scatterOffsetMeters docs/src/sdf/cake.js`, then
  `grep -c scatterShower docs/src/sdf/cake.js`
- Expect: `0`, then `2` or more.

### Step 2: Shower in the shader

- `docs/src/sdf/decorations.js`: `uniform vec4 scatterShower;` in place
  of `uniform float scatterOffsetMeters;`; scatterNearest() draws each
  cell's cue and applies the shower's offset and scale per cell, by
  Decision 2, skipping a cell not yet dropped or at scale 0.
- It should drop the seeds as a burst over about a second, each at its
  own moment (Manual QA 1).
- It should sink them the same way (Manual QA 2).
- It should keep the sprinkles' colours and places (Manual QA 3).
- It should stand the scatter at rest at once under reduced motion
  (Manual QA 4).
- It should start every cell of an interrupted drop from rest before
  the sink, the accepted glitch of Decision 2 (Manual QA 6).

**Agent QA**

- Do: `for f in docs/src/sdf/decorations.js docs/src/sdf/cake.js docs/src/motion/cake-motion.js; do node --check "$f"; done`
- Expect: no output.
- Do: `grep -c scatterOffsetMeters docs/src/sdf/decorations.js docs/src/sdf/cake.js docs/src/motion/cake-motion.js`,
  then `grep -c "uniform vec4 scatterShower;" docs/src/sdf/decorations.js`
- Expect: `0` for each file, then `1`.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

Every Agent QA block passes, the CLAUDE.md agent checks pass, and the
honey cake's sesame seeds fall as a shower rather than a sheet.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#pepionkh-honey-cake` in Chrome with the dev
tools console open, and hard-reload. Every step also expects no error,
warning or shader log in the console.

1. **Do:** Press Up until the sesame seeds come, and watch them.
   - **Expect:** The seeds fall over about a second, the first landing
     while the last are still in the air, like a brief shower; none
     hangs in the air once the shower ends.
2. **Do:** Press Down once.
   - **Expect:** The seeds sink away over about 0.7 s, each at its own
     moment, not all at once.
3. **Do:** Reload at `#4`, a guess page that holds the top stop back
   until the first Right: press Right once, then Up until the sprinkles
   come. Do the same on the live site,
   `https://richplastow.com/sdf-cake/#4`, and compare.
   - **Expect:** The sprinkles fall as a shower, and once landed match
     the live site's colours and places.
4. **Do:** Turn on reduced motion in the system settings, reload at
   `#1`, press Right once, then Up until the flakes come.
   - **Expect:** The flakes stand on the cake at once; nothing falls.
     Turn reduced motion off again.
5. **Do:** Reload at `#artemis-offering`, press Up until the flakes
   come, wait for them to land, then edit the address bar's hash to
   `#pepionkh-honey-cake` and press Enter. Once the seeds have landed,
   edit it back to `#artemis-offering`.
   - **Expect:** Each time, the old cake's flakes or seeds sink as a
     shower before the cake changes, and the new cake's shower in about
     a second after it.
6. **Do:** At `#pepionkh-honey-cake` with the seeds landed, press Down
   once and wait for them to sink. Press Up once, then press Down within
   half a second, while the seeds are still falling.
   - **Expect:** The accepted glitch: at the second Down, the seeds still
     in the air jump straight down onto the cake in one frame, those near
     the top by up to 120 mm, and those not yet fallen appear on the cake
     at once; then all sink as a shower, as in step 2. If this looks
     worse than the seeds vanishing, say so: the ruling can be
     overturned.
7. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools'
   device mode.
   - **Expect:** As step 1.

## Audit

- **2026-11-26T18:11:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 14. Proposed by the agent: the per-cell
  cue, the vec4 shower uniform, the 0.6 s and 0.3 s spreads, and the
  bound following the latest item.
- **2026-11-26T23:55:43Z** — **reviewed**: Decisions 2 and 4 tested
  in a JS port of scatterNearest() with the per-cell shower, on every
  scatter recipe: no cell overestimates (exact primitives; the sesame
  ellipsoid's own bound aside, as at rest today), the 2 x 2 check still
  finds the nearest item with cells at different heights, no ray steps
  through or stops short, and the cue-1 offset bounds every cell through
  a whole drop and sink. Decision 2 gains the clock's unit per phase,
  sinking from rest, the scale-0 skip, `scatterScale` held at rest
  through the sink, and the interrupted-drop glitch. Step 1 gains a
  reduced-motion criterion and an Agent QA line (sink spread, clock
  unit, reduced motion; seven mutations each caught by a line), its
  grep narrowed to `cake.js` with a `scatterShower` count; Step 2's
  work line names the uniform swap in `decorations.js`, and its Agent
  QA gains the three-file grep. Manual QA 2 to 5 fitted to the guess
  pages' reveal cap and walk-on rules (Plans 12 and 13). Uniform
  vectors unchanged unpacked (a float row becomes a vec4 row).
- **2026-11-27T00:01:00Z** — **implemented**: Steps 1 and 2. In
  `docs/src/motion/cake-motion.js`, the scatter item carries
  `showerClock`, `showerSpread`, `showerPhase` and `showerReachMeters`,
  written by stepShower(); stepItem() lags the scatter's drop and sink
  by `SHOWER_DROP_SPREAD_SECONDS` and `SHOWER_SINK_SPREAD_SECONDS` so its
  `offsetMeters` is the cue-1 item's, and keeps its scale at rest through
  the sink; sinkDecorations() sinks the scatter from rest. In
  `docs/src/sdf/cake.js`, `scatterShower`, a Float32Array(4), replaces
  `scatterOffsetMeters`. In `docs/src/sdf/decorations.js`,
  scatterNearest() draws each cell's cue after its colour and applies
  the shower per cell. Both Agent QA blocks fail before and pass after.
  By the orchestrator's ruling, the interrupted-drop glitch was measured
  (120 mm in one frame at most, possible until 1.05 s after the drop
  starts), recorded under Decision 2, and Manual QA 6 added for the Lead
  Developer to judge it, with a Step 2 criterion pointing at it; Decision
  2's "under a second" corrected to "until the last item lands"; the
  phone step renumbered 7.
- **2026-11-27T00:02:00Z** — **verified**: agent checks pass: 3 modules
  parse, no long lines, `/` and the 3 changed files served 200 by a
  server started and stopped for the check, vendored checksums match;
  browser not run.
