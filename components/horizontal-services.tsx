"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";
import { cn } from "@/lib/utils";

// Hook to detect touch devices (device-based, not size-based)
function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    // SSR-safe: assume false on server
    if (typeof window === "undefined") return false;
    // On client, check immediately to avoid flash of wrong behavior
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  });

  useEffect(() => {
    // Re-check on mount in case initial check was wrong
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    setIsTouchDevice(hasTouch);
  }, []);

  return isTouchDevice;
}

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
  // Device-based detection instead of size-based
  const isTouchDevice = useIsTouchDevice();

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;

    if (!container || !track) return;

    // Wait for layout to settle
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        if (isTouchDevice) {
          // Reset any GSAP transforms to ensure native horizontal scroll works
          gsap.set(track, { x: 0, clearProps: "transform" });

          // Touch device: Pin with dead scroll only - no animation
          // User manually swipes cards horizontally (independent of vertical scroll)
          scrollTriggerRef.current = ScrollTrigger.create({
            trigger: container,
            start: "top top",
            end: "+=100%", // Dead scroll - section stays pinned for 150vh
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
          });
        } else {
          // Desktop: Vertical scroll drives horizontal card animation
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
        }
      }, container);

      return () => ctx.revert();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, [isTouchDevice]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-background"
    >
      {/* Section header - consistent absolute positioning on all devices */}
      <div className="absolute left-6 top-20 z-10 sm:top-24 md:left-8 md:top-20 lg:top-24">
        <h2 className="font-display text-2xl text-muted sm:text-3xl md:text-4xl">
          Our Services
        </h2>
      </div>

      {/* Horizontal scroll track */}
      <div
        ref={trackRef}
        className={cn(
          "flex items-end",
          isTouchDevice
            ? "h-full gap-4 overflow-x-auto snap-x snap-mandatory px-6 pt-32 pb-32 hide-scrollbar touch-pan-x"
            : "h-full gap-4 pl-6 pr-[50vw] py-32 will-change-transform md:gap-6 md:pl-8 lg:gap-8"
        )}
        style={{ width: isTouchDevice ? "100%" : "fit-content" }}
      >
        {/* Spacer for header */}
        <div className="h-full w-[15vw] flex-shrink-0 md:w-[18vw] lg:w-[20vw]" />

        {SERVICES.map((service) => (
          <div
            key={service.id}
            className={cn(
              "service-card flex flex-shrink-0 flex-col justify-between rounded-2xl border border-border bg-surface",
              isTouchDevice
                ? "h-[65vh] w-[80vw] snap-center p-6"
                : "h-[65vh] w-[70vw] p-6 sm:w-[60vw] md:h-[70vh] md:w-[50vw] md:p-10 lg:w-[40vw] lg:p-12"
            )}
          >
            <div>
              <div className="mb-4 text-muted md:mb-6">{service.icon}</div>
              <h3 className="font-display text-2xl leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
                {service.title}
              </h3>
            </div>
            <p className="max-w-md text-base text-muted md:text-lg">
              {service.description}
            </p>
          </div>
        ))}
      </div>

      {/* Progress indicator - only on desktop */}
      {!isTouchDevice && (
        <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
          <div className="h-px w-full bg-border" />
        </div>
      )}
    </section>
  );
}
