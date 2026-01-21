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

// Default config - tuned for smooth fluid reveal
const DEFAULT_CONFIG: FluidMaskConfig = {
  radius: 0.08,           // Base brush radius (expands with velocity)
  strength: 0.85,         // How quickly mask fills in  
  dissipation: 0.992,     // How slowly the mask fades (higher = more persistent)
  backgroundColor: [0.039, 0.039, 0.039], // #0a0a0a
};

export default function FluidTestPage() {
  const [showDebug, setShowDebug] = useState(true);
  const [config, setConfig] = useState<FluidMaskConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback((key: keyof FluidMaskConfig, value: number | [number, number, number]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      {/* 
        Layer Stack (bottom to top):
        1. Tech terms (z-0) - The reveal content, always rendered
        2. FluidMaskScene (z-10) - WebGL canvas with UNBOUND rendered inside, 
           scratching reveals tech terms below
      */}

      {/* Layer 1: Tech terms (reveal content) - visible through transparent canvas areas */}
      <div className="absolute inset-0 flex flex-wrap items-center justify-center content-center gap-3 md:gap-4 p-8 md:p-16 z-0 bg-[#0a0a0a]">
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

      {/* Layer 2: FluidMaskScene - WebGL canvas with UNBOUND, scratch to reveal */}
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
        <div className="fixed top-4 right-4 z-[100] p-5 bg-[#0a0a0a]/90 backdrop-blur-md rounded-xl text-[#fafafa] w-[300px] border border-[#333]">
          <h3 className="m-0 mb-4 text-base font-semibold">
            Fluid Mask Controls
          </h3>

          <div className="mb-4">
            <label className="block text-xs text-white/60 mb-1">
              Brush Radius: {config.radius.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.02"
              max="0.3"
              step="0.01"
              value={config.radius}
              onChange={(e) => updateConfig("radius", parseFloat(e.target.value))}
              className="w-full accent-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-white/60 mb-1">
              Brush Strength: {config.strength.toFixed(2)}
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
          </div>

          <div className="mb-4">
            <label className="block text-xs text-white/60 mb-1">
              Dissipation: {config.dissipation.toFixed(4)}
            </label>
            <input
              type="range"
              min="0.95"
              max="0.999"
              step="0.001"
              value={config.dissipation}
              onChange={(e) => updateConfig("dissipation", parseFloat(e.target.value))}
              className="w-full accent-white"
            />
            <span className="text-[10px] text-white/40">
              Higher = stays longer (0.999 = nearly permanent)
            </span>
          </div>

          <p className="text-[11px] text-white/40 m-0">
            Move cursor to paint fluid and reveal tech terms beneath
          </p>
        </div>
      )}
    </div>
  );
}
