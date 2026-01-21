"use client";

import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

// Vertex shader for full-screen quad
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Fragment shader for fluid mask - accumulates brush strokes with fluid-like behavior
const maskUpdateShader = `
  precision highp float;
  varying vec2 vUv;
  
  uniform sampler2D uPrevMask;
  uniform vec2 uPointer;
  uniform vec2 uPrevPointer;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uDissipation;
  uniform float uAspect;
  uniform bool uPointerActive;
  uniform float uVelocity;
  
  // Soft brush with gaussian-like falloff
  float softBrush(vec2 p, vec2 center, float r) {
    float d = length(p - center);
    // Gaussian falloff for soft edges
    return exp(-d * d / (r * r * 0.5));
  }
  
  // Smooth brush stroke between two points (capsule SDF)
  float brushStroke(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float len = length(ba);
    
    // Handle case when points are same (just a circle)
    if (len < 0.0001) {
      return softBrush(p, a, r);
    }
    
    float h = clamp(dot(pa, ba) / (len * len), 0.0, 1.0);
    float d = length(pa - ba * h);
    
    // Soft edge falloff
    return smoothstep(r, 0.0, d);
  }
  
  // Simple blur by sampling neighbors
  float blurSample(sampler2D tex, vec2 uv, vec2 texelSize) {
    float sum = 0.0;
    sum += texture2D(tex, uv).r * 0.25;
    sum += texture2D(tex, uv + vec2(texelSize.x, 0.0)).r * 0.125;
    sum += texture2D(tex, uv - vec2(texelSize.x, 0.0)).r * 0.125;
    sum += texture2D(tex, uv + vec2(0.0, texelSize.y)).r * 0.125;
    sum += texture2D(tex, uv - vec2(0.0, texelSize.y)).r * 0.125;
    sum += texture2D(tex, uv + texelSize).r * 0.0625;
    sum += texture2D(tex, uv - texelSize).r * 0.0625;
    sum += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).r * 0.0625;
    sum += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).r * 0.0625;
    return sum;
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 texelSize = vec2(1.0 / 1920.0, 1.0 / 1080.0); // Approximate
    
    // Get previous mask value with slight blur for smoothing
    float prevMask = blurSample(uPrevMask, uv, texelSize);
    
    // Apply dissipation (slow fade)
    float mask = prevMask * uDissipation;
    
    // Add new brush stroke if pointer is active
    if (uPointerActive) {
      vec2 aspectUv = vec2(uv.x * uAspect, uv.y);
      vec2 aspectPointer = vec2(uPointer.x * uAspect, uPointer.y);
      vec2 aspectPrevPointer = vec2(uPrevPointer.x * uAspect, uPrevPointer.y);
      
      // Velocity-based radius (faster = larger brush)
      float velocityBoost = 1.0 + uVelocity * 2.0;
      float dynamicRadius = uRadius * velocityBoost;
      
      // Calculate brush contribution
      float brush = brushStroke(aspectUv, aspectPrevPointer, aspectPointer, dynamicRadius);
      
      // Apply strength with soft blend
      float contribution = brush * uStrength;
      mask = mask + contribution * (1.0 - mask); // Soft max blend
    }
    
    // Clamp to valid range
    mask = clamp(mask, 0.0, 1.0);
    
    gl_FragColor = vec4(mask, mask, mask, 1.0);
  }
`;

// Fragment shader for display - composites base texture with mask
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
      // Sample the base texture (UNBOUND text)
      vec4 baseColor = texture2D(uBaseTexture, vUv);
      // Composite: show base texture where no fluid, transparent where fluid
      gl_FragColor = vec4(baseColor.rgb, baseColor.a * alpha);
    } else {
      // Fallback: just background color
      gl_FragColor = vec4(uBackgroundColor * alpha, alpha);
    }
  }
`;

interface FluidMaskConfig {
  radius: number;
  strength: number;
  dissipation: number;
  backgroundColor: [number, number, number];
}

const defaultConfig: FluidMaskConfig = {
  radius: 0.08,           // Base brush radius (will expand with velocity)
  strength: 0.85,         // How quickly mask fills in
  dissipation: 0.992,     // How slowly the mask fades (0.99+ = very persistent)
  backgroundColor: [0.039, 0.039, 0.039], // #0a0a0a
};

// Helper to get CSS variable value
function getCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// Create a canvas texture with text rendered on it - respects aspect ratio and DPI
function createTextTexture(
  text: string, 
  subtext?: string,
  screenWidth?: number,
  screenHeight?: number
): THREE.CanvasTexture {
  // Get actual screen dimensions or use defaults
  const baseWidth = screenWidth || window.innerWidth;
  const baseHeight = screenHeight || window.innerHeight;
  
  // Scale up for high DPI displays (crisper text)
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(baseWidth * dpr);
  const height = Math.floor(baseHeight * dpr);
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  
  // Get theme colors from CSS variables
  const bgColor = getCssVar("--background", "#0a0a0a");
  const fgColor = getCssVar("--foreground", "#fafafa");
  const mutedColor = getCssVar("--muted", "#737373");
  
  // Fill with background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  // Draw main text - size relative to height for consistent appearance
  ctx.fillStyle = fgColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Calculate font size based on viewport - larger text that scales well
  // Use height as base to maintain proportions across aspect ratios
  const fontSize = Math.floor(Math.min(height * 0.18, width * 0.12));
  ctx.font = `400 ${fontSize}px "Instrument Serif", Georgia, serif`;
  
  const centerY = subtext ? height * 0.48 : height * 0.5;
  ctx.fillText(text, width / 2, centerY);
  
  // Draw subtext if provided
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

interface FluidMaskPlaneProps {
  config?: Partial<FluidMaskConfig>;
  baseTexture?: THREE.Texture | null;
}

function FluidMaskPlane({ config: userConfig, baseTexture }: FluidMaskPlaneProps) {
  const config = { ...defaultConfig, ...userConfig };
  const { size } = useThree();
  
  // Create ping-pong FBOs for mask accumulation
  const fboSettings = useMemo(() => ({
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  }), []);
  
  const maskFboA = useFBO(size.width, size.height, fboSettings);
  const maskFboB = useFBO(size.width, size.height, fboSettings);
  
  // Refs for ping-pong
  const readFbo = useRef(maskFboA);
  const writeFbo = useRef(maskFboB);
  
  // Pointer state with velocity tracking
  const pointer = useRef({
    x: 0.5,
    y: 0.5,
    prevX: 0.5,
    prevY: 0.5,
    velocity: 0,
    active: false,
    initialized: false,
  });
  
  // Materials
  const maskUpdateMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: maskUpdateShader,
    uniforms: {
      uPrevMask: { value: null },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: config.radius },
      uStrength: { value: config.strength },
      uDissipation: { value: config.dissipation },
      uAspect: { value: 1 },
      uPointerActive: { value: false },
      uVelocity: { value: 0 },
    },
  }), []);
  
  const displayMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: displayShader,
    uniforms: {
      uMask: { value: null },
      uBaseTexture: { value: null },
      uHasBaseTexture: { value: false },
      uBackgroundColor: { value: new THREE.Vector3(...config.backgroundColor) },
    },
    transparent: true,
  }), []);
  
  // Update base texture when it changes
  useEffect(() => {
    if (baseTexture) {
      displayMaterial.uniforms.uBaseTexture.value = baseTexture;
      displayMaterial.uniforms.uHasBaseTexture.value = true;
    } else {
      displayMaterial.uniforms.uHasBaseTexture.value = false;
    }
  }, [baseTexture, displayMaterial]);
  
  // Update config when it changes
  useEffect(() => {
    maskUpdateMaterial.uniforms.uRadius.value = config.radius;
    maskUpdateMaterial.uniforms.uStrength.value = config.strength;
    maskUpdateMaterial.uniforms.uDissipation.value = config.dissipation;
    displayMaterial.uniforms.uBackgroundColor.value.set(...config.backgroundColor);
  }, [config, maskUpdateMaterial, displayMaterial]);
  
  // Handle pointer events
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;
    
    if (!pointer.current.initialized) {
      pointer.current.initialized = true;
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.prevX = x;
      pointer.current.prevY = y;
      pointer.current.velocity = 0;
    } else {
      pointer.current.prevX = pointer.current.x;
      pointer.current.prevY = pointer.current.y;
      pointer.current.x = x;
      pointer.current.y = y;
      
      // Calculate velocity (normalized)
      const dx = pointer.current.x - pointer.current.prevX;
      const dy = pointer.current.y - pointer.current.prevY;
      const newVelocity = Math.sqrt(dx * dx + dy * dy) * 50; // Scale for better effect
      
      // Smooth velocity with exponential decay
      pointer.current.velocity = pointer.current.velocity * 0.7 + newVelocity * 0.3;
    }
    pointer.current.active = true;
  }, []);
  
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);
  
  // Quad geometry
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
  
  // Scene and camera for offscreen rendering
  const offscreenScene = useMemo(() => new THREE.Scene(), []);
  const offscreenCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const offscreenMesh = useMemo(() => new THREE.Mesh(quadGeometry, maskUpdateMaterial), [quadGeometry, maskUpdateMaterial]);
  
  useEffect(() => {
    offscreenScene.add(offscreenMesh);
    return () => {
      offscreenScene.remove(offscreenMesh);
    };
  }, [offscreenScene, offscreenMesh]);
  
  // Animation loop
  useFrame(({ gl }) => {
    const aspect = size.width / size.height;
    
    // Update uniforms
    maskUpdateMaterial.uniforms.uPrevMask.value = readFbo.current.texture;
    maskUpdateMaterial.uniforms.uPointer.value.set(pointer.current.x, pointer.current.y);
    maskUpdateMaterial.uniforms.uPrevPointer.value.set(pointer.current.prevX, pointer.current.prevY);
    maskUpdateMaterial.uniforms.uAspect.value = aspect;
    maskUpdateMaterial.uniforms.uPointerActive.value = pointer.current.active;
    maskUpdateMaterial.uniforms.uVelocity.value = Math.min(pointer.current.velocity, 2.0); // Cap velocity
    
    // Render mask update pass to write FBO
    gl.setRenderTarget(writeFbo.current);
    gl.render(offscreenScene, offscreenCamera);
    gl.setRenderTarget(null);
    
    // Swap FBOs
    const temp = readFbo.current;
    readFbo.current = writeFbo.current;
    writeFbo.current = temp;
    
    // Update display material
    displayMaterial.uniforms.uMask.value = readFbo.current.texture;
    
    // Reset pointer active state and decay velocity
    pointer.current.active = false;
    pointer.current.velocity *= 0.95; // Smooth velocity decay
  });
  
  return (
    <mesh geometry={quadGeometry} material={displayMaterial} />
  );
}

interface FluidMaskSceneProps {
  className?: string;
  config?: Partial<FluidMaskConfig>;
  overlayText?: string;
  overlaySubtext?: string;
  onReady?: () => void;
}

// Inner component that creates texture after canvas is mounted
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
  
  // Create and update texture when size or text changes
  useEffect(() => {
    if (overlayText && size.width > 0 && size.height > 0) {
      // Dispose old texture
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      
      // Create new texture with correct dimensions
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
  
  // Fire onReady callback after first frame with texture
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
