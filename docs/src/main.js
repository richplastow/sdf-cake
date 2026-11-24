/**
 * @fileoverview
 * Entry point: raymarches a cake, lit by the scene's lights, on a
 * transparent canvas, while the camera circles it slowly. That is the whole
 * of Presentation Mode, the only mode so far.
 */

import {
  MathUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from "three";
import { createLights } from "./scene/lights.js";
import { createRaymarchQuad } from "./scene/quad.js";

const CAMERA_DISTANCE_METERS = 0.4; // from the cake's centre
const CAMERA_ELEVATION_RADIANS = MathUtils.degToRad(22); // above the table
const CAMERA_FAR_METERS = 10;
const CAMERA_FOV_DEGREES = 35; // vertical; Three.js takes degrees
const CAMERA_NEAR_METERS = 0.01;
const CAMERA_TURN_RADIANS_PER_SECOND = MathUtils.degToRad(12); // a lap in 30 s
const FULL_TURN_RADIANS = 2 * Math.PI;
// Caps GPU cost on high-density screens: the shader runs once per pixel.
const MAX_PIXEL_RATIO = 2;

const canvas = document.querySelector("canvas.scene");

// An `alpha` canvas clears to transparent, so the page shows through where
// the shader draws nothing. Antialiasing stays off: it smooths only the
// edges of triangles, and the quad's lie off screen.
const renderer = new WebGLRenderer({ alpha: true, antialias: false, canvas });
renderer.toneMapping = NeutralToneMapping;

const scene = new Scene();
const camera = new PerspectiveCamera(
  CAMERA_FOV_DEGREES,
  1, // replaced by the canvas's aspect before the first frame
  CAMERA_NEAR_METERS,
  CAMERA_FAR_METERS,
);
scene.add(...createLights(), createRaymarchQuad(camera));

// With reduced motion, the camera holds its first place instead of circling.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let cameraAzimuthRadians = 0; // the camera's angle round the cake

/** Places the camera on its circle at the azimuth, looking at the cake. */
const placeCamera = () => {
  const flatMeters =
    CAMERA_DISTANCE_METERS * Math.cos(CAMERA_ELEVATION_RADIANS);
  camera.position.set(
    flatMeters * Math.sin(cameraAzimuthRadians),
    CAMERA_DISTANCE_METERS * Math.sin(CAMERA_ELEVATION_RADIANS),
    flatMeters * Math.cos(cameraAzimuthRadians),
  );
  camera.lookAt(0, 0, 0);
};

/** Fits the camera and the renderer to the canvas's size, in CSS pixels. */
const resize = (width, height) => {
  camera.aspect = width / height;
  // Also updates the inverse projection, which the quad reads by reference.
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  // CSS sizes the canvas, so Three.js must not set its style.
  renderer.setSize(width, height, false);
};

resize(canvas.clientWidth, canvas.clientHeight);
new ResizeObserver(([entry]) => {
  resize(entry.contentRect.width, entry.contentRect.height);
}).observe(canvas);

const timer = new Timer();
timer.connect(document); // no jump after the tab is hidden and shown again
renderer.setAnimationLoop((timestampMs) => {
  timer.update(timestampMs);
  if (!reducedMotion.matches) {
    const turnRadians = CAMERA_TURN_RADIANS_PER_SECOND * timer.getDelta();
    cameraAzimuthRadians =
      (cameraAzimuthRadians + turnRadians) % FULL_TURN_RADIANS;
  }
  placeCamera();
  renderer.render(scene, camera);
});
