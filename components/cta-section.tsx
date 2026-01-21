"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";
import Link from "next/link";

export function CTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    // Delay initialization to let pinned sections above calculate their positions
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Animate content children with scroll-triggered stagger
        gsap.fromTo(
          content.children,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.15,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: container,
              start: "top 80%",
              end: "top 30%",
              toggleActions: "play none none reverse",
              refreshPriority: -1, // Refresh after pinned sections
            },
          }
        );
      }, container);

      return () => ctx.revert();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center px-8 py-24 bg-background"
    >
      <div ref={contentRef} className="max-w-3xl text-center">
        <span className="mb-6 block font-mono text-sm uppercase tracking-widest text-muted">
          Ready to get started?
        </span>
        <h2 className="mb-8 font-display text-5xl leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Let&apos;s build something
          <br />
          <span className="text-muted">extraordinary together.</span>
        </h2>
        <p className="mb-12 text-lg text-muted md:text-xl">
          Tell us about your infrastructure challenges. We&apos;ll help you find the path forward.
        </p>
        <Link
          href="/contact"
          className="group inline-flex items-center gap-3 rounded-full border-2 border-foreground bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors duration-300 hover:bg-transparent hover:text-foreground"
        >
          Get Started
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 left-8 right-8 flex items-center justify-between text-sm text-muted">
        <span>© 2026 Unbound. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="transition-colors hover:text-foreground">
            LinkedIn
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Twitter
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            GitHub
          </a>
        </div>
      </footer>
    </section>
  );
}
