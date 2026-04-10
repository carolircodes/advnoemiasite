"use client";

import type { MouseEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  tone?: "primary" | "secondary" | "danger";
  confirmMessage?: string;
  disabled?: boolean;
  className?: string;
};

export function FormSubmitButton({
  children,
  pendingLabel,
  tone = "primary",
  confirmMessage,
  disabled = false,
  className = ""
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const defaultClassName =
    tone === "secondary" 
      ? "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300" 
      : tone === "danger" 
        ? "bg-red-600 hover:bg-red-700 text-white border border-red-700" 
        : "bg-[#8e6a3b] hover:bg-[#7a5a33] text-white border border-[#8e6a3b]";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!confirmMessage || pending) {
      return;
    }

    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button
      className={`w-full h-14 px-6 py-3 font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base ${defaultClassName} ${className}`}
      type="submit"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
