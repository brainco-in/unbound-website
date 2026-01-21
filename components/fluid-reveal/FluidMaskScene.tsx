"use client";

import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

// =============================================================================
// SHADERS - Navier-Stokes Fluid Simulation
// Based on Jos Stam's stable fluid simulation and GPU Gems techniques
// =============================================================================

// Base vertex shader for full-screen quad with neighbor UVs
const baseVertexShader = `
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main() {
    vUv = uv;
    vL = uv - vec2(texelSize.x, 0.0);
    vR = uv + vec2(texelSize.x, 0.0);
    vT = uv + vec2(0.0, texelSize.y);
    vB = uv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position, 1.0);
  }
`;

// Simple vertex shader (no neighbor computation)
const simpleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Splat shader - adds velocity/dye at pointer position
const splatShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  void main() {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

// Curl shader - calculates vorticity (rotation) at each point
const curlShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

// Vorticity shader - applies vorticity confinement (creates swirling)
const vorticityShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main() {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
  }
`;

// Divergence shader - calculates velocity divergence
const divergenceShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// Clear shader - multiplies texture by a value (for pressure reset)
const clearShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main() {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

// Pressure shader - iteratively solves pressure field (Jacobi iteration)
const pressureShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

// Gradient subtract shader - makes velocity divergence-free
const gradientSubtractShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// Advection shader - moves quantities along velocity field
const advectionShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;

  void main() {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
  }
`;

// Display shader - composites base texture with mask for reveal effect
const displayShader = `
  precision highp float;
  varying vec2 vUv;
  
  uniform sampler2D uMask;
  uniform sampler2D uBaseTexture;
  uniform bool uHasBaseTexture;
  uniform vec3 uBackgroundColor;
  
  void main() {
    float mask = texture2D(uMask, vUv).r;
    
    // Apply smooth curve for more organic feel
    float smoothMask = smoothstep(0.0, 0.8, mask);
    
    // Where mask is high (fluid painted), alpha is low (transparent to reveal content below)
    // Where mask is low (no fluid), show base texture (UNBOUND)
    float alpha = 1.0 - smoothMask;
    
    if (uHasBaseTexture) {
      vec4 baseColor = texture2D(uBaseTexture, vUv);
      gl_FragColor = vec4(baseColor.rgb, baseColor.a * alpha);
    } else {
      gl_FragColor = vec4(uBackgroundColor * alpha, alpha);
    }
  }
`;

// =============================================================================
// CONFIG & TYPES
// =============================================================================

interface FluidMaskConfig {
  // Visual parameters
  radius: number;
  strength: number;
  dissipation: number;
  backgroundColor: [number, number, number];
  // Physics parameters
  curl: number;
  velocityDissipation: number;
  pressureIterations: number;
  splatForce: number;
  simResolution: number;
}

const defaultConfig: FluidMaskConfig = {
  // Visual
  radius: 0.3,
  strength: 0.45,
  dissipation: 8,
  backgroundColor: [0.039, 0.039, 0.039],
  // Physics
  curl: 30,
  velocityDissipation: 0.85,
  pressureIterations: 40,
  splatForce: 13500,
  simResolution: 128,
};

// =============================================================================
// HELPERS
// =============================================================================

function getCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function createTextTexture(
  text: string, 
  subtext?: string,
  screenWidth?: number,
  screenHeight?: number
): THREE.CanvasTexture {
  const baseWidth = screenWidth || window.innerWidth;
  const baseHeight = screenHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(baseWidth * dpr);
  const height = Math.floor(baseHeight * dpr);
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  
  const bgColor = getCssVar("--background", "#0a0a0a");
  const fgColor = getCssVar("--foreground", "#fafafa");
  const mutedColor = getCssVar("--muted", "#737373");
  
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = fgColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const fontSize = Math.floor(Math.min(height * 0.18, width * 0.12));
  ctx.font = `400 ${fontSize}px "Instrument Serif", Georgia, serif`;
  
  const centerY = subtext ? height * 0.48 : height * 0.5;
  ctx.fillText(text, width / 2, centerY);
  
  if (subtext) {
    ctx.fillStyle = mutedColor;
    const subtextSize = Math.floor(fontSize * 0.12);
    ctx.font = `400 ${subtextSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(subtext, width / 2, centerY + fontSize * 0.55);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Calculate simulation resolution maintaining aspect ratio
function getSimResolution(baseRes: number, width: number, height: number) {
  const aspectRatio = width / height;
  if (aspectRatio >= 1) {
    return { width: Math.round(baseRes * aspectRatio), height: baseRes };
  } else {
    return { width: baseRes, height: Math.round(baseRes / aspectRatio) };
  }
}

// =============================================================================
// FLUID SIMULATION COMPONENT
// =============================================================================

interface FluidMaskPlaneProps {
  config?: Partial<FluidMaskConfig>;
  baseTexture?: THREE.Texture | null;
}

function FluidMaskPlane({ config: userConfig, baseTexture }: FluidMaskPlaneProps) {
  const config = { ...defaultConfig, ...userConfig };
  const { size, gl } = useThree();
  
  // Keep config in a ref so useFrame/callbacks always read latest values
  const configRef = useRef(config);
  configRef.current = config;
  
  // Calculate simulation resolution
  const simRes = useMemo(() => 
    getSimResolution(config.simResolution, size.width, size.height),
    [config.simResolution, size.width, size.height]
  );
  
  // FBO settings
  const fboSettings = useMemo(() => ({
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  }), []);
  
  // =========== FBOs for simulation state ===========
  // Velocity field (ping-pong)
  const velocityFboA = useFBO(simRes.width, simRes.height, fboSettings);
  const velocityFboB = useFBO(simRes.width, simRes.height, fboSettings);
  
  // Curl (vorticity)
  const curlFbo = useFBO(simRes.width, simRes.height, fboSettings);
  
  // Divergence
  const divergenceFbo = useFBO(simRes.width, simRes.height, fboSettings);
  
  // Pressure (ping-pong)
  const pressureFboA = useFBO(simRes.width, simRes.height, fboSettings);
  const pressureFboB = useFBO(simRes.width, simRes.height, fboSettings);
  
  // Dye/Mask (ping-pong) - higher resolution for display
  const dyeFboA = useFBO(size.width, size.height, fboSettings);
  const dyeFboB = useFBO(size.width, size.height, fboSettings);
  
  // Refs for ping-pong swapping
  const velocityRead = useRef(velocityFboA);
  const velocityWrite = useRef(velocityFboB);
  const pressureRead = useRef(pressureFboA);
  const pressureWrite = useRef(pressureFboB);
  const dyeRead = useRef(dyeFboA);
  const dyeWrite = useRef(dyeFboB);
  
  // Pointer state
  const pointer = useRef({
    x: 0.5,
    y: 0.5,
    prevX: 0.5,
    prevY: 0.5,
    deltaX: 0,
    deltaY: 0,
    moved: false,
    initialized: false,
  });
  
  // Time tracking
  const lastTime = useRef(Date.now());
  
  // =========== Shader Materials ===========
  const texelSize = useMemo(() => 
    new THREE.Vector2(1.0 / simRes.width, 1.0 / simRes.height),
    [simRes.width, simRes.height]
  );
  
  const dyeTexelSize = useMemo(() => 
    new THREE.Vector2(1.0 / size.width, 1.0 / size.height),
    [size.width, size.height]
  );
  
  // Splat material (for adding velocity/dye)
  const splatMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: simpleVertexShader,
    fragmentShader: splatShader,
    uniforms: {
      uTarget: { value: null },
      aspectRatio: { value: size.width / size.height },
      point: { value: new THREE.Vector2(0.5, 0.5) },
      color: { value: new THREE.Vector3(0, 0, 0) },
      radius: { value: config.radius },
    },
  }), []);
  
  // Curl material
  const curlMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: baseVertexShader,
    fragmentShader: curlShader,
    uniforms: {
      texelSize: { value: texelSize },
      uVelocity: { value: null },
    },
  }), []);
  
  // Vorticity material
  const vorticityMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: baseVertexShader,
    fragmentShader: vorticityShader,
    uniforms: {
      texelSize: { value: texelSize },
      uVelocity: { value: null },
      uCurl: { value: null },
      curl: { value: config.curl },
      dt: { value: 0.016 },
    },
  }), []);
  
  // Divergence material
  const divergenceMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: baseVertexShader,
    fragmentShader: divergenceShader,
    uniforms: {
      texelSize: { value: texelSize },
      uVelocity: { value: null },
    },
  }), []);
  
  // Clear material
  const clearMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: simpleVertexShader,
    fragmentShader: clearShader,
    uniforms: {
      uTexture: { value: null },
      value: { value: 0.8 },
    },
  }), []);
  
  // Pressure material
  const pressureMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: baseVertexShader,
    fragmentShader: pressureShader,
    uniforms: {
      texelSize: { value: texelSize },
      uPressure: { value: null },
      uDivergence: { value: null },
    },
  }), []);
  
  // Gradient subtract material
  const gradientSubtractMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: baseVertexShader,
    fragmentShader: gradientSubtractShader,
    uniforms: {
      texelSize: { value: texelSize },
      uPressure: { value: null },
      uVelocity: { value: null },
    },
  }), []);
  
  // Advection material
  const advectionMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: simpleVertexShader,
    fragmentShader: advectionShader,
    uniforms: {
      texelSize: { value: texelSize },
      uVelocity: { value: null },
      uSource: { value: null },
      dt: { value: 0.016 },
      dissipation: { value: config.velocityDissipation },
    },
  }), []);
  
  // Display material
  const displayMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: simpleVertexShader,
    fragmentShader: displayShader,
    uniforms: {
      uMask: { value: null },
      uBaseTexture: { value: null },
      uHasBaseTexture: { value: false },
      uBackgroundColor: { value: new THREE.Vector3(...config.backgroundColor) },
    },
    transparent: true,
  }), []);
  
  // Update base texture
  useEffect(() => {
    if (baseTexture) {
      displayMaterial.uniforms.uBaseTexture.value = baseTexture;
      displayMaterial.uniforms.uHasBaseTexture.value = true;
    } else {
      displayMaterial.uniforms.uHasBaseTexture.value = false;
    }
  }, [baseTexture, displayMaterial]);
  
  // Update config values
  useEffect(() => {
    splatMaterial.uniforms.radius.value = config.radius;
    vorticityMaterial.uniforms.curl.value = config.curl;
    advectionMaterial.uniforms.dissipation.value = config.velocityDissipation;
    displayMaterial.uniforms.uBackgroundColor.value.set(...config.backgroundColor);
  }, [config, splatMaterial, vorticityMaterial, advectionMaterial, displayMaterial]);
  
  // Pointer event handler
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;
    
    if (!pointer.current.initialized) {
      pointer.current.initialized = true;
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.prevX = x;
      pointer.current.prevY = y;
    } else {
      pointer.current.prevX = pointer.current.x;
      pointer.current.prevY = pointer.current.y;
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.deltaX = x - pointer.current.prevX;
      pointer.current.deltaY = y - pointer.current.prevY;
      pointer.current.moved = Math.abs(pointer.current.deltaX) > 0 || Math.abs(pointer.current.deltaY) > 0;
    }
  }, []);
  
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);
  
  // Quad geometry for rendering
  const quadGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, []);
  
  // Offscreen scene for simulation passes
  const offscreenScene = useMemo(() => new THREE.Scene(), []);
  const offscreenCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const offscreenMesh = useMemo(() => new THREE.Mesh(quadGeometry), [quadGeometry]);
  
  useEffect(() => {
    offscreenScene.add(offscreenMesh);
    return () => { offscreenScene.remove(offscreenMesh); };
  }, [offscreenScene, offscreenMesh]);
  
  // Helper to render a pass
  const renderPass = useCallback((material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
    offscreenMesh.material = material;
    gl.setRenderTarget(target);
    gl.render(offscreenScene, offscreenCamera);
  }, [gl, offscreenScene, offscreenCamera, offscreenMesh]);
  
  // Splat function - adds velocity and dye at a point
  const splat = useCallback((x: number, y: number, dx: number, dy: number) => {
    const aspect = size.width / size.height;
    const cfg = configRef.current;
    
    // Splat velocity
    splatMaterial.uniforms.uTarget.value = velocityRead.current.texture;
    splatMaterial.uniforms.aspectRatio.value = aspect;
    splatMaterial.uniforms.point.value.set(x, y);
    splatMaterial.uniforms.color.value.set(dx * cfg.splatForce, dy * cfg.splatForce, 0);
    splatMaterial.uniforms.radius.value = cfg.radius;
    renderPass(splatMaterial, velocityWrite.current);
    // Swap
    const tempV = velocityRead.current;
    velocityRead.current = velocityWrite.current;
    velocityWrite.current = tempV;
    
    // Splat dye (mask)
    splatMaterial.uniforms.uTarget.value = dyeRead.current.texture;
    splatMaterial.uniforms.color.value.set(cfg.strength, cfg.strength, cfg.strength);
    splatMaterial.uniforms.radius.value = cfg.radius * 0.5;
    renderPass(splatMaterial, dyeWrite.current);
    // Swap
    const tempD = dyeRead.current;
    dyeRead.current = dyeWrite.current;
    dyeWrite.current = tempD;
  }, [size.width, size.height, splatMaterial, renderPass]);
  
  // Main simulation loop
  useFrame(() => {
    const now = Date.now();
    let dt = (now - lastTime.current) / 1000;
    dt = Math.min(dt, 0.016667); // Cap at ~60fps
    lastTime.current = now;
    
    const aspect = size.width / size.height;
    const cfg = configRef.current; // Read latest config values
    
    // Apply pointer input
    if (pointer.current.moved) {
      pointer.current.moved = false;
      
      // Correct delta for aspect ratio
      let dx = pointer.current.deltaX;
      let dy = pointer.current.deltaY;
      if (aspect < 1) dx *= aspect;
      if (aspect > 1) dy /= aspect;
      
      splat(pointer.current.x, pointer.current.y, dx, dy);
    }
    
    // === CURL PASS ===
    curlMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    curlMaterial.uniforms.texelSize.value = texelSize;
    renderPass(curlMaterial, curlFbo);
    
    // === VORTICITY PASS ===
    vorticityMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    vorticityMaterial.uniforms.uCurl.value = curlFbo.texture;
    vorticityMaterial.uniforms.curl.value = cfg.curl;
    vorticityMaterial.uniforms.dt.value = dt;
    vorticityMaterial.uniforms.texelSize.value = texelSize;
    renderPass(vorticityMaterial, velocityWrite.current);
    // Swap
    let temp = velocityRead.current;
    velocityRead.current = velocityWrite.current;
    velocityWrite.current = temp;
    
    // === DIVERGENCE PASS ===
    divergenceMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    divergenceMaterial.uniforms.texelSize.value = texelSize;
    renderPass(divergenceMaterial, divergenceFbo);
    
    // === CLEAR PRESSURE ===
    clearMaterial.uniforms.uTexture.value = pressureRead.current.texture;
    clearMaterial.uniforms.value.value = 0.8;
    renderPass(clearMaterial, pressureWrite.current);
    temp = pressureRead.current;
    pressureRead.current = pressureWrite.current;
    pressureWrite.current = temp;
    
    // === PRESSURE ITERATIONS ===
    pressureMaterial.uniforms.uDivergence.value = divergenceFbo.texture;
    pressureMaterial.uniforms.texelSize.value = texelSize;
    for (let i = 0; i < cfg.pressureIterations; i++) {
      pressureMaterial.uniforms.uPressure.value = pressureRead.current.texture;
      renderPass(pressureMaterial, pressureWrite.current);
      temp = pressureRead.current;
      pressureRead.current = pressureWrite.current;
      pressureWrite.current = temp;
    }
    
    // === GRADIENT SUBTRACT ===
    gradientSubtractMaterial.uniforms.uPressure.value = pressureRead.current.texture;
    gradientSubtractMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    gradientSubtractMaterial.uniforms.texelSize.value = texelSize;
    renderPass(gradientSubtractMaterial, velocityWrite.current);
    temp = velocityRead.current;
    velocityRead.current = velocityWrite.current;
    velocityWrite.current = temp;
    
    // === ADVECT VELOCITY ===
    advectionMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    advectionMaterial.uniforms.uSource.value = velocityRead.current.texture;
    advectionMaterial.uniforms.texelSize.value = texelSize;
    advectionMaterial.uniforms.dt.value = dt;
    advectionMaterial.uniforms.dissipation.value = cfg.velocityDissipation;
    renderPass(advectionMaterial, velocityWrite.current);
    temp = velocityRead.current;
    velocityRead.current = velocityWrite.current;
    velocityWrite.current = temp;
    
    // === ADVECT DYE (MASK) ===
    advectionMaterial.uniforms.uVelocity.value = velocityRead.current.texture;
    advectionMaterial.uniforms.uSource.value = dyeRead.current.texture;
    advectionMaterial.uniforms.texelSize.value = dyeTexelSize;
    advectionMaterial.uniforms.dissipation.value = cfg.dissipation;
    renderPass(advectionMaterial, dyeWrite.current);
    temp = dyeRead.current;
    dyeRead.current = dyeWrite.current;
    dyeWrite.current = temp;
    
    // === UPDATE DISPLAY ===
    displayMaterial.uniforms.uMask.value = dyeRead.current.texture;
    gl.setRenderTarget(null);
  });
  
  return (
    <mesh geometry={quadGeometry} material={displayMaterial} />
  );
}

// =============================================================================
// SCENE WRAPPER COMPONENTS
// =============================================================================

interface FluidMaskSceneProps {
  className?: string;
  config?: Partial<FluidMaskConfig>;
  overlayText?: string;
  overlaySubtext?: string;
  onReady?: () => void;
}

function FluidMaskPlaneWithTexture({ 
  config, 
  overlayText, 
  overlaySubtext,
  onReady,
}: { 
  config?: Partial<FluidMaskConfig>; 
  overlayText?: string;
  overlaySubtext?: string;
  onReady?: () => void;
}) {
  const { size } = useThree();
  const [baseTexture, setBaseTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const hasCalledReady = useRef(false);
  
  useEffect(() => {
    if (overlayText && size.width > 0 && size.height > 0) {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      
      const texture = createTextTexture(
        overlayText, 
        overlaySubtext,
        size.width,
        size.height
      );
      textureRef.current = texture;
      setBaseTexture(texture);
    }
    
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [overlayText, overlaySubtext, size.width, size.height]);
  
  useFrame(() => {
    if (!hasCalledReady.current && baseTexture && onReady) {
      hasCalledReady.current = true;
      onReady();
    }
  });
  
  return <FluidMaskPlane config={config} baseTexture={baseTexture} />;
}

export function FluidMaskScene({ 
  className = "", 
  config,
  overlayText,
  overlaySubtext,
  onReady,
}: FluidMaskSceneProps) {
  return (
    <Canvas
      className={className}
      gl={{ 
        alpha: true, 
        antialias: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 1] }}
      style={{ 
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <FluidMaskPlaneWithTexture 
        config={config} 
        overlayText={overlayText}
        overlaySubtext={overlaySubtext}
        onReady={onReady}
      />
    </Canvas>
  );
}

export type { FluidMaskConfig };
export { defaultConfig as defaultFluidMaskConfig };
