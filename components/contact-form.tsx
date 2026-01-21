"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch("/forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData as unknown as Record<string, string>).toString(),
      });

      if (response.ok) {
        setIsSuccess(true);
        setFieldValues({ name: "", email: "", company: "", message: "" });
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setError(null);
    setFieldValues({ name: "", email: "", company: "", message: "" });
  };

  if (isSuccess) {
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
          onClick={handleReset}
          className="text-muted underline transition-colors hover:text-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form 
      name="contact" 
      method="POST" 
      data-netlify="true" 
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      <input type="hidden" name="form-name" value="contact" />
      <p className="hidden">
        <label>
          Don&apos;t fill this out if you&apos;re human: <input name="bot-field" />
        </label>
      </p>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative">
          <label
            htmlFor="name"
            className={cn(
              "absolute left-0 transition-all duration-200 pointer-events-none",
              focusedField === "name" || fieldValues.name
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
            onFocus={() => setFocusedField("name")}
            onBlur={(e) => {
              setFocusedField(null);
              handleFieldChange("name", e.target.value);
            }}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            required
            className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
          />
        </div>

        <div className="relative">
          <label
            htmlFor="email"
            className={cn(
              "absolute left-0 transition-all duration-200 pointer-events-none",
              focusedField === "email" || fieldValues.email
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
            onFocus={() => setFocusedField("email")}
            onBlur={(e) => {
              setFocusedField(null);
              handleFieldChange("email", e.target.value);
            }}
            onChange={(e) => handleFieldChange("email", e.target.value)}
            required
            className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
          />
        </div>
      </div>

      <div className="relative">
        <label
          htmlFor="company"
          className={cn(
            "absolute left-0 transition-all duration-200 pointer-events-none",
            focusedField === "company" || fieldValues.company
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
          onFocus={() => setFocusedField("company")}
          onBlur={(e) => {
            setFocusedField(null);
            handleFieldChange("company", e.target.value);
          }}
          onChange={(e) => handleFieldChange("company", e.target.value)}
          className="w-full border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
        />
      </div>

      <div className="relative">
        <label
          htmlFor="message"
          className={cn(
            "absolute left-0 transition-all duration-200 pointer-events-none",
            focusedField === "message" || fieldValues.message
              ? "-top-6 text-sm text-muted"
              : "top-4 text-lg"
          )}
        >
          Tell us about your project
        </label>
        <textarea
          id="message"
          name="message"
          onFocus={() => setFocusedField("message")}
          onBlur={(e) => {
            setFocusedField(null);
            handleFieldChange("message", e.target.value);
          }}
          onChange={(e) => handleFieldChange("message", e.target.value)}
          required
          rows={4}
          className="w-full resize-none border-b-2 border-border bg-transparent py-4 text-lg outline-none transition-colors focus:border-foreground"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "group inline-flex items-center gap-3 rounded-full border-2 border-foreground bg-foreground px-8 py-4 text-lg font-medium text-background transition-all duration-300",
          "hover:bg-transparent hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-70"
        )}
      >
        {isSubmitting ? "Sending..." : "Send Message"}
        {!isSubmitting && (
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
        )}
        {isSubmitting && (
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
        )}
      </button>
    </form>
  );
}
