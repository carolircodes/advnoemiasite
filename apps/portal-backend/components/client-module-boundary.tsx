"use client";

import type { ReactNode } from "react";

import { ErrorBoundary } from "@/components/error-boundary";

type ClientModuleBoundaryProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ClientModuleBoundary({
  title,
  description,
  children
}: ClientModuleBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <section className="rounded-3xl border border-[#eadfcf] bg-[#fbf7ef] p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)]">
          <h2 className="text-lg font-semibold text-[#10261d]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[#7b5c31]">{description}</p>
        </section>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
