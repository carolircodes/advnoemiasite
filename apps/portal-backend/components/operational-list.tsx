import Link from "next/link";

import type {
  StaffOperationalItem,
  StaffOperationalSeverity,
  StaffOperationalStateTone
} from "@/lib/services/dashboard";

type OperationalListProps = {
  items: StaffOperationalItem[];
  emptyMessage: string;
};

function getSeverityClassName(severity: StaffOperationalSeverity) {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function getStateClassName(stateTone: StaffOperationalStateTone) {
  switch (stateTone) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "success":
      return "success";
    default:
      return "neutral";
  }
}

export function OperationalList({ items, emptyMessage }: OperationalListProps) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="operations-list">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`operation-card ${getSeverityClassName(item.severity)}`}
        >
          <div className="operation-head">
            <span className={`operation-state ${getStateClassName(item.stateTone)}`}>
              {item.stateLabel}
            </span>
            <span className="operation-kind">{item.kindLabel}</span>
          </div>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          <div className="operation-meta-row">
            {item.meta.map((meta) => (
              <span key={`${item.id}-${meta}`} className="operation-meta-pill">
                {meta}
              </span>
            ))}
          </div>
          <div className="operation-footer">
            <span>{item.timingLabel}</span>
            <span>{item.actionLabel}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
