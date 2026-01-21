"use client";

import { ContactForm } from "@/components/contact-form";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-3 font-display text-2xl tracking-tight transition-opacity hover:opacity-70"
        >
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
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          UNBOUND
        </Link>
        <ThemeToggle />
      </header>

      {/* Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-8 pt-24 pb-12">
        <div className="w-full max-w-2xl">
          <div className="mb-12">
            <span className="mb-4 block font-mono text-sm uppercase tracking-widest text-muted">
              Get in touch
            </span>
            <h1 className="mb-6 font-display text-5xl leading-tight tracking-tight md:text-6xl">
              Let&apos;s talk about
              <br />
              <span className="text-muted">your infrastructure.</span>
            </h1>
            <p className="text-lg text-muted">
              Whether you&apos;re looking to optimize existing systems or build something new,
              we&apos;re here to help. Fill out the form below and we&apos;ll be in touch.
            </p>
          </div>

          <ContactForm />
        </div>
      </div>
    </main>
  );
}
