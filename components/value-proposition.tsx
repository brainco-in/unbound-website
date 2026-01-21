"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";

export function ValueProposition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    
    if (!container || !text) return;

    const ctx = gsap.context(() => {
      const words = text.querySelectorAll(".word");
      
      // Pin the section and animate words during scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=100%", // Pin for 100vh worth of scrolling
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
        },
      });

      // Stagger word animations across the pinned duration
      tl.fromTo(
        words,
        { opacity: 0.1, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.02,
          ease: "power2.out",
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  const text = `We help companies build, optimize, and operate cloud platforms that their teams actually love to use. From platform engineering to cost optimization, we transform complex infrastructure into simple, reliable systems that empower your engineering teams to ship faster.`;
  
  const words = text.split(" ");

  return (
    <section
      ref={containerRef}
      className="flex h-screen items-center justify-center px-8 py-24 bg-background"
    >
      <div ref={textRef} className="max-w-5xl">
        <h2 className="mb-12 font-display text-3xl text-muted md:text-4xl">
          What we do
        </h2>
        <p className="text-2xl font-light leading-relaxed tracking-tight md:text-3xl lg:text-4xl">
          {words.map((word, index) => (
            <span key={index} className="word inline-block mr-[0.25em]">
              {word}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
