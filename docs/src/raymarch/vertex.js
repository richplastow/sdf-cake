/**
 * @fileoverview
 * The full-screen quad's vertex shader, which passes the quad's corners
 * straight to clip space and hands each fragment its place on screen.
 */

/** #### The vertex shader of the full-screen quad
 * - The quad is a PlaneGeometry(2, 2), whose corners are already the
 *   clip-space corners, (-1, -1) to (1, 1), so no matrix is applied.
 * - `vNdc` is the fragment's normalised device coordinates, -1 to 1 across
 *   the viewport, from which the fragment shader builds its ray.
 * - Three.js prepends the `position` attribute's declaration.
 */
export const quadVertexShader = /* glsl */ `
  varying vec2 vNdc;

  void main() {
    vNdc = position.xy;
    gl_Position = vec4(position, 1.0);
  }
`;
