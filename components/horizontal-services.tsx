"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    id: 1,
    title: "Platform Engineering & Orchestration",
    description:
      "Build internal tools, CI/CD platforms, and abstractions that make teams productive. Manage batch, real-time, and ML workloads at scale with Spark, Flink, and Ray.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Full Cloud Control & Observability",
    description:
      "End-to-end visibility into cloud infrastructure with dashboards, SLO automation, and alerts. Enable teams to confidently deploy and scale systems without surprises.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "Cost Optimization & Analytics",
    description:
      "Deep insights into cloud spend, cost drivers, and opportunities to reduce waste. Provide actionable analytics for smarter infrastructure decisions.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
  {
    id: 4,
    title: "Platform-first CI/CD & Workflow Automation",
    description:
      "Fix clunky pipelines and automate deployment workflows, so teams ship faster, safer, and reliably. Modern DevOps practices built for scale.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6" />
        <path d="M12 15v6" />
        <path d="m3 12 6 0" />
        <path d="m15 12 6 0" />
        <path d="m5.6 5.6 4.2 4.2" />
        <path d="m14.2 14.2 4.2 4.2" />
        <path d="m5.6 18.4 4.2-4.2" />
        <path d="m14.2 9.8 4.2-4.2" />
      </svg>
    ),
  },
  {
    id: 5,
    title: "Stateful & Serverless Abstractions",
    description:
      "Build serverless abstractions and internal services that teams can consume without worrying about infrastructure. Enable persistent, stateful workflows for complex applications.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
];

export function HorizontalServices() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    
    if (!container || !track) return;

    // Wait for layout to settle
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        const scrollWidth = track.scrollWidth - window.innerWidth;

        scrollTriggerRef.current = ScrollTrigger.create({
          trigger: container,
          start: "top top",
          end: () => `+=${scrollWidth}`,
          scrub: 1.5, // Smoother scrub to prevent glitching
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Use transform for smoother animation
            gsap.set(track, {
              x: -scrollWidth * self.progress,
              force3D: true,
            });
          },
        });
      }, container);

      return () => ctx.revert();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-background"
    >
      {/* Section header */}
      <div className="absolute left-8 top-8 z-10">
        <h2 className="font-display text-3xl text-muted md:text-4xl">
          Our Services
        </h2>
      </div>

      {/* Horizontal scroll track */}
      <div
        ref={trackRef}
        className="flex h-full items-center gap-8 pl-8 pr-[50vw] will-change-transform"
        style={{ width: "fit-content" }}
      >
        {/* Spacer for header */}
        <div className="h-full w-[25vw] flex-shrink-0" />

        {SERVICES.map((service) => (
          <div
            key={service.id}
            className={cn(
              "service-card flex h-[70vh] w-[80vw] flex-shrink-0 flex-col justify-between rounded-2xl border border-border bg-surface p-8 md:w-[50vw] md:p-12 lg:w-[40vw]",
            )}
          >
            <div>
              <div className="mb-8 text-muted">{service.icon}</div>
              <h3 className="font-display text-3xl leading-tight md:text-4xl lg:text-5xl">
                {service.title}
              </h3>
            </div>
            <p className="max-w-md text-lg text-muted">
              {service.description}
            </p>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-8 left-8 right-8">
        <div className="h-px w-full bg-border" />
      </div>
    </section>
  );
}
