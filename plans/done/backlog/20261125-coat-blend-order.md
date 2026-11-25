# The coat's blend depends on which layer goes first

Raised on 25 November 2026 by Plan 05's first review, in an unattended
`/orchestrate-plan` run. It is a defect in Plan 04 as built, and is out of
Plan 05's scope.

## Background

The topping's cap and skirt follow a smoothed stack: the layers joined by
smoothMinDistance(), with the skirt's blend, so the icing fills the channels
between layers (see [Plan 04](../../done/04-topping.md)). Plan 03's walk
picks the part with the least bound first, so the field is evaluated
cheaply (see [Plan 03](../../done/03-frame-budget.md)).

## The defect

The smooth minimum is not associative: `smin(smin(a, b), c)` is not
`smin(a, smin(b, c))`. `cakeField()` in `docs/src/sdf/cake.js` seeds the
smoothed stack with `firstSlot`, the layer whose bound is least at that
point. `layersField()` in `docs/src/sdf/layers.js` then folds in the other
slots in slot order. Where the least-bound layer changes from one point to
the next, the order changes, and the coat steps.

**Measured** by the review, in a JavaScript port of the field: the coat
steps by 0.14 mm on the static Victoria sponge, at a radius of 95.9 mm and
a height of 35.9 mm. Mid-transition, under Plan 05's springs, the step
reaches 0.24 mm. Not yet confirmed in the browser.

## To decide

Make the smoothed stack independent of the walk's order. Two candidates,
both to be measured in a port against Plan 03's step and evaluation counts:

- Fold the smoothed stack in fixed slot order, with the plate's term, and
  keep the least-bound seed only for the sharp distance `stack.x`.
- Use an order-independent n-ary smooth minimum, such as an exponential
  one, at the cost of an `exp()` and a `log()` per slot.

## Audit

- **2026-11-25T20:28:15Z** — **done**: resolved by [Plan 05](../05-transitions.md),
  Decision 16, which folds the smoothed stack in fixed slot order.
