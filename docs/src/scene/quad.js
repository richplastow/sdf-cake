/**
 * @fileoverview
 * The full-screen quad that the raymarching shader draws on: the only
 * geometry in the scene.
 */

import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three";
import { raymarchFragmentShader } from "../raymarch/fragment.js";
import { quadVertexShader } from "../raymarch/vertex.js";
import { createCakeUniforms } from "../sdf/cake.js";

const QUAD_SIZE_CLIP = 2; // the quad spans clip space, -1 to 1

/** #### Creates the full-screen quad, lit by the scene's lights
 * - Its ShaderMaterial has `lights: true`, so each frame the renderer fills
 *   the light uniforms that UniformsLib.lights declares from the scene's
 *   lights, and `dfgLUT`, the lookup texture Three.js's physical shading
 *   reads, from its own.
 * - UniformsUtils.merge() clones every value it is given, so the camera's
 *   two matrices, which the shader must read live, are added after the
 *   merge by reference: the camera updates both in place.
 * - The quad is never frustum culled: its corners are clip-space corners,
 *   which Three.js would otherwise test against the camera's frustum as if
 *   they were world positions.
 * @param camera The PerspectiveCamera whose rays the shader marches.
 * @returns The Mesh, to add to the scene.
 */
export const createRaymarchQuad = (camera) => {
  const uniforms = UniformsUtils.merge([
    UniformsLib.lights,
    { dfgLUT: { value: null } },
    createCakeUniforms(),
  ]);
  uniforms.cameraProjectionMatrixInverse = {
    value: camera.projectionMatrixInverse,
  };
  uniforms.cameraWorldMatrix = { value: camera.matrixWorld };

  const material = new ShaderMaterial({
    fragmentShader: raymarchFragmentShader,
    lights: true,
    uniforms,
    vertexShader: quadVertexShader,
  });
  const quad = new Mesh(
    new PlaneGeometry(QUAD_SIZE_CLIP, QUAD_SIZE_CLIP),
    material,
  );
  quad.frustumCulled = false;
  return quad;
};
