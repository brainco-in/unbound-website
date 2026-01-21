"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

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

export function ScratchReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    setPos({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
      setIsHovering(true);
    };

    const onMouseLeave = () => {
      setIsHovering(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      updatePosition(touch.clientX, touch.clientY);
      setIsHovering(true);
    };

    const onTouchEnd = () => {
      setIsHovering(false);
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [updatePosition]);

  const revealRadius = 160;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background"
      style={{ cursor: isHovering ? "none" : "default" }}
    >
      {/* Base layer: UNBOUND text - always visible */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h1 className="font-display text-7xl tracking-tight md:text-[10rem] lg:text-[14rem] select-none">
          UNBOUND
        </h1>
        <p className="mt-6 text-center text-lg text-muted md:text-xl select-none">
          Move your cursor to reveal
        </p>
      </div>

      {/* Reveal layer: Tech terms - visible only in circle via clip-path */}
      <div
        className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 p-8 md:p-12 bg-background"
        style={{
          clipPath: `circle(${isHovering ? revealRadius : 0}px at ${pos.x}px ${pos.y}px)`,
          transition: isHovering ? "clip-path 0.05s ease-out" : "clip-path 0.2s ease-out",
        }}
      >
        {TECH_TERMS.map((term, index) => (
          <span
            key={term}
            className={cn(
              "font-mono select-none whitespace-nowrap",
              index % 4 === 0 && "text-2xl md:text-4xl lg:text-5xl font-bold",
              index % 4 === 1 && "text-xl md:text-2xl lg:text-3xl font-semibold text-foreground/90",
              index % 4 === 2 && "text-lg md:text-xl lg:text-2xl font-medium text-foreground/70",
              index % 4 === 3 && "text-base md:text-lg lg:text-xl text-muted"
            )}
            style={{
              transform: `rotate(${((index * 7) % 30) - 15}deg)`,
            }}
          >
            {term}
          </span>
        ))}
      </div>

      {/* Cursor indicator */}
      {isHovering && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
            zIndex: 50,
          }}
        >
          <div className="h-3 w-3 rounded-full bg-foreground" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/30"
            style={{
              width: revealRadius * 2,
              height: revealRadius * 2,
            }}
          />
        </div>
      )}
    </div>
  );
}
