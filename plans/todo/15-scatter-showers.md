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
   x the shower's clock since it began, in one item's falls, y the
   cues' spread in the same unit, z its phase, 1 dropping, −1 sinking, 0
   at rest, and w its reach in metres, `DROP_HEIGHT_METERS` for a drop
   or `SINK_DEPTH_FACTOR` times the kind's height for a sink. A cell's
   own progress is `clamp(x − cue × y, 0, 1)`: before 0 a dropping item
   is not drawn, then it falls from the reach as stepItem() drops a slot's
   item, eased in; a sinking item sinks from where it is as stepItem()
   sinks one, its scale falling to 0. The motion's scatter item carries
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

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe } from "./docs/src/cake/resolve.js"; import { placeDecorations, placeScatter } from "./docs/src/cake/place.js"; import { createCakeMotion, retargetCakeMotion, stepCakeMotion } from "./docs/src/motion/cake-motion.js"; const r = RECIPES.find((x) => x.id === "pepionkh-honey-cake"); const cake = () => ({ ...resolveRecipe(r), decorations: { scatter: placeScatter(r), slots: placeDecorations(r) } }); const m = createCakeMotion(cake()); retargetCakeMotion(m, cake(), { reducedMotion: false }); let t = 0; const at = (s) => { while (t < s) { stepCakeMotion(m, 0.05); t += 0.05; } const d = m.values.decorations; return [d.scatter.showerPhase, d.liftMeters].join(" "); }; console.log(at(0.1), "|", at(1.2), "|", at(2.3));'`
- Expect: `-1 0 | 1 0.12 | 0 0`: sinking at once, dropping with the bound
  raised at 1.2 s, at rest after 1.1 + 0.6 + 0.45 s.
- Do: `grep -c scatterOffsetMeters docs/src/sdf/cake.js docs/src/motion/cake-motion.js`
- Expect: `0` for both files.

### Step 2: Shower in the shader

- `docs/src/sdf/decorations.js`: scatterNearest() draws each cell's cue
  and applies the shower's offset and scale per cell, by Decision 2.
- It should drop the seeds as a burst over about a second, each at its
  own moment (Manual QA 1).
- It should sink them the same way (Manual QA 2).
- It should keep the sprinkles' colours and places (Manual QA 3).
- It should stand the scatter at rest at once under reduced motion
  (Manual QA 4).

**Agent QA**

- Do: `for f in docs/src/sdf/decorations.js docs/src/sdf/cake.js docs/src/motion/cake-motion.js; do node --check "$f"; done`
- Expect: no output.
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
   - **Expect:** The seeds sink away over about half a second, each at
     its own moment, not all at once.
3. **Do:** Reload at `#4`, press Up until the sprinkles come, and compare
   with the live site, `https://richplastow.com/sdf-cake/#4`.
   - **Expect:** The sprinkles fall as a shower, and once landed match
     the live site's colours and places.
4. **Do:** Turn on reduced motion in the system settings, reload at
   `#1`, and press Up until the flakes come.
   - **Expect:** The flakes stand on the cake at once; nothing falls.
     Turn reduced motion off again.
5. **Do:** On `#1`, press Right from the last eaten step to walk to `#2`,
   then Left to walk back.
   - **Expect:** The flakes sink as a shower before the cake changes, and
     shower back in after the cake returns.
6. **Do:** Repeat step 1 at a phone-sized viewport in the dev tools'
   device mode.
   - **Expect:** As step 1.

## Audit

- **2026-11-26T18:11:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 14. Proposed by the agent: the per-cell
  cue, the vec4 shower uniform, the 0.6 s and 0.3 s spreads, and the
  bound following the latest item.
