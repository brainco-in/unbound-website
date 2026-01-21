"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { FluidSimulation, FluidConfig, defaultConfig } from "./FluidSimulation";

interface FluidRevealProps {
  baseContent: React.ReactNode;
  revealContent: React.ReactNode;
  config?: Partial<FluidConfig>;
  className?: string;
}

export function FluidReveal({ 
  baseContent, 
  revealContent, 
  config = {},
  className = ""
}: FluidRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<FluidSimulation | null>(null);
  const [maskUrl, setMaskUrl] = useState<string>("");

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!simulationRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    simulationRef.current.updatePointerMoveData(x, y);
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!simulationRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    simulationRef.current.updatePointerDownData(x, y);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.updatePointerUpData();
  }, []);

  // Copy WebGL canvas to 2D canvas for mask
  const updateMask = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    // Match dimensions
    if (maskCanvas.width !== canvas.width || maskCanvas.height !== canvas.height) {
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
    }

    // Draw the WebGL canvas onto the 2D canvas
    ctx.drawImage(canvas, 0, 0);

    // Update mask URL for CSS
    setMaskUrl(maskCanvas.toDataURL());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set initial canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Initialize simulation
    try {
      simulationRef.current = new FluidSimulation(canvas, {
        ...defaultConfig,
        ...config,
      });
    } catch (error) {
      console.error("Failed to initialize fluid simulation:", error);
      return;
    }

    // Custom render loop that updates the mask
    let animationFrameId: number;
    const loop = () => {
      if (simulationRef.current) {
        simulationRef.current.update();
        updateMask();
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    // Add event listeners
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [config, handlePointerMove, handlePointerDown, handlePointerUp, updateMask]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      if (maskCanvas) {
        maskCanvas.width = rect.width;
        maskCanvas.height = rect.height;
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Base content - always visible */}
      <div className="absolute inset-0 z-0">
        {baseContent}
      </div>

      {/* Reveal content - masked by fluid */}
      <div 
        className="absolute inset-0 z-20"
        style={{
          WebkitMaskImage: maskUrl ? `url(${maskUrl})` : "none",
          maskImage: maskUrl ? `url(${maskUrl})` : "none",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      >
        {revealContent}
      </div>

      {/* Hidden WebGL canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 pointer-events-none opacity-0"
        style={{ visibility: "hidden" }}
      />

      {/* Hidden 2D canvas for mask generation */}
      <canvas
        ref={maskCanvasRef}
        className="hidden"
      />
    </div>
  );
}
