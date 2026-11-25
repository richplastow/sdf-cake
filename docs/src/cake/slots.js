/**
 * @fileoverview
 * The fixed lengths of the arrays the resolver fills and the field's GLSL
 * loops over, which templates them in.
 */

// The most countable decorations a cake can hold: the length of every slot
// array the decorations' uniforms take. No recipe's countable total may
// pass it.
export const DECORATION_SLOTS = 24;
// The most layers a cake can hold.
export const LAYER_SLOTS = 7;
