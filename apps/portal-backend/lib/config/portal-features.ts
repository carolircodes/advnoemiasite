function readBooleanFlag(name: string, fallback: boolean) {
  const rawValue = process.env[name];

  if (typeof rawValue !== "string") {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

export const portalFeatures = {
  clientCaseSummary: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_CASE_SUMMARY", true),
  clientDocuments: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_DOCUMENTS", true),
  clientAgenda: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_AGENDA", true),
  clientRequests: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_REQUESTS", true),
  clientActivity: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_ACTIVITY", true),
  clientWidgets: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_WIDGETS", false),
  clientAI: readBooleanFlag("NEXT_PUBLIC_PORTAL_CLIENT_AI", false)
} as const;

export type PortalFeatureKey = keyof typeof portalFeatures;

export function isPortalFeatureEnabled(feature: PortalFeatureKey) {
  return portalFeatures[feature];
}
