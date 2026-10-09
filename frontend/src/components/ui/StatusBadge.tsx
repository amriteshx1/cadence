import { Clock } from "lucide-react";
import { formatBadgeTime } from "../../lib/format";
import type { EmailStatus } from "../../lib/types";
import { Badge } from "./badge";

const labels: Record<EmailStatus, string> = {
  scheduled: "Scheduled",
  sending: "In Progress",
  sent: "Sent",
  failed: "Failed",
};

export function StatusBadge({
  status,
  time,
}: {
  status: EmailStatus;
  time?: string | null;
}) {
  if ((status === "scheduled" || status === "sending") && time) {
    return (
      <Badge variant={status === "sending" ? "sending" : "scheduled"}>
        <Clock className="size-3" />
        {formatBadgeTime(time)}
      </Badge>
    );
  }
  return <Badge variant={status}>{labels[status]}</Badge>;
}
