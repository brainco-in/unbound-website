"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";

interface ZoomTransitionProps {
  children: React.ReactNode;
}

export function ZoomTransition({ children }: ZoomTransitionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const heroWrapper = heroWrapperRef.current;
    const overlay = overlayRef.current;
    const tagline = taglineRef.current;
    
    if (!section || !heroWrapper || !overlay || !tagline) return;

    // Set initial state
    gsap.set(tagline, { opacity: 0, scale: 0.85 });
    gsap.set(overlay, { opacity: 0 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=200%", // Pin for 200vh - animation in first half, dwell in second half
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
          onUpdate: (self) => {
            // Overlay reaches full opacity at 50% scroll (100vh), then stays
            if (overlay) {
              overlay.style.opacity = String(Math.min(self.progress * 2, 1));
            }
          },
        },
      });

      // Tagline fades in during first half of scroll (completes at 100vh)
      tl.to(tagline, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      }, 0.1);

    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative h-screen w-full bg-background"
    >
      {/* Hero wrapper - contains the fixed scratch reveal */}
      <div 
        ref={heroWrapperRef} 
        className="absolute inset-0 z-10"
      >
        {children}
      </div>

      {/* Overlay that fades in to hide the hero (WebGL-friendly approach) */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-20 bg-background pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Tagline that appears after zoom */}
      <div
        ref={taglineRef}
        className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
      >
        <h1 className="max-w-5xl text-center font-display text-5xl leading-tight tracking-tight md:text-7xl lg:text-8xl">
          Complex systems.
          <br />
          <span className="text-muted">Simplified operations.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-center text-lg text-muted md:text-xl">
          We build internal cloud platforms that engineering teams actually love to use.
        </p>
      </div>
    </section>
  );
}
