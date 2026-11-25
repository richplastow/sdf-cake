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

  // The march: its most steps, how far it goes, in metres, and how close
  // to the surface counts as hitting it.
  const int MAX_MARCH_STEPS = 96;
  const float MAX_MARCH_DISTANCE_METERS = 2.0;
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

  // The share of a light that reaches p, from 0.0 in full shadow to 1.0 in
  // none, by marching towards the light: iq's soft shadow,
  // https://iquilezles.org/articles/rmshadows/.
  float lightShareAt(vec3 p, vec3 directionToLight) {
    float share = 1.0;
    float t = SHADOW_START_METERS;
    for (int i = 0; i < MAX_SHADOW_STEPS; i++) {
      float d = cakeField(p + directionToLight * t).x;
      if (d < SURFACE_EPSILON_METERS) return 0.0;
      share = min(share, SHADOW_SOFTNESS * d / t);
      t += d;
      if (t > SHADOW_MAX_DISTANCE_METERS) break;
    }
    return share;
  }

  // Marches the ray from the start distance until it hits the cake, runs
  // out of steps or goes too far.
  Hit march(vec3 origin, vec3 direction, float startMeters) {
    Hit hit = Hit(startMeters, 0.0, false);
    for (int i = 0; i < MAX_MARCH_STEPS; i++) {
      vec2 field = cakeField(origin + direction * hit.distanceMeters);
      if (field.x < SURFACE_EPSILON_METERS) {
        hit.materialId = field.y;
        hit.isHit = true;
        break;
      }
      hit.distanceMeters += field.x;
      if (hit.distanceMeters > MAX_MARCH_DISTANCE_METERS) break;
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

  // How far along the ray it enters the sphere of the radius about the
  // centre: 0.0 where it starts inside, or -1.0 where it misses.
  float sphereEntry(
    vec3 center,
    vec3 direction,
    vec3 origin,
    float radius
  ) {
    vec3 fromCenter = origin - center;
    float b = dot(fromCenter, direction);
    float c = dot(fromCenter, fromCenter) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return max(-b - sqrt(h), 0.0);
  }

  void main() {
    vec3 rayOrigin = cameraPosition;
    vec3 rayDirection = rayDirectionAt(vNdc);

    // A ray that misses the cake's bounding sphere, on the Y axis, never
    // marches.
    float entryMeters = sphereEntry(
      vec3(0.0, boundCenterYMeters, 0.0),
      rayDirection,
      rayOrigin,
      boundRadiusMeters
    );
    if (entryMeters < 0.0) discard;
    Hit hit = march(rayOrigin, rayDirection, entryMeters);
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
