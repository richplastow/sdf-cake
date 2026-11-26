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
- Builds on [Plan 07](../done/07-sliders.md), the eaten wedge in
  eatenStackDistance() in `docs/src/sdf/cake.js`, and on
  [Plan 17](17-wonky-cakes.md), whose tear term roughens the wall; the
  research measured that
  [bites cost nothing extra and keep the bound](01-presentation-mode-research.md#the-march-today-and-the-fields-the-brief-needs).
- A Bite Mode, where a click takes a bite anywhere, waits in the
  backlog, [20261126-bite-mode.md](backlog/20261126-bite-mode.md); this
  plan shows how a bite looks and adds variety to the tour.

## Decisions

1. **`biteDontSlice` is a recipe field**, a boolean required on every
   recipe and validated. True, first guesses, on `2`, the cheesecake,
   `5`, the fruit cake, `bolo-formigueiro` and `custard-pie`: four cakes
   whose decorations sit clear of +X; false on the rest, the pancake
   included, whose torn segment Plan 17 gives.
2. **The bite is an elliptical cylinder about Y**, centred on the rim at
   `(r0, 0)` in x and z, r0 the `wonkyRadiusMeters` uniform of Plan 17,
   with half width along z `a = r0 × α / π`, α the eaten angle, and
   along x `b = BITE_SQUASH × a`, `BITE_SQUASH` 0.6, so it grows with the
   slider as the wedge does and reaches the axis at half a turn. Its
   distance is the circle's in the squashed domain times the lesser
   scale, `(length(xz / vec2(b, a)) − 1) × min(a, b)`: a non-uniform
   scale, which the comment beside it says, but one that only
   underestimates the distance, inside and out, so it needs no step
   factor. Plan 17's tear lowers its distance as it lowers the wedge's.
   The bite's footprint can pass the wedge's sector near its middle, by
   up to about a sixth of its half width at half a turn (derived), which
   is why Decision 1 picks cakes with nothing on +X.
3. **The cut mixes the wedge and the bite.** A `biteShare` uniform, 0
   to 1, sprung on the colour spring from the recipe's boolean, and the
   cut is `mix(wedge, bite, biteShare)`: a convex mix of two bounds is a
   bound, as the research measured for the blend, so a walk between a
   sliced cake and a bitten one morphs the cut. The resolved cake
   carries `biteShare` as a number:

   ```json
   { "id": "2", "biteDontSlice": true, "eaten": { "steps": 6, "minFraction": 0, "maxFraction": 0.9 } }
   ```

4. **No performance step.** One ellipse per sample, as the research
   measured a bite's cost.

## Steps

### Step 1: The bite

- `docs/src/cake/recipes.js`: `biteDontSlice` on every recipe.
- `docs/src/cake/resolve.js`: `biteShare`, 0 or 1; validateRecipe()
  rejects a non-boolean.
- `docs/src/motion/cake-motion.js`: `biteShare` sprung on the colour
  spring.
- `docs/src/sdf/cake.js`: the `biteShare` uniform; biteDistance() and
  the mix in eatenStackDistance().
- It should show an oval bite at +X on the cheesecake that grows with
  the eaten slider (Manual QA 1, 2).
- It should leave the sliced cakes as they were (Manual QA 3).
- It should morph the cut between a sliced and a bitten cake (Manual
  QA 4).
- It should tear the fruit cake's bite more than the cheesecake's
  (Manual QA 5).
- It should resolve the four bitten recipes and reject a string (Agent
  QA).

**Agent QA**

- Do: `node --input-type=module -e 'import { RECIPES } from "./docs/src/cake/recipes.js"; import { resolveRecipe, validateRecipe } from "./docs/src/cake/resolve.js"; console.log(RECIPES.filter((r) => r.biteDontSlice).map((r) => r.id).join(","), resolveRecipe(RECIPES[1]).biteShare, validateRecipe({ ...RECIPES[1], biteDontSlice: "yes" }).length);'`
- Expect: `2,5,bolo-formigueiro,custard-pie 1 1`.
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

1. **Do:** Press Up until the cheesecake is whole, then Right once.
   - **Expect:** An oval bite in the rim, wider along the rim than deep,
     through the coulis, the cheesecake and the biscuit, with the plate
     whole beneath it.
2. **Do:** Press Right to the last step.
   - **Expect:** The bite grows each step, past the centre by the end;
     nothing of the old wedge shows.
3. **Do:** Reload at `#3` and `#sachertorte` in turn, press Up until
   each is whole and Right twice.
   - **Expect:** A wedge cut out, as before.
4. **Do:** On `#2`, press Left from the first step to walk back to `#1`,
   then Right to return, watching the cut.
   - **Expect:** The bite morphs into the wedge and back, with no jump.
5. **Do:** Reload at `#5`, press Up until it is whole and Right twice,
   and zoom in on the bite's wall.
   - **Expect:** A rougher, more torn wall than the cheesecake's.
6. **Do:** Reload at `#custard-pie`, press Up until it is whole and
   Right to the last step.
   - **Expect:** The bite never touches the cherry.

## Audit

- **2026-11-26T18:14:00Z** — **drafted**: split from the visual
  refinements brief, after Plan 17. Proposed by the agent: which four
  cakes are bitten, the bite's size from the eaten angle, the squash of
  0.6, the lesser-scale bound and the sprung mix with the wedge.
