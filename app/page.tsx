"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { FluidMaskScene, FluidMaskConfig } from "@/components/fluid-reveal";
import { ZoomTransition } from "@/components/zoom-transition";
import { ValueProposition } from "@/components/value-proposition";
import { HorizontalServices } from "@/components/horizontal-services";
import { CTASection } from "@/components/cta-section";
import { Navbar } from "@/components/navbar";

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

// Helper to parse hex color to RGB array (0-1 range)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0.039, 0.039, 0.039]; // fallback to dark
}

function FluidScratchHero() {
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useTheme();
  
  // Get theme colors from CSS variables - recompute when theme changes
  const fluidConfig = useMemo<FluidMaskConfig>(() => {
    if (typeof window === "undefined") {
      return {
        radius: 0.04,
        strength: 0.85,
        dissipation: 0.992,
        backgroundColor: [0.039, 0.039, 0.039],
      };
    }
    const styles = getComputedStyle(document.documentElement);
    const bgColor = styles.getPropertyValue("--background").trim();
    return {
      radius: 0.04,
      strength: 0.85,
      dissipation: 0.992,
      backgroundColor: hexToRgb(bgColor),
    };
  }, [resolvedTheme]);
  
  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Layer 1: Tech terms (reveal content) - hidden until canvas ready */}
      <div 
        className="absolute inset-0 flex flex-wrap items-center justify-center content-around gap-3 md:gap-4 p-4 md:p-8 z-0 bg-background"
        style={{
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      >
        {TECH_TERMS.map((term, index) => (
          <span
            key={term}
            className="font-mono select-none whitespace-nowrap text-foreground"
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
          key={resolvedTheme}
          config={fluidConfig}
          overlayText="UNBOUND"
          onReady={() => setIsReady(true)}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch with GSAP
  if (!isClient) {
    return (
      <main className="bg-background min-h-screen">
        <div className="flex h-screen items-center justify-center">
          <span className="font-display text-6xl md:text-8xl">UNBOUND</span>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background">
      <Navbar />
      
      {/* Section 1 & 2: Fluid Scratch Reveal + Zoom Transition (pinned) */}
      <ZoomTransition>
        <FluidScratchHero />
      </ZoomTransition>

      {/* Section 3: Value Proposition (pinned) */}
      <ValueProposition />

      {/* Section 4: Horizontal Services Scroll (pinned) */}
      <HorizontalServices />

      {/* Section 5: CTA */}
      <CTASection />
    </main>
  );
}
