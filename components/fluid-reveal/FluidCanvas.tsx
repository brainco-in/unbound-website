"use client";

import { useEffect, useRef } from "react";
import { FluidSimulation, FluidConfig, defaultConfig } from "./FluidSimulation";

interface FluidCanvasProps {
  className?: string;
  config?: Partial<FluidConfig>;
}

export function FluidCanvas({ className = "", config = {} }: FluidCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<FluidSimulation | null>(null);
  const configRef = useRef(config);

  // Keep config ref updated
  configRef.current = config;

  // Initialize simulation once
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let mounted = true;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      return true;
    };

    // Pointer handlers
    const handlePointerMove = (e: PointerEvent) => {
      if (!simulationRef.current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      simulationRef.current.updatePointerMoveData(x, y);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!simulationRef.current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      simulationRef.current.updatePointerDownData(x, y);
    };

    const handlePointerUp = () => {
      if (!simulationRef.current) return;
      simulationRef.current.updatePointerUpData();
    };

    // Initialize after a short delay for layout
    const initTimeout = setTimeout(() => {
      if (!mounted) return;
      
      if (!resizeCanvas()) {
        console.warn("Canvas has no size");
        return;
      }

      try {
        const mergedConfig = { ...defaultConfig, ...configRef.current };
        console.log("Creating FluidSimulation with config:", mergedConfig);
        console.log("Canvas size:", canvas.width, "x", canvas.height);
        
        simulationRef.current = new FluidSimulation(canvas, mergedConfig);
        simulationRef.current.start();
        console.log("Fluid simulation started successfully");
      } catch (error) {
        console.error("Failed to initialize fluid simulation:", error);
      }
    }, 100);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (resizeCanvas() && simulationRef.current) {
        simulationRef.current.resize();
      }
    });
    resizeObserver.observe(container);

    // Add event listeners
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      simulationRef.current?.stop();
      simulationRef.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []); // Empty deps - only run once

  // Update config without reinitializing
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.updateConfig(config);
    }
  }, [config]);

  return (
    <div ref={containerRef} className={`${className}`} style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}

export { defaultConfig };
export type { FluidConfig };
