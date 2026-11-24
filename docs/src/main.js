/**
 * @fileoverview
 * Entry point: raymarches a cake, lit by the scene's lights, on a
 * transparent canvas, and turns it slowly like a turntable. A drag on the
 * canvas turns and tilts it, pausing the slow turn while held; the scroll
 * wheel, a trackpad's scroll or pinch, a touch screen's pinch, and a
 * Cmd-drag up and down, or a Ctrl-drag off Apple devices, zoom; a
 * double-click eases the drag's
 * turn and tilt and the zoom back to the view at load. That is the whole
 * of Presentation Mode, the only mode so far.
 */

import {
  Group,
  MathUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from "three";
import { connectDrag } from "./input/drag.js";
import {
  startViewReset,
  stepViewReset,
  turnView,
  VIEW_ZOOM_LOG_PER_PIXEL,
  zoomView,
} from "./input/view.js";
import { connectZoom } from "./input/zoom.js";
import { createLights } from "./scene/lights.js";
import { createRaymarchQuad } from "./scene/quad.js";

const CAMERA_DISTANCE_METERS = 0.4; // from the cake's centre, at load
const CAMERA_ELEVATION_RADIANS = MathUtils.degToRad(22); // above the table
const CAMERA_FAR_METERS = 10;
const CAMERA_FOV_DEGREES = 35; // vertical; Three.js takes degrees
const CAMERA_NEAR_METERS = 0.01;
const FULL_TURN_RADIANS = 2 * Math.PI;
// The slow turn of the turntable while nothing holds it: a lap in 30 s.
const IDLE_TURN_RADIANS_PER_SECOND = MathUtils.degToRad(12);
// The zoom's limits: near enough to see the crumb, about 5 cm from the
// icing's rim, and far enough to see the cake whole on a phone. First
// guesses, to tune by eye.
const MAX_CAMERA_DISTANCE_METERS = 1.2;
const MIN_CAMERA_DISTANCE_METERS = 0.15;
// Caps GPU cost on high-density screens: the shader runs once per pixel.
const MAX_PIXEL_RATIO = 2;

// The tilt stops where the view looks straight down or straight up the
// cake's vertical axis. Past either limit, a drag right would carry the
// cake's near surface left.
const MAX_PITCH_RADIANS = Math.PI / 2 - CAMERA_ELEVATION_RADIANS;
const MIN_PITCH_RADIANS = -(Math.PI / 2 + CAMERA_ELEVATION_RADIANS);
const MAX_ZOOM_LOG = Math.log(
  MAX_CAMERA_DISTANCE_METERS / CAMERA_DISTANCE_METERS,
);
const MIN_ZOOM_LOG = Math.log(
  MIN_CAMERA_DISTANCE_METERS / CAMERA_DISTANCE_METERS,
);

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
// Raised above the cake on the +Z side, looking down at its centre.
camera.rotation.x = -CAMERA_ELEVATION_RADIANS;

// The camera and the lights ride one rig, which turns round the cake by
// the inverse of the cake's turn, so the field stays put in the shader and
// the march costs nothing more, yet the picture is the cake turning under
// lights that keep their place beside the viewer.
const rig = new Group();
rig.add(camera, ...createLights());
scene.add(rig, createRaymarchQuad(camera));

// The view a drag, a zoom and a double-click change, and its ease back to
// the view at load; done at load.
const view = { pitchRadians: 0, yawRadians: 0, zoomLog: 0 };
const viewReset = {
  fromPitchRadians: 0,
  fromYawRadians: 0,
  fromZoomLog: 0,
  progress: 1,
};

// With reduced motion, the turntable holds still instead of turning slowly;
// a drag still turns it.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let idleYawRadians = 0; // the slow turn's share of the cake's yaw
let isHeld = false; // a press holds the cake, which pauses the slow turn

/** #### Places the rig and the camera to show the view
 * - The cake's turn is its yaw about its vertical axis, then its pitch
 *   towards the viewer, as pureland-simulator's paper turns: Euler angles
 *   `(pitch, yaw, 0)` in the order `XYZ`. The rig takes the inverse,
 *   `(−pitch, −yaw, 0)` in the order `YXZ`.
 * - Allocates nothing, so it is safe on the per-frame path.
 */
const placeView = () => {
  rig.rotation.set(
    -view.pitchRadians,
    -(view.yawRadians + idleYawRadians),
    0,
    "YXZ",
  );
  const distanceMeters = CAMERA_DISTANCE_METERS * Math.exp(view.zoomLog);
  camera.position.set(
    0,
    distanceMeters * Math.sin(CAMERA_ELEVATION_RADIANS),
    distanceMeters * Math.cos(CAMERA_ELEVATION_RADIANS),
  );
};

/** Zooms the view, cancelling a reset under way where it is. */
const zoomBy = (deltaZoomLog) => {
  viewReset.progress = 1;
  zoomView(deltaZoomLog, MAX_ZOOM_LOG, MIN_ZOOM_LOG, view);
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

// A drag turns the cake, or with the modifier held, Cmd on Apple devices
// and Ctrl on others, zooms by its up and down, cancelling a reset under
// way where it is; a pinch zooms by the fingers' spread, so the cake keeps
// pace with them.
connectDrag(canvas, {
  onDrag: (deltaXPixels, deltaYPixels, isModified) => {
    if (isModified) {
      zoomBy(deltaYPixels * VIEW_ZOOM_LOG_PER_PIXEL);
      return;
    }
    viewReset.progress = 1;
    turnView(
      deltaXPixels,
      deltaYPixels,
      MAX_PITCH_RADIANS,
      MIN_PITCH_RADIANS,
      view,
    );
  },
  onHold: () => {
    isHeld = true;
  },
  onPinch: (spreadRatio) => zoomBy(-Math.log(spreadRatio)),
  onRelease: () => {
    isHeld = false;
  },
});
connectZoom(canvas, zoomBy);
canvas.addEventListener("dblclick", () => startViewReset(viewReset, view));

const timer = new Timer();
timer.connect(document); // no jump after the tab is hidden and shown again
renderer.setAnimationLoop((timestampMs) => {
  timer.update(timestampMs);
  const deltaSeconds = timer.getDelta();
  if (!reducedMotion.matches && !isHeld) {
    // Turns the cake clockwise, seen from above.
    const turnRadians = IDLE_TURN_RADIANS_PER_SECOND * deltaSeconds;
    idleYawRadians = (idleYawRadians - turnRadians) % FULL_TURN_RADIANS;
  }
  stepViewReset(deltaSeconds, viewReset, view);
  placeView();
  renderer.render(scene, camera);
});
