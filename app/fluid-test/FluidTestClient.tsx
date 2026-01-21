"use client";

import { useState, useCallback } from "react";
import { FluidMaskScene, FluidMaskConfig } from "@/components/fluid-reveal";

const TECH_TERMS = [
  "Kafka", "Spark", "Ray", "AWS", "EC2", "Kubernetes", "Terraform",
  "Flink", "Docker", "CI/CD", "GitOps", "Helm", "ArgoCD", "Prometheus",
  "Grafana", "DataDog", "CloudWatch", "Lambda", "EKS", "GKE", "Azure",
  "Pulumi", "Ansible", "Jenkins", "GitHub Actions", "S3", "RDS", "DynamoDB",
  "Redis", "PostgreSQL", "MongoDB", "Elasticsearch", "Airflow", "dbt",
  "Snowflake", "BigQuery", "Redshift", "Kinesis", "SQS", "SNS", "API Gateway",
  "Istio", "Envoy", "gRPC", "REST", "GraphQL", "OpenTelemetry", "Jaeger",
  "Vault", "Consul", "Nomad", "Traefik", "NGINX", "HAProxy", "CDN",
];

// Default config - tuned for fluid reveal effect
const DEFAULT_CONFIG: FluidMaskConfig = {
  // Visual
  radius: 0.03,
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

export default function FluidTestClient() {
  const [showDebug, setShowDebug] = useState(true);
  const [config, setConfig] = useState<FluidMaskConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback((key: keyof FluidMaskConfig, value: number | [number, number, number]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Layer 1: Tech terms (reveal content) */}
      <div className="absolute inset-0 flex flex-wrap items-center justify-center content-around gap-3 md:gap-4 p-4 md:p-8 z-0 bg-[#0a0a0a]">
        {TECH_TERMS.map((term, index) => (
          <span
            key={term}
            className="font-mono select-none whitespace-nowrap text-[#fafafa]"
            style={{
              fontSize: index % 4 === 0 ? "clamp(1.5rem, 4vw, 3rem)" 
                : index % 4 === 1 ? "clamp(1.25rem, 3vw, 2rem)"
                : index % 4 === 2 ? "clamp(1rem, 2.5vw, 1.5rem)"
                : "clamp(0.875rem, 2vw, 1.25rem)",
              fontWeight: index % 4 === 0 ? 700 : index % 4 === 1 ? 600 : index % 4 === 2 ? 500 : 400,
              opacity: index % 4 === 0 ? 1 : index % 4 === 1 ? 0.9 : index % 4 === 2 ? 0.7 : 0.5,
              transform: `rotate(${((index * 7) % 30) - 15}deg)`,
            }}
          >
            {term}
          </span>
        ))}
      </div>

      {/* Layer 2: FluidMaskScene */}
      <div className="absolute inset-0 z-10">
        <FluidMaskScene 
          config={config}
          overlayText="UNBOUND"
          overlaySubtext="Move your cursor to reveal"
        />
      </div>

      {/* Debug Toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 right-4 z-[100] px-4 py-2 bg-[#0a0a0a] text-[#fafafa] border border-[#333] rounded-lg cursor-pointer text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
      >
        {showDebug ? "Hide Debug" : "Show Debug"}
      </button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-4 right-4 z-[100] p-4 bg-[#0a0a0a]/90 backdrop-blur-md rounded-xl text-[#fafafa] w-[320px] max-h-[90vh] overflow-y-auto border border-[#333]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-base font-semibold">Fluid Controls</h3>
            <button 
              onClick={resetConfig}
              className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Visual Section */}
          <div className="mb-4 pb-3 border-b border-white/10">
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Visual</h4>
            
            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Brush Radius: {config.radius.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.005"
                value={config.radius}
                onChange={(e) => updateConfig("radius", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Size of the brush stroke</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Strength: {config.strength.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.strength}
                onChange={(e) => updateConfig("strength", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">How much dye is added per stroke</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Dye Dissipation: {config.dissipation.toFixed(3)}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={config.dissipation}
                onChange={(e) => updateConfig("dissipation", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Higher = faster fade, 0 = permanent</span>
            </div>
          </div>

          {/* Physics Section */}
          <div className="mb-4 pb-3 border-b border-white/10">
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Physics</h4>
            
            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Curl (Swirl): {config.curl}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={config.curl}
                onChange={(e) => updateConfig("curl", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Vorticity - creates swirling motion</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Velocity Dissipation: {config.velocityDissipation.toFixed(3)}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={config.velocityDissipation}
                onChange={(e) => updateConfig("velocityDissipation", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Higher = faster stop, 0 = flows forever</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Splat Force: {config.splatForce}
              </label>
              <input
                type="range"
                min="1000"
                max="15000"
                step="500"
                value={config.splatForce}
                onChange={(e) => updateConfig("splatForce", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">How much force mouse adds</span>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Pressure Iterations: {config.pressureIterations}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={config.pressureIterations}
                onChange={(e) => updateConfig("pressureIterations", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Accuracy (higher = smoother, slower)</span>
            </div>
          </div>

          {/* Simulation Section */}
          <div className="mb-3">
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Simulation</h4>
            
            <div className="mb-3">
              <label className="block text-xs text-white/60 mb-1">
                Sim Resolution: {config.simResolution}
              </label>
              <input
                type="range"
                min="64"
                max="256"
                step="16"
                value={config.simResolution}
                onChange={(e) => updateConfig("simResolution", parseFloat(e.target.value))}
                className="w-full accent-white"
              />
              <span className="text-[10px] text-white/30">Higher = more detail, more GPU</span>
            </div>
          </div>

          <p className="text-[11px] text-white/40 m-0 pt-2 border-t border-white/10">
            Move cursor to create fluid motion and reveal content
          </p>
        </div>
      )}
    </div>
  );
}
