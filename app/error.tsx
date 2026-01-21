"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-foreground px-4 py-2 text-background hover:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
