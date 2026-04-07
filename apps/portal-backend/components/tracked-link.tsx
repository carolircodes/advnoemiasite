"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

import { trackProductEvent } from "../lib/analytics/browser";

type TrackedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  eventKey?: string;
  eventGroup?: string;
  trackingPayload?: Record<string, unknown>;
  children: ReactNode;
};

export function TrackedLink({
  href,
  eventKey,
  eventGroup,
  trackingPayload,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (eventKey) {
          trackProductEvent({
            eventKey,
            eventGroup,
            pagePath: pathname,
            payload: {
              href,
              ...(trackingPayload || {})
            }
          });
        }

        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
