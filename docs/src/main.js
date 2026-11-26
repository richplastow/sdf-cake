/**
 * @fileoverview
 * Entry point: raymarches the cake the location hash names, or the first
 * in walk order, lit by the scene's lights, on a transparent canvas, and
 * turns it slowly like a turntable. A drag on the canvas turns and tilts
 * it, pausing the slow turn while held; the scroll wheel, a trackpad's
 * scroll or pinch, a touch screen's pinch, and a Cmd-drag up and down, or
 * a Ctrl-drag off Apple devices, zoom; a double-click eases the drag's turn
 * and tilt and the zoom back to the view at load. The eaten slider along
 * the bottom, Left and Right, and the two arrow buttons eat the cake step
 * by step, and from the slider's ends walk round the loop of cakes, each
 * becoming the next on springs, its decorations sinking away first and the
 * next cake's dropping in last, with the location hash kept in step. The
 * reveal slider up the right, Up and Down take the cake apart part by
 * part, and Escape hides and shows the controls. The camera stays fitted
 * to the cake. That is the whole of Presentation Mode, the only mode so
 * far.
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
import { placeDecorations, placeScatter } from "./cake/place.js";
import { RECIPES } from "./cake/recipes.js";
import { resolveRecipe } from "./cake/resolve.js";
import {
  maskResolvedCake,
  presenceMaskFor,
  revealPartsOf,
  snapRevealStop,
} from "./cake/reveal.js";
import { cakeIndexForHash } from "./cake/select.js";
import { eatenAngleForStep, stepCountOf } from "./cake/slice.js";
import { nextCakeIndex, previousCakeIndex } from "./cake/walk.js";
import { distanceToFitSphere, fitSphereOfBounds } from "./camera/fit.js";
import { connectDrag } from "./input/drag.js";
import {
  startViewReset,
  stepViewReset,
  turnView,
  VIEW_ZOOM_LOG_PER_PIXEL,
  zoomView,
} from "./input/view.js";
import { connectZoom } from "./input/zoom.js";
import {
  createCakeMotion,
  retargetCakeMotion,
  retargetPresence,
  retargetSlice,
  stepCakeMotion,
} from "./motion/cake-motion.js";
import { CAMERA_SPRING, createSpring, stepSpring } from "./motion/spring.js";
import { createLights } from "./scene/lights.js";
import { createRaymarchQuad } from "./scene/quad.js";
import { writeCakeUniforms } from "./sdf/cake.js";
import { connectCakeArrows } from "./ui/cake-arrows.js";
import { connectControlsToggle } from "./ui/controls-toggle.js";
import { connectKeys } from "./ui/keys.js";
import { connectSliders } from "./ui/sliders.js";

const CAMERA_ELEVATION_RADIANS = MathUtils.degToRad(22); // above the table
const CAMERA_FAR_METERS = 10;
const CAMERA_FOV_DEGREES = 35; // vertical; Three.js takes degrees
const CAMERA_NEAR_METERS = 0.01;
// Where the flames' flicker clock wraps back to 0, in seconds, so a 32-bit
// float in the shader keeps its precision: a one-frame jump in the
// flicker's phase once an hour.
const FLAME_CLOCK_WRAP_SECONDS = 3600;
// How much larger than the sphere round the cake the camera fits,
// unitless, so the cake never touches the view's edge.
const FIT_MARGIN = 1.15;
// How much slower the transition runs when Left walks back from a cake's
// first eaten step, unitless: half speed, so twice as long, to show the
// change between cakes.
const BACK_WALK_TIME_SCALE = 0.5;
// The least radius of the sphere the camera fits, in metres, so a small
// cake looks small rather than filling the view as a large one does. Below
// every other cake's sphere, so only the honey cake's fit changes.
const MIN_FIT_RADIUS_METERS = 0.1;
const FULL_TURN_RADIANS = 2 * Math.PI;
// The slow turn of the turntable while nothing holds it: a lap in 30 s.
const IDLE_TURN_RADIANS_PER_SECOND = MathUtils.degToRad(12);
// How long Space takes to ease the slow turn to a stop, or back up to
// speed, in seconds.
const TURNTABLE_EASE_SECONDS = 0.3;
// The zoom's limits, as multiples of the fitted distance, unitless: near
// enough to see the crumb, and far enough to see the cake small in the
// view. First guesses, to tune by eye.
const MAX_ZOOM_RATIO = 3;
const MIN_ZOOM_RATIO = 0.375;
// Caps GPU cost on high-density screens: the shader runs once per pixel,
// so the canvas draws one device pixel per CSS pixel and the browser
// scales it up. At 2, the Black Forest took 24.0 ms a frame on the M4; at
// 1, it holds the display's 16.7 ms, at the cost of slight steps along the
// silhouette and the cut's edges on a Retina screen.
const MAX_PIXEL_RATIO = 1;

// The tilt stops where the view looks straight down or straight up the
// cake's vertical axis. Past either limit, a drag right would carry the
// cake's near surface left.
const MAX_PITCH_RADIANS = Math.PI / 2 - CAMERA_ELEVATION_RADIANS;
const MIN_PITCH_RADIANS = -(Math.PI / 2 + CAMERA_ELEVATION_RADIANS);
const MAX_ZOOM_LOG = Math.log(MAX_ZOOM_RATIO);
const MIN_ZOOM_LOG = Math.log(MIN_ZOOM_RATIO);

const canvas = document.querySelector("canvas.scene");
const controls = document.querySelector(".controls");

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
// Raised above the rig's centre on the +Z side, looking down at it.
camera.rotation.x = -CAMERA_ELEVATION_RADIANS;

// The camera and the lights ride one rig, which turns round the cake by
// the inverse of the cake's turn, so the field stays put in the shader and
// the march costs nothing more, yet the picture is the cake turning under
// lights that keep their place beside the viewer.
const rig = new Group();
rig.add(camera, ...createLights());
const quad = createRaymarchQuad(camera);
scene.add(rig, quad);

/** #### Resolves a recipe and places its decorations
 * - Placement is deterministic, so a cake always decorates the same way.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The resolved cake, with its `decorations`: its `slots` and its
 *   `scatter`.
 */
const resolveCake = (recipe) => {
  const cake = resolveRecipe(recipe);
  cake.decorations = {
    scatter: placeScatter(recipe),
    slots: placeDecorations(recipe),
  };
  return cake;
};

/** Gives a recipe's greatest reveal stop, the whole cake. */
const revealMaxOf = (recipe) => revealPartsOf(recipe).length - 1;

// The cake the hash names, at its first eaten step and its least reveal
// stop, the plate alone, in motion from load: its values are written into
// the material's own uniforms every frame.
let cakeIndex = cakeIndexForHash(location.hash, RECIPES);
let eatenStep = 0;
let revealStop = 0;
// How fast the cake's motion and the camera's fit run, unitless: 1 but
// while a walk back runs slower, until the next change.
let transitionTimeScale = 1;

/** #### Resolves a recipe at the current eaten step and reveal stop
 * - Its eaten angle is the step's, and the stop's presence mask is applied
 *   to it, so hidden parts have zero size.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The resolved, masked cake, with its `decorations`.
 */
const stageCake = (recipe) => {
  const cake = resolveCake(recipe);
  cake.eatenAngleRadians = eatenAngleForStep(recipe.eaten, eatenStep);
  return maskResolvedCake(cake, presenceMaskFor(recipe, revealStop));
};

const motion = createCakeMotion(stageCake(RECIPES[cakeIndex]));

// The camera's distance from the rig, before the zoom, and the rig's
// height, each springing to fit the sphere round the cake's bounding
// cylinders. The rig sits on the cake's axis at the sphere's centre, so
// the camera looks at it and the turn is about the axis. Both jump to
// their targets on the first frame, and after a change under reduced
// motion.
const cameraDistance = createSpring(0);
const rigHeight = createSpring(0);
const sphere = { centerMeters: 0, radiusMeters: 0 };
let isCameraJumping = true;

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
let isTurntableOn = true; // Space stops and starts the slow turn
// How far the slow turn is through its ease, 0 stopped to 1 at full speed,
// linear in time.
let turntableShare = 1;

/** #### Sets both sliders' values and `max`es to the current cake's */
const showSliders = () => {
  const recipe = RECIPES[cakeIndex];
  sliders.setEaten(eatenStep, stepCountOf(recipe) - 1);
  sliders.setReveal(revealStop, revealMaxOf(recipe));
};

/** #### Starts the transition to a cake, and writes its id as the hash
 * - The reveal stop snaps to the new cake's slider by snapRevealStop(), so
 *   the cake arrives taken apart as far as the last one was.
 * - Retargets the motion from where it is; under reduced motion the cake
 *   and the camera go straight to the new fit.
 * @param index The cake's index in walk order.
 * @param step The eaten step the cake arrives at.
 * @param timeScale How fast the transition and the camera's fit run,
 *   unitless: 1 as usual, below 1 slower.
 */
const goToCake = (index, step, timeScale = 1) => {
  transitionTimeScale = timeScale;
  const oldRevealMax = revealMaxOf(RECIPES[cakeIndex]);
  cakeIndex = index;
  const recipe = RECIPES[index];
  eatenStep = step;
  revealStop = snapRevealStop(revealStop, oldRevealMax, revealMaxOf(recipe));
  retargetCakeMotion(motion, stageCake(recipe), {
    reducedMotion: reducedMotion.matches,
  });
  isCameraJumping ||= reducedMotion.matches;
  showSliders();
  history.replaceState(null, "", `#${recipe.id}`);
};

/** #### Sets the eaten step within the current cake, easing the slice */
const setEatenStep = (step) => {
  transitionTimeScale = 1;
  eatenStep = step;
  retargetSlice(motion, eatenAngleForStep(RECIPES[cakeIndex].eaten, step), {
    reducedMotion: reducedMotion.matches,
  });
  showSliders();
};

/** #### Sets the reveal stop within the current cake, easing the parts */
const setRevealStop = (stop) => {
  transitionTimeScale = 1;
  revealStop = stop;
  retargetPresence(motion, stageCake(RECIPES[cakeIndex]), {
    reducedMotion: reducedMotion.matches,
  });
  showSliders();
};

/** #### Steps the eaten slider, walking to the next cake from its ends
 * - Past step 0 it goes to the previous cake at step 0, its transition
 *   slowed by `BACK_WALK_TIME_SCALE`; past the last step, to the next cake
 *   at step 0 with the reveal slider at its least stop, both wrapping.
 * @param delta The steps to move, −1 or 1.
 */
const stepEaten = (delta) => {
  const step = eatenStep + delta;
  if (step < 0) {
    goToCake(previousCakeIndex(cakeIndex, RECIPES), 0, BACK_WALK_TIME_SCALE);
  } else if (step > stepCountOf(RECIPES[cakeIndex]) - 1) {
    // Walking on resets the reveal slider to its least stop, the plate
    // alone, which snapRevealStop() keeps at 0 on the next cake.
    revealStop = 0;
    goToCake(nextCakeIndex(cakeIndex, RECIPES), 0);
  } else {
    setEatenStep(step);
  }
};

/** #### Steps the reveal slider, doing nothing past either end
 * @param delta The stops to move, −1 or 1.
 */
const stepReveal = (delta) => {
  const stop = revealStop + delta;
  if (stop < 0 || stop > revealMaxOf(RECIPES[cakeIndex])) return;
  setRevealStop(stop);
};

/** #### Places the rig and the camera to show the view
 * - The rig stands at its sprung height, and the camera at its sprung
 *   distance times the zoom.
 * - The cake's turn is its yaw about its vertical axis, then its pitch
 *   towards the viewer, as pureland-simulator's paper turns: Euler angles
 *   `(pitch, yaw, 0)` in the order `XYZ`. The rig takes the inverse,
 *   `(−pitch, −yaw, 0)` in the order `YXZ`.
 * - Allocates nothing, so it is safe on the per-frame path.
 */
const placeView = () => {
  rig.position.y = rigHeight.value;
  rig.rotation.set(
    -view.pitchRadians,
    -(view.yawRadians + idleYawRadians),
    0,
    "YXZ",
  );
  const distanceMeters = cameraDistance.value * Math.exp(view.zoomLog);
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

// The sliders' `input` events, from a key, a click or a drag, retarget
// within the cake; neither walks to another cake.
const sliders = connectSliders(controls, {
  onEaten: (step) => {
    if (step !== eatenStep) setEatenStep(step);
  },
  onReveal: (stop) => {
    if (stop !== revealStop) setRevealStop(stop);
  },
});
showSliders();
connectKeys({
  onDown: () => stepReveal(-1),
  onLeft: () => stepEaten(-1),
  onRight: () => stepEaten(1),
  onSpace: () => {
    isTurntableOn = !isTurntableOn;
  },
  onUp: () => stepReveal(1),
});
connectCakeArrows(controls, {
  onNext: () => stepEaten(1),
  onPrevious: () => stepEaten(-1),
});
connectControlsToggle();
// The viewer editing the hash in the URL starts a transition to the cake
// it names, at its first eaten step; history.replaceState() fires no
// `hashchange`, so the walk's own writes never reach here.
window.addEventListener("hashchange", () => {
  goToCake(cakeIndexForHash(location.hash, RECIPES), 0);
});

/** #### Steps the camera's springs towards the fit of the cake's values
 * - The distance fits the sphere round the bounding cylinders, grown by
 *   `FIT_MARGIN`, to the canvas's aspect; the rig's height is the
 *   sphere's centre.
 * - Allocates nothing, so it is safe on the per-frame path.
 * @param deltaSeconds The time elapsed since the last frame, in seconds.
 */
const stepCameraFit = (deltaSeconds) => {
  fitSphereOfBounds(motion.values.bounds, sphere);
  cameraDistance.target = distanceToFitSphere(
    camera.aspect,
    CAMERA_FOV_DEGREES,
    FIT_MARGIN * Math.max(sphere.radiusMeters, MIN_FIT_RADIUS_METERS),
  );
  rigHeight.target = sphere.centerMeters;
  if (isCameraJumping) {
    isCameraJumping = false;
    cameraDistance.value = cameraDistance.target;
    cameraDistance.velocity = 0;
    rigHeight.value = rigHeight.target;
    rigHeight.velocity = 0;
    return;
  }
  stepSpring(cameraDistance, CAMERA_SPRING, deltaSeconds);
  stepSpring(rigHeight, CAMERA_SPRING, deltaSeconds);
};

const timer = new Timer();
timer.connect(document); // no jump after the tab is hidden and shown again
renderer.setAnimationLoop((timestampMs) => {
  timer.update(timestampMs);
  const deltaSeconds = timer.getDelta();
  const easeStep = deltaSeconds / TURNTABLE_EASE_SECONDS;
  turntableShare = isTurntableOn
    ? Math.min(turntableShare + easeStep, 1)
    : Math.max(turntableShare - easeStep, 0);
  if (!reducedMotion.matches && !isHeld) {
    // Turns the cake clockwise, seen from above, at a speed eased in and
    // out by smoothstep as Space stops and starts it.
    const s = turntableShare;
    const turnRadians =
      IDLE_TURN_RADIANS_PER_SECOND * s * s * (3 - 2 * s) * deltaSeconds;
    idleYawRadians = (idleYawRadians - turnRadians) % FULL_TURN_RADIANS;
  }
  // The flames flicker even while the cake is held, and stand still under
  // reduced motion, as the cake does.
  if (!reducedMotion.matches) {
    const flameSeconds = quad.material.uniforms.flameSeconds;
    flameSeconds.value =
      (flameSeconds.value + deltaSeconds) % FLAME_CLOCK_WRAP_SECONDS;
  }
  stepCakeMotion(motion, transitionTimeScale * deltaSeconds);
  writeCakeUniforms(quad.material.uniforms, motion.values);
  stepCameraFit(transitionTimeScale * deltaSeconds);
  stepViewReset(deltaSeconds, viewReset, view);
  placeView();
  renderer.render(scene, camera);
});
