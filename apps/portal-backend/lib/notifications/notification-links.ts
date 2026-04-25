const NOTIFICATION_PARAM_KEYS = {
  id: "notification",
  eventKey: "notification_event",
  source: "notification_source"
} as const;

export function buildNotificationRedirectPath(notificationId: string) {
  return `/n/${encodeURIComponent(notificationId)}`;
}

export function isAbsoluteHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function buildSafeNotificationTarget(input: {
  rawTarget: string | null | undefined;
  fallbackPath: string;
  appOrigin: string;
}) {
  const candidate = (input.rawTarget || "").trim();

  if (!candidate) {
    return new URL(input.fallbackPath, input.appOrigin);
  }

  try {
    const nextUrl = isAbsoluteHttpUrl(candidate)
      ? new URL(candidate)
      : new URL(candidate.startsWith("/") ? candidate : `/${candidate}`, input.appOrigin);

    if (nextUrl.origin !== input.appOrigin) {
      return new URL(input.fallbackPath, input.appOrigin);
    }

    return nextUrl;
  } catch {
    return new URL(input.fallbackPath, input.appOrigin);
  }
}

export function appendNotificationContext(
  url: URL,
  context: {
    notificationId: string;
    eventKey?: string | null;
    source?: string;
  }
) {
  url.searchParams.set(NOTIFICATION_PARAM_KEYS.id, context.notificationId);

  if (context.eventKey) {
    url.searchParams.set(NOTIFICATION_PARAM_KEYS.eventKey, context.eventKey);
  }

  url.searchParams.set(NOTIFICATION_PARAM_KEYS.source, context.source || "notification");
  return url;
}

export function getNotificationContextParamKeys() {
  return NOTIFICATION_PARAM_KEYS;
}
