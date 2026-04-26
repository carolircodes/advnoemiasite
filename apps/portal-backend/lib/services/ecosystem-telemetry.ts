import "server-only";

import { z } from "zod";

import { ecosystemEventKeys } from "../domain/ecosystem.ts";
import { recordProductEvent } from "./public-intake.ts";

const ecosystemTelemetrySchema = z.object({
  eventKey: z.enum(ecosystemEventKeys),
  pagePath: z.string().trim().max(300).optional(),
  profileId: z.string().trim().max(160).optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export async function recordEcosystemTelemetry(rawInput: unknown) {
  const input = ecosystemTelemetrySchema.parse(rawInput);

  return recordProductEvent({
    eventKey: input.eventKey,
    eventGroup: "ecosystem",
    pagePath: input.pagePath || "/cliente",
    profileId: input.profileId,
    payload: input.payload || {}
  });
}
