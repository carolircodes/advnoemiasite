export type DiagnosticStatus =
  | "healthy"
  | "degraded"
  | "missing_configuration"
  | "fallback"
  | "hard_failure";

export type DiagnosticSection = {
  status: DiagnosticStatus;
  code: string;
  summary: string;
  operatorAction: string;
  verification: string[];
  details: Record<string, unknown>;
};

const STATUS_ORDER: DiagnosticStatus[] = [
  "healthy",
  "degraded",
  "missing_configuration",
  "fallback",
  "hard_failure"
];

export function combineDiagnosticStatuses(
  sections: Array<Pick<DiagnosticSection, "status">>
): DiagnosticStatus {
  return sections.reduce<DiagnosticStatus>((worst, section) => {
    return STATUS_ORDER.indexOf(section.status) > STATUS_ORDER.indexOf(worst)
      ? section.status
      : worst;
  }, "healthy");
}

export function buildDiagnosticSection(input: DiagnosticSection): DiagnosticSection {
  return input;
}
