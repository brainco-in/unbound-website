"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mock submission - simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="mb-4 font-display text-3xl">Message sent!</h3>
        <p className="mb-8 text-muted">
          Thanks for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setFormData({ name: "", email: "", company: "", message: "" });
          }}
          className="text-muted underline transition-colors hover:text-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative">
          <label
            htmlFor="name"
            className={cn(
              "absolute left-0 transition-all duration-200",
              focusedField === "name" || formData.name
                ? "-top-6 text-sm text-muted"
                : "top-4 text-lg"
            )}
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            required
            className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
          />
        </div>

        <div className="relative">
          <label
            htmlFor="email"
            className={cn(
              "absolute left-0 transition-all duration-200",
              focusedField === "email" || formData.email
                ? "-top-6 text-sm text-muted"
                : "top-4 text-lg"
            )}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            required
            className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
          />
        </div>
      </div>

      <div className="relative">
        <label
          htmlFor="company"
          className={cn(
            "absolute left-0 transition-all duration-200",
            focusedField === "company" || formData.company
              ? "-top-6 text-sm text-muted"
              : "top-4 text-lg"
          )}
        >
          Company
        </label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          onFocus={() => setFocusedField("company")}
          onBlur={() => setFocusedField(null)}
          className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
        />
      </div>

      <div className="relative">
        <label
          htmlFor="message"
          className={cn(
            "absolute left-0 transition-all duration-200",
            focusedField === "message" || formData.message
              ? "-top-6 text-sm text-muted"
              : "top-4 text-lg"
          )}
        >
          Tell us about your project
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          onFocus={() => setFocusedField("message")}
          onBlur={() => setFocusedField(null)}
          required
          rows={4}
          className="w-full resize-none border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "group inline-flex items-center gap-3 rounded-full border-2 border-foreground bg-foreground px-8 py-4 text-lg font-medium text-background transition-all duration-300",
          isSubmitting
            ? "cursor-not-allowed opacity-70"
            : "hover:bg-transparent hover:text-foreground"
        )}
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sending...
          </>
        ) : (
          <>
            Send Message
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
          </>
        )}
      </button>
    </form>
  );
}
