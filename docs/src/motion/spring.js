/**
 * @fileoverview
 * A damped spring, stepped by its exact closed-form solution, and the
 * presets the cake's motion and the camera use. Pure maths: nothing here
 * imports from `three`, so Node can run it.
 */

// Each preset is a frequency in hertz and a damping ratio, unitless: below
// 1 the spring overshoots and rings, at 1 it settles fastest without
// passing its target, and above 1 it creeps in. First guesses, to tune by
// eye.

// The camera's distance and the rig's height.
export const CAMERA_SPRING = { dampingRatio: 1, hertz: 1 };
// Each colour channel, each roughness, the plate's metalness and the
// topping's translucency, so none of them overshoots.
export const COLOR_SPRING = { dampingRatio: 1, hertz: 1.6 };
// Every length, the coverage and the plate.
export const LENGTH_SPRING = { dampingRatio: 0.85, hertz: 1.6 };
// A layer's bottom: slow and underdamped, so upper layers hang and bounce.
export const STACK_SPRING = { dampingRatio: 0.35, hertz: 1.1 };

/** #### Creates a spring at rest on a value
 * @param value The spring's value and target.
 * @returns The spring: `target`, `value` and `velocity`, per second.
 */
export const createSpring = (value) => ({
  target: value,
  value,
  velocity: 0,
});

/** #### Advances a spring by a time step, in place
 * - Uses Ryan Juckett's closed form of the damped harmonic oscillator, so
 *   any time step lands on the same curve:
 *   https://www.ryanjuckett.com/damped-springs/
 * - Picks the overdamped, critically damped or underdamped solution by the
 *   damping ratio.
 * - A time step of 0 or less changes nothing.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param spring The spring, mutated: `value` and `velocity`.
 * @param preset The spring's `dampingRatio`, unitless, and `hertz`.
 * @param deltaSeconds The time step, in seconds.
 */
export const stepSpring = (spring, preset, deltaSeconds) => {
  if (!(deltaSeconds > 0)) return;
  const { dampingRatio } = preset;
  const omega = 2 * Math.PI * preset.hertz; // radians per second
  const t = deltaSeconds;

  let posPos, posVel, velPos, velVel;
  if (dampingRatio > 1) {
    const za = -omega * dampingRatio;
    const zb = omega * Math.sqrt(dampingRatio * dampingRatio - 1);
    const z1 = za - zb;
    const z2 = za + zb;
    const e1 = Math.exp(z1 * t);
    const e2 = Math.exp(z2 * t);
    const invTwoZb = 1 / (2 * zb);
    const e1OverTwoZb = e1 * invTwoZb;
    const e2OverTwoZb = e2 * invTwoZb;
    const z1e1OverTwoZb = z1 * e1OverTwoZb;
    const z2e2OverTwoZb = z2 * e2OverTwoZb;
    posPos = e1OverTwoZb * z2 - z2e2OverTwoZb + e2;
    posVel = -e1OverTwoZb + e2OverTwoZb;
    velPos = (z1e1OverTwoZb - z2e2OverTwoZb + e2) * z2;
    velVel = -z1e1OverTwoZb + z2e2OverTwoZb;
  } else if (dampingRatio < 1) {
    const omegaZeta = omega * dampingRatio;
    const alpha = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
    const expTerm = Math.exp(-omegaZeta * t);
    const cosTerm = Math.cos(alpha * t);
    const sinTerm = Math.sin(alpha * t);
    const expSin = expTerm * sinTerm;
    const expCos = expTerm * cosTerm;
    const expOmegaZetaSinOverAlpha = (expTerm * omegaZeta * sinTerm) / alpha;
    posPos = expCos + expOmegaZetaSinOverAlpha;
    posVel = expSin / alpha;
    velPos = -expSin * alpha - omegaZeta * expOmegaZetaSinOverAlpha;
    velVel = expCos - expOmegaZetaSinOverAlpha;
  } else {
    const expTerm = Math.exp(-omega * t);
    const timeExp = t * expTerm;
    const timeExpFreq = timeExp * omega;
    posPos = timeExpFreq + expTerm;
    posVel = timeExp;
    velPos = -omega * timeExpFreq;
    velVel = -timeExpFreq + expTerm;
  }

  const offset = spring.value - spring.target;
  const velocity = spring.velocity;
  spring.value = offset * posPos + velocity * posVel + spring.target;
  spring.velocity = offset * velPos + velocity * velVel;
};
