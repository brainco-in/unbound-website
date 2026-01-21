"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > window.innerHeight * 0.8;
      setScrolled(isScrolled);
      setVisible(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-500",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0",
        scrolled && "bg-background/80 backdrop-blur-md border-b border-border"
      )}
    >
      <Link href="/" className="font-display text-2xl tracking-tight">
        UNBOUND
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
