/**
 * @fileoverview
 * The scene's lights: a key light over the viewer's right shoulder, and a
 * hemisphere fill, sky above and table below.
 */

import { DirectionalLight, HemisphereLight } from "three";

const FILL_GROUND_COLOR = 0x8c7a6b; // a warm, dark table, from below
const FILL_LIGHT_INTENSITY = 1;
const FILL_SKY_COLOR = 0xdfe9f3; // a pale blue sky, from above
const KEY_LIGHT_COLOR = 0xfff4e6; // warm white
const KEY_LIGHT_INTENSITY = 3;
const KEY_LIGHT_POSITION = [0.5, 1, 0.8]; // metres: right, above, in front

/** #### Creates the hemisphere fill and the directional key light
 * - The key light shines at its default target, the origin, where the cake
 *   sits. The shader marches the cake's own soft shadows along it: no
 *   shadow map is involved.
 * - Three.js hands each light's direction to the shader in view space, so
 *   the lights stay fixed to the world as the camera circles.
 * @returns The lights, to add to the scene.
 */
export const createLights = () => {
  const fill = new HemisphereLight(
    FILL_SKY_COLOR,
    FILL_GROUND_COLOR,
    FILL_LIGHT_INTENSITY,
  );
  const key = new DirectionalLight(KEY_LIGHT_COLOR, KEY_LIGHT_INTENSITY);
  key.position.set(...KEY_LIGHT_POSITION);
  return [fill, key];
};
