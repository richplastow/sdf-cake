/**
 * @fileoverview
 * Entry point: leads the visitor round the tour's pages, src/tour/pages.js,
 * from the page the location hash names, or the welcome page: a welcome dialog,
 * four cakes to guess, prompted by src/tour/guess.js, a fun-facts dialog, the
 * presentation cakes and a thank-you dialog. Raymarches the page's cake, or
 * nothing on a dialog's page, lit by the scene's lights, on a transparent
 * canvas, and turns it slowly like a turntable. A drag on the canvas turns and
 * tilts it, pausing the slow turn while held; the scroll wheel, a trackpad's
 * scroll or pinch, a touch screen's pinch, and a Cmd-drag up and down, or a
 * Ctrl-drag off Apple devices, zoom; a double-click eases the drag's turn and
 * tilt and the zoom back to the view at load. The eaten slider along the
 * bottom, Left and Right, and the two arrow buttons eat the cake step by step,
 * and from the slider's ends walk on along the tour, each cake becoming the
 * next on springs, its decorations sinking away first and the next cake's
 * dropping in last, with the location hash kept in step. The reveal slider up
 * the right, Up and Down take the cake apart part by part, and Escape hides and
 * shows the controls. Each presentation cake with a script,
 * src/tour/scripts.js, captions where its sliders are, and autoplays,
 * src/tour/autoplay.js: the visitor's own arrow or slider pauses it, and the
 * Play/Pause button at the top right resumes it. There the visitor's moves
 * keep to autoplay's path, src/tour/path.js, one stop at a time, and a
 * blocked one prompts the key that works. The camera stays fitted to the
 * cake. That is the whole of Presentation Mode, the only mode so far.
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
import { eatenAngleForStep, stepCountOf } from "./cake/slice.js";
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
import {
  createAutoplay,
  isAtEnd,
  isEndPromptDue,
  noteRight as noteRightAtEnd,
  pause,
  play,
  stepAutoplay,
} from "./tour/autoplay.js";
import { beatIndexAt } from "./tour/beats.js";
import {
  canWalkOn,
  createGuess,
  noteBlocked,
  noteReveal,
  noteRevealByVisitor,
  noteRight,
  promptOf,
  revealCapOf,
  stepGuess,
} from "./tour/guess.js";
import {
  isLastGuessPage,
  nextPageIndex,
  PAGES,
  pageIndexForHash,
  previousPageIndex,
} from "./tour/pages.js";
import {
  gateMove,
  hintOf,
  pathOf,
  startRevealMaxOf,
} from "./tour/path.js";
import { SCRIPTS } from "./tour/scripts.js";
import { connectCakeArrows } from "./ui/cake-arrows.js";
import { connectCaption } from "./ui/caption.js";
import { connectControlsToggle } from "./ui/controls-toggle.js";
import { connectDialogs } from "./ui/dialogs.js";
import { connectKeys } from "./ui/keys.js";
import { connectPlayButton } from "./ui/play-button.js";
import { connectPrompt } from "./ui/prompt.js";
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
// Where each dialog's button leads, by its page's `data-page` value: the
// id of the page to go to.
const DIALOG_TARGET_IDS = { "fun-facts": "pancake", thanks: "", welcome: "1" };
// How much slower the transition runs when Left walks back from a cake's
// first eaten step, or from an interlude, unitless: half speed, so twice
// as long, to show the change between cakes.
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

/** Tells whether a page shows a cake: a `guess` or `presentation` page. */
const isCakePage = (page) =>
  page.kind === "guess" || page.kind === "presentation";

/** Gives a `presentation` page's script, or `null` if it has none. */
const scriptFor = (page) =>
  page.kind === "presentation"
    ? (SCRIPTS.find((script) => script.pageId === page.id) ?? null)
    : null;

/** #### Gives a recipe's index in `RECIPES` for a cake page
 * - A page that shows no cake holds the current recipe, `heldIndex`.
 */
const recipeIndexOf = (page, heldIndex) =>
  isCakePage(page)
    ? RECIPES.findIndex((recipe) => recipe.id === page.id)
    : heldIndex;

// The page the hash names, and its cake at its first eaten step and its
// least reveal stop, the plate alone, in motion from load: its values are
// written into the material's own uniforms every frame. A page that shows
// no cake holds the first recipe, with nothing shown.
let pageIndex = pageIndexForHash(location.hash, PAGES);
let cakeIndex = recipeIndexOf(PAGES[pageIndex], 0);
let eatenStep = 0;
let revealStop = 0;
// The current recipe's greatest reveal stop, kept so the per-frame path
// allocates nothing.
let revealMax = revealMaxOf(RECIPES[cakeIndex]);
// The guess flow on a `guess` page, created afresh on each arrival, else
// `null`.
let guess =
  PAGES[pageIndex].kind === "guess"
    ? createGuess(isLastGuessPage(pageIndex, PAGES))
    : null;
// The current page's script, and its autoplay, created afresh on each
// arrival at a page with a script, else `null`.
let script = scriptFor(PAGES[pageIndex]);
let autoplay = script === null ? null : createAutoplay();
// The current script's autoplay path, which the visitor's moves keep to,
// built afresh on each arrival at a page with a script, else `null`.
let path = script === null ? null : pathOf(script.beats);
// The hint a blocked move shows, as hintOf() gives it, until the sliders
// next move or the page changes, else `null`.
let hint = null;
// How fast the cake's motion and the camera's fit run, unitless: 1 but
// while a walk back runs slower, until the next change.
let transitionTimeScale = 1;

/** #### Resolves a recipe at the current eaten step and reveal stop
 * - Its eaten angle is the step's, and the stop's presence mask is applied
 *   to it, so hidden parts have zero size. On a page that shows no cake,
 *   every part is hidden, the plate included.
 * @param recipe A recipe, as src/cake/recipes.js holds them.
 * @returns The resolved, masked cake, with its `decorations`.
 */
const stageCake = (recipe) => {
  const cake = resolveCake(recipe);
  cake.eatenAngleRadians = eatenAngleForStep(recipe.eaten, eatenStep);
  const mask = isCakePage(PAGES[pageIndex])
    ? presenceMaskFor(recipe, revealStop)
    : emptyMaskFor(recipe);
  return maskResolvedCake(cake, mask);
};

/** Gives a presence mask that hides every part of a recipe. */
const emptyMaskFor = (recipe) => ({
  plate: 0,
  layers: recipe.layers.map(() => 0),
  topping: 0,
  decorations: 0,
});

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
  sliders.setEaten(eatenStep, stepCountOf(RECIPES[cakeIndex]) - 1);
  sliders.setReveal(revealStop, revealMax);
};

/** #### Sets the controls and the dialog to suit the current page
 * - A page that shows no cake disables the sliders and the Right arrow,
 *   and the welcome page the Left arrow too; a dialog's page shows its
 *   dialog, and every other page none.
 */
const showPageControls = () => {
  const page = PAGES[pageIndex];
  const isCake = isCakePage(page);
  sliders.setDisabled(!isCake);
  arrows.setNextDisabled(!isCake);
  arrows.setPreviousDisabled(page.kind === "welcome");
  dialogs.showDialog(
    page.kind === "welcome" ? "welcome" : isCake ? null : page.id,
  );
};

/** #### Starts the transition to a page, and writes its id as the hash
 * - A cake page's cake arrives at its first eaten step. Coming from
 *   another cake, the reveal stop snaps to the new cake's slider by
 *   snapRevealStop(), so the cake arrives taken apart as far as the last
 *   one was; coming from a page that shows no cake, it starts at stop 0,
 *   so the plate grows from nothing.
 * - On a page with a script, the reveal stop is capped by
 *   startRevealMaxOf(), so a walk back lands on autoplay's path.
 * - A page that shows no cake holds the current recipe with every part
 *   hidden, so the cake and its plate shrink away.
 * - Retargets the motion from where it is; under reduced motion the cake
 *   and the camera go straight to the new fit.
 * - The welcome page writes the bare path, with no `#`.
 * @param index The page's index in `PAGES`.
 * @param timeScale How fast the transition and the camera's fit run,
 *   unitless: 1 as usual, below 1 slower.
 */
const goToPage = (index, timeScale = 1) => {
  transitionTimeScale = timeScale;
  const wasCake = isCakePage(PAGES[pageIndex]);
  const oldRevealMax = revealMax;
  pageIndex = index;
  const page = PAGES[index];
  if (isCakePage(page)) {
    cakeIndex = recipeIndexOf(page, cakeIndex);
    revealMax = revealMaxOf(RECIPES[cakeIndex]);
    eatenStep = 0;
    revealStop = wasCake
      ? snapRevealStop(revealStop, oldRevealMax, revealMax)
      : 0;
  }
  guess =
    page.kind === "guess" ? createGuess(isLastGuessPage(index, PAGES)) : null;
  script = scriptFor(page);
  autoplay = script === null ? null : createAutoplay();
  path = script === null ? null : pathOf(script.beats);
  hint = null;
  // The cap holds on arrival too, since snapRevealStop() can give the top.
  revealStop = Math.min(revealStop, revealCapNow());
  if (path !== null) revealStop = Math.min(revealStop, startRevealMaxOf(path));
  retargetCakeMotion(motion, stageCake(RECIPES[cakeIndex]), {
    reducedMotion: reducedMotion.matches,
  });
  isCameraJumping ||= reducedMotion.matches;
  showSliders();
  showPageControls();
  writeHash();
};

/** #### Writes the current page's id as the location hash
 * - The welcome page writes the bare path, with no `#`, so a load on an
 *   unknown hash, which names the welcome page, drops it.
 * - Uses history.replaceState(), which adds no history entry and fires no
 *   `hashchange`, so browser Back leaves the app.
 */
const writeHash = () => {
  const { id } = PAGES[pageIndex];
  history.replaceState(
    null,
    "",
    id === "" ? location.pathname + location.search : `#${id}`,
  );
};

/** #### Sets the eaten step within the current cake, easing the slice
 * - Ends any hint, as the sliders have moved.
 */
const setEatenStep = (step) => {
  transitionTimeScale = 1;
  eatenStep = step;
  hint = null;
  retargetSlice(motion, eatenAngleForStep(RECIPES[cakeIndex].eaten, step), {
    reducedMotion: reducedMotion.matches,
  });
  showSliders();
};

/** #### Sets the reveal stop within the current cake, easing the parts
 * - Ends any hint, as the sliders have moved.
 */
const setRevealStop = (stop) => {
  transitionTimeScale = 1;
  revealStop = stop;
  hint = null;
  retargetPresence(motion, stageCake(RECIPES[cakeIndex]), {
    reducedMotion: reducedMotion.matches,
  });
  showSliders();
};

/** #### Steps the eaten slider, walking along the tour from its ends
 * - Past step 0 it goes to the previous page, its transition slowed by
 *   `BACK_WALK_TIME_SCALE`; past the last step, to the next page with the
 *   reveal slider at its least stop. The tour does not wrap.
 * - On a `guess` page, past the last step walks on only once canWalkOn()
 *   allows it; until then it notes the block, which prompts for Reveal.
 * @param delta The steps to move, −1 or 1.
 */
const stepEaten = (delta) => {
  const step = eatenStep + delta;
  if (step < 0) {
    const previous = previousPageIndex(pageIndex, PAGES);
    if (previous !== null) goToPage(previous, BACK_WALK_TIME_SCALE);
  } else if (step > stepCountOf(RECIPES[cakeIndex]) - 1) {
    if (guess !== null && !canWalkOn(guess)) {
      noteBlocked(guess);
      return;
    }
    const next = nextPageIndex(pageIndex, PAGES);
    if (next === null) return;
    // Walking on resets the reveal slider to its least stop, the plate
    // alone, which snapRevealStop() keeps at 0 on the next cake.
    revealStop = 0;
    goToPage(next);
  } else {
    setEatenStep(step);
  }
};

/** #### Gives the highest reveal stop allowed now
 * - On a `guess` page, revealCapOf() holds it one below the top until the
 *   visitor's first Right; elsewhere it is the top.
 */
const revealCapNow = () =>
  guess === null ? revealMax : revealCapOf(guess, revealMax);

/** #### Steps the reveal slider, doing nothing past either end or the cap
 * @param delta The stops to move, −1 or 1.
 * @returns Whether the stop changed.
 */
const stepReveal = (delta) => {
  const stop = revealStop + delta;
  if (stop < 0 || stop > revealCapNow()) return false;
  setRevealStop(stop);
  return true;
};

/** #### Gives the stops a visitor's slider move may take now
 * - On a page with a script, gateMove() keeps it to autoplay's path, one
 *   stop at a time, and a blocked move sets the hint for the key that
 *   works; elsewhere every move passes whole.
 * @param delta The stops asked for, negative for back.
 * @param slider The slider to move, `"eaten"` or `"reveal"`.
 * @returns The stops to move.
 */
const gatedDeltaOf = (delta, slider) => {
  if (path === null || delta === 0) return delta;
  const allowed = gateMove(delta, eatenStep, path, revealStop, slider);
  if (allowed === 0) hint = hintOf(delta, eatenStep, path, revealStop);
  return allowed;
};

/** #### Steps the reveal slider for the visitor's Up or Down
 * - Does nothing on a page that shows no cake. Pauses autoplay first, then
 *   keeps to autoplay's path by gatedDeltaOf(); on a `guess` page, a
 *   change is noted as the visitor's, which ends the Up prompt.
 * @param delta The stops to move, −1 or 1.
 */
const revealByVisitor = (delta) => {
  if (!isCakePage(PAGES[pageIndex])) return;
  if (autoplay !== null) pause(autoplay);
  if (gatedDeltaOf(delta, "reveal") === 0) return;
  if (stepReveal(delta) && guess !== null) noteRevealByVisitor(guess);
};

/** #### Handles the visitor's Left, by key or button
 * - Pauses autoplay first, so a walk back leaves the page it reaches
 *   autoplaying afresh.
 * - Does nothing on the welcome page; on an interlude, goes back one page,
 *   slowly; on a cake page, steps the eaten slider back, if
 *   gatedDeltaOf() allows it.
 */
const goLeft = () => {
  if (autoplay !== null) pause(autoplay);
  const page = PAGES[pageIndex];
  if (page.kind === "welcome") return;
  if (isCakePage(page)) {
    if (gatedDeltaOf(-1, "eaten") !== 0) stepEaten(-1);
    return;
  }
  const previous = previousPageIndex(pageIndex, PAGES);
  if (previous !== null) goToPage(previous, BACK_WALK_TIME_SCALE);
};

/** #### Handles the visitor's Right, by key or button
 * - Does nothing on a page that shows no cake. It is noted first: on a
 *   `guess` page, so it lifts the reveal cap; with autoplay, which it
 *   pauses, so at the end it dismisses the end prompt, and a walk on
 *   leaves the next cake autoplaying afresh. Then it steps the eaten
 *   slider, if gatedDeltaOf() allows it.
 */
const goRight = () => {
  if (!isCakePage(PAGES[pageIndex])) return;
  if (guess !== null) noteRight(guess);
  if (autoplay !== null) {
    pause(autoplay);
    noteRightAtEnd(autoplay);
  }
  if (gatedDeltaOf(1, "eaten") !== 0) stepEaten(1);
};

/** #### Gives the prompt to show now
 * - The guess flow's on a `guess` page; else a blocked move's hint; else
 *   `"end"` once autoplay's end prompt is due; else `null`, for none.
 */
const promptKindNow = () => {
  if (guess !== null) return promptOf(guess, revealStop, revealMax);
  if (hint !== null) return hint;
  return autoplay !== null && isEndPromptDue(autoplay) ? "end" : null;
};

/** #### Gives the action the Play/Pause button takes now
 * - `"pause"` while autoplay plays short of the end; `"play"` while it is
 *   paused or at the end, where it has stopped; `null` with no autoplay,
 *   which hides the button.
 */
const playActionNow = () => {
  if (autoplay === null) return null;
  return autoplay.isPaused || isAtEnd(autoplay) ? "play" : "pause";
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
// within the cake; neither walks to another cake. Only the visitor fires
// them, so each pauses autoplay first, and a reveal change is noted as the
// visitor's. On a page with a script, gatedDeltaOf() takes each event at
// most one stop along autoplay's path. A click or drag past the reveal cap
// or the path snaps the slider back.
const sliders = connectSliders(controls, {
  onEaten: (input) => {
    if (autoplay !== null) pause(autoplay);
    const step = eatenStep + gatedDeltaOf(input - eatenStep, "eaten");
    if (step === eatenStep) {
      showSliders();
      return;
    }
    setEatenStep(step);
  },
  onReveal: (input) => {
    if (autoplay !== null) pause(autoplay);
    const stop = Math.min(
      revealStop + gatedDeltaOf(input - revealStop, "reveal"),
      revealCapNow(),
    );
    if (stop === revealStop) {
      showSliders();
      return;
    }
    setRevealStop(stop);
    if (guess !== null) noteRevealByVisitor(guess);
  },
});
// The arrow keys on the welcome page and the interludes are gated here,
// since src/ui/keys.js cancels them before any dialog sees them.
connectKeys({
  onDown: () => revealByVisitor(-1),
  onLeft: goLeft,
  onRight: goRight,
  onSpace: () => {
    isTurntableOn = !isTurntableOn;
  },
  onUp: () => revealByVisitor(1),
});
const arrows = connectCakeArrows(controls, {
  onNext: goRight,
  onPrevious: goLeft,
});
const dialogs = connectDialogs({
  onButton: (pageKey) => {
    goToPage(pageIndexForHash(DIALOG_TARGET_IDS[pageKey], PAGES));
  },
});
const tourPrompt = connectPrompt({
  onReveal: () => {
    if (guess !== null) noteReveal(guess);
  },
});
const caption = connectCaption();
// The Play/Pause button takes the action it shows: Play resumes autoplay
// from the beat the sliders are at, and Pause pauses it.
const playButton = connectPlayButton(controls, {
  onPress: () => {
    if (autoplay === null) return;
    if (autoplay.isPaused) play(autoplay);
    else pause(autoplay);
  },
});
showSliders();
showPageControls();
writeHash();
connectControlsToggle();
// The viewer editing the hash in the URL starts a transition to the page
// it names; history.replaceState() fires no `hashchange`, so the tour's
// own writes never reach here.
window.addEventListener("hashchange", () => {
  goToPage(pageIndexForHash(location.hash, PAGES));
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
  // The guess flow steps the reveal slider up by itself, never as the
  // visitor, and shows the prompt it calls for.
  if (guess !== null && stepGuess(guess, deltaSeconds, revealStop)) {
    stepReveal(1);
  }
  // Autoplay moves the sliders through the setters, never as the visitor,
  // so its own moves never pause it.
  if (autoplay !== null) {
    const move = stepAutoplay(
      autoplay,
      script.beats,
      deltaSeconds,
      eatenStep,
      revealStop,
    );
    if (move === "eaten") setEatenStep(eatenStep + 1);
    else if (move === "reveal") setRevealStop(revealStop + 1);
  }
  tourPrompt.showPrompt(promptKindNow(), PAGES[pageIndex].cakeName);
  caption.showCaption(
    script,
    script === null ? 0 : beatIndexAt(script.beats, eatenStep, revealStop),
  );
  playButton.showPlayButton(
    playActionNow(),
    autoplay !== null && isAtEnd(autoplay),
  );
  stepCakeMotion(motion, transitionTimeScale * deltaSeconds);
  writeCakeUniforms(quad.material.uniforms, motion.values);
  stepCameraFit(transitionTimeScale * deltaSeconds);
  stepViewReset(deltaSeconds, viewReset, view);
  placeView();
  renderer.render(scene, camera);
});
