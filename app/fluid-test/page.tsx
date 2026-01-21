import { notFound } from "next/navigation";
import FluidTestClient from "./FluidTestClient";

export default function FluidTestPage() {
  // Hide this page in production unless explicitly enabled
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_ENABLE_FLUID_TEST) {
    notFound();
  }

  return <FluidTestClient />;
}
