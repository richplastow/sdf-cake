/**
 * @fileoverview
 * The fragment shader that raymarches the cake's field from the camera and
 * shades the surface it hits with Three.js's physical shading chunks, lit
 * by the scene's lights.
 */

import { cakeChunk } from "../sdf/cake.js";
import { primitivesChunk } from "../sdf/primitives.js";

/** #### The fragment shader of the full-screen quad
 * - Three.js prepends `viewMatrix`, `cameraPosition`, tone mapping and the
 *   output colour space. `cameraWorldMatrix` and
 *   `cameraProjectionMatrixInverse` come from src/scene/quad.js, and the
 *   light uniforms from the scene's lights, as the material has
 *   `lights: true`.
 * - The shading mirrors Three.js's own lights_fragment_begin chunk, which
 *   cannot be included as it reads a mesh's varyings: the hit point and
 *   normal found by marching are converted to view space, where Three.js
 *   keeps its lights, and handed to the same RE_Direct() and
 *   RE_IndirectDiffuse() that MeshStandardMaterial uses.
 * - Where a ray misses the cake the fragment is discarded, so the page
 *   shows through the transparent canvas.
 */
export const raymarchFragmentShader = /* glsl */ `
  #include <common>
  #include <lights_pars_begin>
  #include <lights_physical_pars_fragment>

  uniform mat4 cameraProjectionMatrixInverse;
  uniform mat4 cameraWorldMatrix;

  varying vec2 vNdc;

  // The march: its most steps, and how close to the surface, in metres,
  // counts as hitting it. It ends where its ray leaves the bound.
  //
  // A ray that runs almost parallel to a flat face, such as a cut's face
  // seen edge-on or a layer's top seen from just above it, crawls: every
  // step is the ray's own offset from that face, a few tenths of a
  // millimetre, so it needs one step per offset along the whole cake, not
  // the handful a head-on ray needs. At 96 steps such a ray ran out and
  // its fragment was discarded, which showed the page through the cake.
  // 768 is where the last of them lands, measured in a port of this march
  // over the six cakes, the turn in 30 degree steps, five tilts and both
  // ends of the zoom; only a crawling ray pays for the steps, so the mean
  // over the six cakes at the view at load is 3.87 march steps a pixel
  // either way. The cap scales with the frame's height in pixels, since
  // the offset a ray crawls at is about a pixel's footprint.
  const int MAX_MARCH_STEPS = 768;
  const float SURFACE_EPSILON_METERS = 0.0001;
  // The offset either side of a hit point over which the normal is read.
  const float NORMAL_EPSILON_METERS = 0.0005;
  // The shadow march towards a light: its most steps, where it starts, past
  // the surface's own epsilon, how far it goes, and iq's softness, higher
  // for a sharper shadow edge.
  const int MAX_SHADOW_STEPS = 48;
  const float SHADOW_START_METERS = 0.002;
  const float SHADOW_MAX_DISTANCE_METERS = 0.5;
  const float SHADOW_SOFTNESS = 24.0;
  // How far the shadow march's bound passes the cake's, in metres, so it
  // can end where its ray leaves the bound and still shade exactly as one
  // that runs its full distance. iq's soft shadow takes the least of
  // SHADOW_SOFTNESS * d / t along the ray, so a ray passing near the cake
  // darkens even outside the cake's cylinders. Every part lies inside its
  // cylinder, and the cut only raises the stack's distance, so outside the
  // cylinders grown by this margin d is at least the margin; with t at
  // most SHADOW_MAX_DISTANCE_METERS, the term is then at least 1, and
  // cannot lower the share. About 20.8 mm.
  const float SHADOW_BOUND_MARGIN_METERS =
    SHADOW_MAX_DISTANCE_METERS / SHADOW_SOFTNESS;
  // The least a ray's direction may move along an axis, or across it, for
  // the cylinder test to divide by that movement: unitless, as the
  // direction is a unit vector. A ray that moves less is taken as level
  // with the axis's slab, or parallel to the axis; with the bound's 2 mm
  // margin, no march reaches far enough for the difference to show.
  const float MIN_SPAN_DIRECTION = 1e-6;
  // The span of a ray that misses a bound, in metres: an exit behind the
  // ray's origin.
  const vec2 NO_SPAN_METERS = vec2(-1.0);
  // A physical material's least roughness, as Three.js's own shading sets
  // it, so a light always shows a highlight.
  const float MIN_ROUGHNESS = 0.045;
  // A dielectric's specular colour at normal incidence, 4% of the light,
  // as lights_physical_fragment sets it without an IOR.
  const vec3 DIELECTRIC_SPECULAR_COLOR = vec3(0.04);

  ${primitivesChunk}
  ${cakeChunk}

  // Where a ray stops: how far along it, in metres, which material it met,
  // and whether it hit at all.
  struct Hit {
    float distanceMeters;
    float materialId;
    bool isHit;
  };

  // How far along the ray, in metres, it enters and leaves the cylinder on
  // the Y axis from the bottom to the top of the radius: the slab in y
  // intersected with the quadratic in xz, after iq's capped-cylinder
  // intersector, https://iquilezles.org/articles/intersectors/. A ray
  // parallel to the axis takes the slab's test alone, and one level with
  // the slab the quadratic's alone, so neither divides by zero. A span
  // that starts behind the ray's origin starts at 0.0, as for a ray from
  // inside the cylinder. A span that ends behind it, a cylinder of zero
  // radius, and a ray that misses give NO_SPAN_METERS.
  vec2 cylinderSpan(
    float bottom,
    vec3 direction,
    vec3 origin,
    float radius,
    float top
  ) {
    if (radius <= 0.0) return NO_SPAN_METERS;
    // Unbounded until a test bounds them, as one always does: a unit
    // direction cannot be both level with the slab and parallel to the axis.
    float entryMeters = -NO_SURFACE_METERS;
    float exitMeters = NO_SURFACE_METERS;

    // The slab in y.
    if (abs(direction.y) >= MIN_SPAN_DIRECTION) {
      float toBottom = (bottom - origin.y) / direction.y;
      float toTop = (top - origin.y) / direction.y;
      entryMeters = min(toBottom, toTop);
      exitMeters = max(toBottom, toTop);
    } else if (origin.y < bottom || origin.y > top) {
      return NO_SPAN_METERS;
    }

    // The quadratic in xz: |origin.xz + t * direction.xz| = radius.
    float a = dot(direction.xz, direction.xz);
    float b = dot(origin.xz, direction.xz);
    float c = dot(origin.xz, origin.xz) - radius * radius;
    if (a >= MIN_SPAN_DIRECTION * MIN_SPAN_DIRECTION) {
      float h = b * b - a * c;
      if (h < 0.0) return NO_SPAN_METERS;
      h = sqrt(h);
      entryMeters = max(entryMeters, (-b - h) / a);
      exitMeters = min(exitMeters, (-b + h) / a);
    } else if (c > 0.0) {
      return NO_SPAN_METERS;
    }

    if (exitMeters < max(entryMeters, 0.0)) return NO_SPAN_METERS;
    return vec2(max(entryMeters, 0.0), exitMeters);
  }

  // How far along the ray, in metres, it enters and leaves the cake's
  // bound, the union of the plate's and the stack's cylinders, each grown
  // in radius and at both ends by the margin: the earlier entry to the
  // later exit, or NO_SPAN_METERS where it misses both. A cylinder of zero
  // radius, the plate's for a cake with none, is never grown, so it stays
  // a miss.
  vec2 boundSpan(vec3 direction, float marginMeters, vec3 origin) {
    float plateMargin = plateBoundRadiusMeters > 0.0 ? marginMeters : 0.0;
    float stackMargin = stackBoundRadiusMeters > 0.0 ? marginMeters : 0.0;
    vec2 plate = cylinderSpan(
      plateBoundBottomMeters - plateMargin,
      direction,
      origin,
      plateBoundRadiusMeters + plateMargin,
      plateBoundTopMeters + plateMargin
    );
    vec2 stack = cylinderSpan(
      stackBoundBottomMeters - stackMargin,
      direction,
      origin,
      stackBoundRadiusMeters + stackMargin,
      stackBoundTopMeters + stackMargin
    );
    if (plate.y < 0.0) return stack;
    if (stack.y < 0.0) return plate;
    return vec2(min(plate.x, stack.x), max(plate.y, stack.y));
  }

  // The share of a light that reaches p, from 0.0 in full shadow to 1.0 in
  // none, by marching towards the light: iq's soft shadow,
  // https://iquilezles.org/articles/rmshadows/. It ends where its ray
  // leaves the bound grown by SHADOW_BOUND_MARGIN_METERS, past which
  // nothing can lower the share, or at SHADOW_MAX_DISTANCE_METERS.
  float lightShareAt(vec3 p, vec3 directionToLight) {
    float endMeters = min(
      boundSpan(directionToLight, SHADOW_BOUND_MARGIN_METERS, p).y,
      SHADOW_MAX_DISTANCE_METERS
    );
    float share = 1.0;
    float t = SHADOW_START_METERS;
    for (int i = 0; i < MAX_SHADOW_STEPS; i++) {
      float d = cakeField(p + directionToLight * t).x;
      if (d < SURFACE_EPSILON_METERS) return 0.0;
      share = min(share, SHADOW_SOFTNESS * d / t);
      t += d;
      if (t > endMeters) break;
    }
    return share;
  }

  // Marches the ray from the start distance until it hits the cake, runs
  // out of steps or passes the end distance, where it leaves the bound.
  Hit march(
    vec3 origin,
    vec3 direction,
    float startMeters,
    float endMeters
  ) {
    Hit hit = Hit(startMeters, 0.0, false);
    for (int i = 0; i < MAX_MARCH_STEPS; i++) {
      vec2 field = cakeField(origin + direction * hit.distanceMeters);
      if (field.x < SURFACE_EPSILON_METERS) {
        hit.materialId = field.y;
        hit.isHit = true;
        break;
      }
      hit.distanceMeters += field.x;
      if (hit.distanceMeters > endMeters) break;
    }
    return hit;
  }

  // The surface's unit normal at p, from four field reads at the corners
  // of a tetrahedron: iq's technique,
  // https://iquilezles.org/articles/normalsSDF/.
  vec3 normalAt(vec3 p) {
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
      k.xyy * cakeField(p + k.xyy * NORMAL_EPSILON_METERS).x +
      k.yyx * cakeField(p + k.yyx * NORMAL_EPSILON_METERS).x +
      k.yxy * cakeField(p + k.yxy * NORMAL_EPSILON_METERS).x +
      k.xxx * cakeField(p + k.xxx * NORMAL_EPSILON_METERS).x
    );
  }

  // The world-space direction of the ray through the fragment: the far
  // plane's point in view space, by the inverse projection, turned into the
  // world by the camera's world matrix.
  vec3 rayDirectionAt(vec2 ndc) {
    vec4 farView = cameraProjectionMatrixInverse * vec4(ndc, 1.0, 1.0);
    vec3 directionView = farView.xyz / farView.w;
    return normalize((cameraWorldMatrix * vec4(directionView, 0.0)).xyz);
  }

  void main() {
    vec3 rayOrigin = cameraPosition;
    vec3 rayDirection = rayDirectionAt(vNdc);

    // A ray that misses the cake's bound never marches, and one that meets
    // it marches only from its entry to just past its exit.
    vec2 spanMeters = boundSpan(rayDirection, 0.0, rayOrigin);
    if (spanMeters.y < 0.0) discard;
    Hit hit = march(rayOrigin, rayDirection, spanMeters.x, spanMeters.y);
    if (!hit.isHit) discard;

    vec3 hitPoint = rayOrigin + rayDirection * hit.distanceMeters;
    vec3 hitNormal = normalAt(hitPoint);

    // The material at the hit, as lights_physical_fragment builds it for a
    // mesh without maps.
    vec3 albedo = cakeAlbedoOf(hit.materialId);
    float metalness = cakeMetalnessOf(hit.materialId);
    PhysicalMaterial material;
    material.diffuseColor = albedo;
    material.diffuseContribution = albedo * (1.0 - metalness);
    material.metalness = metalness;
    material.roughness = clamp(
      cakeRoughnessOf(hit.materialId),
      MIN_ROUGHNESS,
      1.0
    );
    material.specularColor = DIELECTRIC_SPECULAR_COLOR;
    material.specularColorBlended = mix(
      DIELECTRIC_SPECULAR_COLOR,
      albedo,
      metalness
    );
    material.specularF90 = 1.0;
    material.dispersion = 0.0;

    // The geometry in view space, where Three.js keeps its lights, as
    // lights_fragment_begin takes it from a mesh's varyings.
    vec3 geometryPosition = (viewMatrix * vec4(hitPoint, 1.0)).xyz;
    vec3 geometryNormal = transformDirection(hitNormal, viewMatrix);
    vec3 geometryViewDir = normalize(-geometryPosition);
    vec3 geometryClearcoatNormal = vec3(0.0);

    // The multiple-scattering terms, as lights_fragment_begin fills them
    // under STANDARD from the DFG lookup texture.
    float dotNV = saturate(dot(geometryNormal, geometryViewDir));
    material.dfg = texture2D(dfgLUT, vec2(material.roughness, dotNV)).rg;
    float singleScatterEnergy = material.dfg.x + material.dfg.y;
    material.multiScatteringCompensation =
      1.0 + material.specularColorBlended * (1.0 / singleScatterEnergy - 1.0);

    ReflectedLight reflectedLight =
      ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    IncidentLight directLight;
    vec3 directionToLight;

    // Each directional light, shadowed by the cake itself, along the light
    // turned back into the world.
    #if NUM_DIR_LIGHTS > 0
      DirectionalLight directionalLight;
      #pragma unroll_loop_start
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        directionalLight = directionalLights[i];
        getDirectionalLightInfo(directionalLight, directLight);
        directionToLight = transformDirectionByInverseViewMatrix(
          directLight.direction,
          viewMatrix
        );
        directLight.color *= lightShareAt(hitPoint, directionToLight);
        RE_Direct(
          directLight,
          geometryPosition,
          geometryNormal,
          geometryViewDir,
          geometryClearcoatNormal,
          material,
          reflectedLight
        );
      }
      #pragma unroll_loop_end
    #endif

    // The ambient and hemisphere lights, as diffuse irradiance.
    vec3 irradiance = getAmbientLightIrradiance(ambientLightColor);
    #if NUM_HEMI_LIGHTS > 0
      #pragma unroll_loop_start
      for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
        irradiance += getHemisphereLightIrradiance(
          hemisphereLights[i],
          geometryNormal
        );
      }
      #pragma unroll_loop_end
    #endif
    RE_IndirectDiffuse(
      irradiance,
      geometryPosition,
      geometryNormal,
      geometryViewDir,
      geometryClearcoatNormal,
      material,
      reflectedLight
    );

    vec3 outgoingLight =
      reflectedLight.directDiffuse +
      reflectedLight.directSpecular +
      reflectedLight.indirectDiffuse +
      reflectedLight.indirectSpecular;
    gl_FragColor = vec4(outgoingLight, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
