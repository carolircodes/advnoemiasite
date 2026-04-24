export type CanonicalFollowUpStatus =
  | "none"
  | "pending"
  | "due"
  | "overdue"
  | "resolved"
  | "converted";

export type FollowUpMessageDeliveryStatus =
  | "sent"
  | "delivered"
  | "read"
  | "replied"
  | "failed"
  | "cancelled"
  | "no_response";

type NormalizeFollowUpStatusOptions = {
  pipelineStage?: string | null;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isConvertedPipelineStage(pipelineStage: string | null | undefined) {
  return normalizeText(pipelineStage) === "consultation_scheduled";
}

export function normalizeFollowUpStatus(
  value: string | null | undefined,
  options: NormalizeFollowUpStatusOptions = {}
): CanonicalFollowUpStatus {
  const normalized = normalizeText(value);
  const isConverted = isConvertedPipelineStage(options.pipelineStage);

  switch (normalized) {
    case "pending":
    case "due":
    case "overdue":
    case "resolved":
    case "converted":
    case "none":
      return normalized;
    case "scheduled":
    case "sent":
    case "delivered":
    case "read":
      return "pending";
    case "replied":
      return isConverted ? "converted" : "resolved";
    case "completed":
      return isConverted ? "converted" : "resolved";
    case "failed":
    case "cancelled":
    case "no_response":
      return "due";
    default:
      return "none";
  }
}

export function mapFollowUpMessageStatusToFollowUpStatus(
  status: FollowUpMessageDeliveryStatus,
  options: NormalizeFollowUpStatusOptions = {}
): CanonicalFollowUpStatus {
  return normalizeFollowUpStatus(status, options);
}

export function isPendingFollowUpStatus(
  value: string | null | undefined,
  options: NormalizeFollowUpStatusOptions = {}
) {
  const status = normalizeFollowUpStatus(value, options);
  return status === "pending" || status === "due" || status === "overdue";
}

export function isClosedFollowUpStatus(
  value: string | null | undefined,
  options: NormalizeFollowUpStatusOptions = {}
) {
  const status = normalizeFollowUpStatus(value, options);
  return status === "resolved" || status === "converted";
}
