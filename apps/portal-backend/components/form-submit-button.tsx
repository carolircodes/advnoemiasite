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
    tone === "secondary" ? "button secondary" : tone === "danger" ? "button danger" : "button";

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
      className={`${defaultClassName} ${className}`}
      type="submit"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
