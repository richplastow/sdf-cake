---
title: Uniform budget
description: Packs the fragment shader's uniform arrays so it fits WebGL 2's guaranteed 224 uniform vectors, and stops it growing past them unnoticed.
type: backlog
---

## Problem

Every parameter of the cake reaches the fragment shader as a uniform, by
the [SDF rules](../../../CLAUDE.md#sdf-raymarching-not-triangles), and
most are per-slot arrays: `LAYER_SLOTS` (7) and `DECORATION_SLOTS` (24),
both in `docs/src/cake/slots.js`. WebGL 2 guarantees only 224 fragment
uniform vectors (`MAX_FRAGMENT_UNIFORM_VECTORS`), and a `float` or `vec3`
array element takes a whole vector, a `mat3` element three. A shader over
the limit a device reports fails to link, and the page shows no cake.

Plan 17's review (27 November 2026) counted about 384 vectors with Plan
17's 10 included, from a reading of the code, not a driver:

- **Decorations, about 216:** 24 slots each of `decorationColors`,
  `decorationEmbedsMeters`, `decorationKinds`, `decorationOffsets`,
  `decorationRoughnesses` and `decorationScales` (one vector each) and
  `decorationRotations` (a `mat3`, three), in
  `docs/src/sdf/decorations.js`.
- **Layers, about 126:** 18 arrays of 7 in `docs/src/sdf/layers.js`,
  12 of them single floats.
- **The rest, about 40:** the plate, topping, scatter, bounds, camera and
  Three.js's light uniforms.

The M4's driver allows more, so every check so far has passed. A phone
GPU that reports the minimum would fail today, with or without Plan 17.
Which phones those are is not yet known: no device's limit has been
measured.

## Current position

Recorded in [Plan 17](../../done/17-wonky-cakes.md#context) as a fact, not a
stop. Nothing counts the uniforms, so each plan that adds an array
widens the gap unseen.

## Recommended fix: pack the arrays, then guard the count

- **Rotations as quaternions:** `decorationRotations` as a `vec4` per
  slot, rotated in the shader, saves 48 vectors.
- **Pack the per-slot floats into `vec4`s:** the decorations' embed,
  kind, roughness and scale into one `vec4` saves 72; the layers' 12
  float arrays into three `vec4` arrays saves 63.
- That brings the estimate to about 200, under 224 with room for a plan
  or two. Packing changes only the uniform plumbing, in
  writeCakeUniforms() and the shader's reads, never the field, so the
  cake looks the same.
- **Guard it:** log, once at start-up, the shader's count beside the
  device's limit, so a plan that crosses it shows in the console. Three.js
  likely exposes the limit as `renderer.capabilities.maxFragmentUniforms`
  (unverified: check the pinned release's
  `src/renderers/webgl/WebGLCapabilities.js` first).

Alternatives set aside: fewer decoration slots (cuts what the recipes
can carry); a data texture for the parameters (a texture read per march
step per pixel, against CLAUDE.md's rule that every pixel pays for every
read).

## Open questions

- What `MAX_FRAGMENT_UNIFORM_VECTORS` do the Lead Developer's own phone
  and a cheap Android phone report? One line in each console answers it:
  `document.createElement("canvas").getContext("webgl2").getParameter(0x8dfd)`.
  If every target reports well over 384, this item can wait.
