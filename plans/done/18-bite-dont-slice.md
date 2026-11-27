---
title: Bite, don't slice
description: Lets a recipe take a rough, squashed cylindrical bite out of the cake where its slice would be, as a first taste of a Bite Mode to come.
type: plan
---

## Context

- Delivers `biteDontSlice`: a recipe with it true loses an oval bite at
  +X, where its slice would be cut, growing with the eaten slider as the
  slice does, its wall torn by the cake's `wonky`. The slices stay for
  every other cake.
- Builds on [Plan 07](./07-sliders.md), the eaten wedge in
  eatenStackDistance() in `docs/src/sdf/cake.js`, and on
  [Plan 17](./17-wonky-cakes.md), whose tear term roughens the wall; the
  research measured that
  [bites cost nothing extra and keep the bound](../todo/01-presentation-mode-research.md#the-march-today-and-the-fields-the-brief-needs).
- A Bite Mode, where a click takes a bite anywhere, waits in the
  backlog, [20261126-bite-mode.md](../todo/backlog/20261126-bite-mode.md); this
  plan shows how a bite looks and adds variety to the tour.

## Decisions

1. **`biteDontSlice` is a recipe field**, a boolean required on every
   recipe and validated. True, first guesses, on `2`, the cheesecake,
   `5`, the fruit cake, `bolo-formigueiro` and `custard-pie`; false on
   the rest, the pancake included, whose torn segment Plan 17 gives.
2. **The bite is an elliptical cylinder about Y**, centred on the rim at
   `(r0, 0)` in x and z, r0 the `wonkyRadiusMeters` uniform of Plan 17,
   with half width along z `a = max(r0 × α / π, BITE_FLOOR_METERS)`, α
   the eaten angle, and along x `b = BITE_SQUASH × a`, `BITE_SQUASH`
   0.6, unitless. It grows with the slider as the wedge does, its inner
   edge at `x = r0 − b`, so it reaches the axis at five sixths of a turn
   and, at the cheesecake's last step, 0.9 of a turn, lies about 8 mm
   past it on r0 = 0.1 m. `BITE_FLOOR_METERS` is 0.0001, in metres, a
   first guess: the reveal slider's first stop, the plate alone, and
   every page that shows no cake hide every layer, so r0 is 0, and a
   zero `a` would divide by zero. A NaN would then ride the mix even at
   a `biteShare` of 0, as NaN × 0 is NaN, and lose the plate.

   The bite's distance is
   `(length((xz − vec2(r0, 0)) / vec2(b, a)) − 1) × b`, negative inside:
   the circle's in the squashed domain times the lesser scale, `b`, as
   `BITE_SQUASH` is below 1. It is a non-uniform scale, which the comment
   beside it says, but its gradient never passes 1, so it only
   underestimates the distance, inside and out, and needs no step
   factor. Plan 17's tear lowers its distance as it lowers the wedge's.
   The bite lies inside the wedge's sector at every step to 0.75 of a
   turn, and at 0.9 passes it by under 0.025 r0 (measured in a port), so
   it never cuts what the wedge leaves, and no cake needs its decorations
   kept off +X.
3. **The cut mixes the wedge and the bite.** A `biteShare` uniform, 0
   to 1, sprung on the colour spring from the recipe's boolean, and
   clamped within 0 and 1 where the uniforms are written, as `wonky` is,
   since a mix outside 0 to 1 is no longer convex. The cut's distance,
   negative inside the cut, is
   `mix(wedgeCut, biteDistance(xz), biteShare) − eatenTearAt(p)`, and
   the stack with it cut is `subtractDistance(cut, stack)`.
   `wedgeCut` is wedgeDistance(p.xz, halfAngle) up to half a turn, and
   past it `−wedgeDistance(vec2(−p.x, p.z), π − halfAngle)`, the
   complementary wedge's, negated, so both branches and the bite share
   one sign: negative inside the cut. At a `biteShare` of 0 this is
   today's code, which subtracts the wedge up to half a turn and
   intersects with the complementary wedge past it. The early return for
   an angle of 0 stays, so nothing is cut, whatever the share. A convex
   mix of two fields that never overestimate never overestimates, as the
   research measured for the blend, so a walk between a sliced cake and a
   bitten one morphs the cut, and nothing jumps at half a turn, where the
   wedge's two forms agree. The recipe and the resolved cake carry it as:

   ```json
   {
     "id": "2",
     "biteDontSlice": true,
     "eaten": { "steps": 6, "minFraction": 0, "maxFraction": 0.9 }
   }
   ```

   ```json
   { "biteShare": 1, "eatenAngleRadians": 0, "wonky": 0.2 }
   ```

   The second is the resolved cake with its other fields left out.
4. **No performance step.** One ellipse per sample, as the research
   measured a bite's cost.

## Steps

### Step 1: The bite

- `docs/src/cake/recipes.js`: `biteDontSlice` on every recipe, and a line
  for it in the header's field notes.
- `docs/src/cake/resolve.js`: `biteShare`, 0 or 1; validateRecipe()
  rejects anything but a boolean, one problem for it, and its doc
  comment lists the check.
- `docs/src/motion/cake-motion.js`: `biteShare` sprung on the colour
  spring, wherever `wonky` is: the values, the spring, its retarget, its
  step and its snap.
- `docs/src/sdf/cake.js`: the `biteShare` uniform, declared in the GLSL
  and in createCakeUniforms(), written clamped by writeCakeUniforms();
  `BITE_SQUASH` and `BITE_FLOOR_METERS`; biteDistance(vec2 xz), reading
  `eatenAngleRadians` and `wonkyRadiusMeters`; eatenStackDistance() built
  on the one cut; the chunk's and eatenStackDistance()'s comments.
- It should show an oval bite at +X on the cheesecake that grows with
  the eaten slider (Manual QA 1, 2).
- It should leave the sliced cakes as they were (Manual QA 3).
- It should morph the cut between a sliced and a bitten cake (Manual
  QA 4).
- It should tear the fruit cake's bite more than the cheesecake's
  (Manual QA 5).
- It should keep the bite clear of the custard pie's cherry (Manual
  QA 6).
- It should keep the bite whole and on the cake at a phone-sized
  viewport (Manual QA 7).
- It should keep the plate whole when the reveal slider shows it alone
  at a step that cuts (Manual QA 8).
- It should resolve the four bitten recipes, reject a string, a number
  and a missing field, and accept a boolean (Agent QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; console.log(RECIPES.filter((r) => r.biteDontSlice).map((r) => r.id).join(","), resolveRecipe(RECIPES[1]).biteShare, validateRecipe({ ...RECIPES[1], biteDontSlice: "yes" }).length);'`
- Expect: `2,5,bolo-formigueiro,custard-pie 1 1`.
- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; console.log(resolveRecipe(RECIPES[0]).biteShare, validateRecipe(RECIPES[1]).length, validateRecipe({ ...RECIPES[1], biteDontSlice: 1 }).length, validateRecipe({ ...RECIPES[1], biteDontSlice: undefined }).length, RECIPES.flatMap((r) => validateRecipe(r)).length);'`
- Expect: `0 0 1 1 0`.
- Do: `for f in docs/src/cake/recipes.js docs/src/cake/resolve.js docs/src/motion/cake-motion.js docs/src/sdf/cake.js; do node --check "$f"; done`
- Expect: no output.
- Do: the CLAUDE.md [agent checks](../../CLAUDE.md#agent-checks) 2 to 4.
- Expect: as each states.

## Done when

The Agent QA block passes, the CLAUDE.md agent checks pass, and `#2`
shows a bite where its slice was.

## Manual QA

Preconditions: from the repo root run `npx serve docs -p 2222`, open
`http://localhost:2222/#2`, the cheesecake, in Chrome with the dev tools
console open, and hard-reload. Every step also expects no error, warning
or shader log in the console.

1. **Do:** Press Up until it stops, press Right once, which lifts the
   cap on the reveal slider of this guess page, then press Up once more.
   - **Expect:** The whole cheesecake, with an oval bite in the rim,
     wider along the rim than deep, through the coulis, the cheesecake
     and the biscuit, with the plate whole beneath it.
2. **Do:** Press Right to the last step.
   - **Expect:** The bite grows each step, reaching just past the centre
     by the end, about 8 mm; nothing of the old wedge shows.
3. **Do:** Reload at `#3` and `#sachertorte` in turn, press Right twice,
   then Up until each is whole.
   - **Expect:** A wedge cut out, as before.
4. **Do:** On `#2`, press Right to the last step, then change the URL's
   hash to `#3` and press Enter, watching the cut.
   - **Expect:** The bite eases into the sponge's smaller wedge as the
     cake changes, with no jump or flash.
5. **Do:** Reload at `#5`, press Up until it is whole and Right twice,
   and zoom in on the bite's wall.
   - **Expect:** A rougher, more torn wall than the cheesecake's at the
     same step.
6. **Do:** Reload at `#custard-pie`, press Up until it is whole and
   Right to the last step.
   - **Expect:** The bite never touches the cherry.
7. **Do:** Reload at `#2`, open the dev tools' device toolbar at a phone
   width, such as 390 px, press Up until it stops, press Right to the
   last step, then Up once more.
   - **Expect:** The bite sits on the cake, in view, with the plate
     whole beneath it.
8. **Do:** Reload at `#5`, press Right twice, then Down until only the
   plate shows.
   - **Expect:** The plate stays whole, with no flicker or hole in it.

## Audit

- **2026-11-26T18:14:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 17. Proposed by the agent: which four
  cakes are bitten, the bite's size from the eaten angle, the squash of
  0.6, the lesser-scale bound and the sprung mix with the wedge.
- **2026-11-27T15:10:00Z** — **reviewed**: a port of the field found no overestimate at any step or share, in either branch, and no jump at half a turn; fixed the axis claim (five sixths of a turn), the false footprint claim (the bite lies inside the wedge), the missing sign convention for the mix, a zero r0 that gave NaN, a missing clamp, QA 1, 3 and 4 against the guess flow, and added QA 7, 8 and an Agent QA line for three uncaught mutations.
- **2026-11-27T15:12:00Z** — **implemented**: Step 1 done. `recipes.js` (`biteDontSlice` on all twelve, true on `2`, `5`, `bolo-formigueiro`, `custard-pie`, header note), `resolve.js` (`biteShare`, validateRecipe() boolean check, docs), `cake-motion.js` (`biteShare` on the colour spring: values, spring, retarget, step, snap), `cake.js` (uniform, clamped write, `BITE_SQUASH`, `BITE_FLOOR_METERS`, biteDistance(), eatenStackDistance() on one negative-inside cut, comments). Both Agent QA commands gave the expected output (`2,5,bolo-formigueiro,custard-pie 1 1` and `0 0 1 1 0`). Manual QA unchanged: each line still matches the build.
- **2026-11-27T15:12:00Z** — **verified**: agent checks pass: every changed module parses, no line over 80 columns, `/` and the four changed files served 200 (own server, stopped), vendored checksums match; browser not run, so GLSL is uncompiled.
- **2026-11-27T15:15:00Z** — **quality-checked**: Fixed: `occlusionAt()` in `docs/src/raymarch/fragment.js` still cut each layer by the wedge's face half-space, so on a bitten cake (`2`, `5`, `bolo-formigueiro`, `custard-pie`) every hole inside that half-space but outside the bite read no occlusion, a brighter patch ending on a line along the face; both reads now take `eatenFaceTermAt()`, the face mixed with `-biteDistance()` by `biteShare`, torn as before, identical at share 0; the writeCakeUniforms() doc comment in `docs/src/sdf/cake.js` reflowed; Deferred: none; Verified fine: second wedge branch sign (`max(-cut, stack)` equals the old `max(W' + tear, stack)`), floored `a` against a zero `wonkyRadiusMeters`, uniform declared once in GLSL and once in createCakeUniforms(), per-frame path allocates nothing and adds no loop (one ternary in `eatenStackDistance()`, one in `eatenFaceTermAt()`), `biteShare` springs, clamps and snaps beside `wonky`, no disposal, resize or input change, Agent QA 1 and 2, agent checks 1 to 4 (own server, stopped); browser not run, so GLSL is uncompiled.
- **2026-11-27T17:41:14Z** — **done**: the Lead Developer’s manual QA
  passed. They then set `biteDontSlice` false on every recipe, keeping
  the bite’s code, so no cake is bitten in the app for now; Agent QA 1
  now prints ` 0 1` until a recipe turns it back on.
