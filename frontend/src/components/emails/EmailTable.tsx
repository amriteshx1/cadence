import type { EmailItem } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import { StatusBadge } from "../ui/StatusBadge";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type Mode = "scheduled" | "sent";

export function EmailTable({ items, mode }: { items: EmailItem[]; mode: Mode }) {
  return (
    <>
      <div className="flex flex-col gap-3 px-3 py-3 md:hidden">
        {items.map((item) => (
          <MobileEmailRow key={item.id} item={item} mode={mode} />
        ))}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">To</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-44">{mode === "sent" ? "Sent" : "Scheduled"}</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-28 text-right">Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-0 truncate font-medium">To: {item.toEmail}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted">{timeStamp(item, mode)}</TableCell>
                <TableCell className="max-w-0">
                  <div className="truncate">
                    <span className="font-semibold text-ink">{item.subject}</span>
                    {item.failureReason ? <span className="text-danger"> — {item.failureReason}</span> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.previewUrl ? <PreviewLink href={item.previewUrl} /> : <span className="text-muted">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function MobileEmailRow({ item, mode }: { item: EmailItem; mode: Mode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">To</p>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-sm font-medium wrap-break-word">{item.toEmail}</p>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-[11px] text-muted-foreground">Subject</p>
        <p className="text-sm leading-snug font-medium text-ink">{item.subject}</p>
        {item.failureReason ? <p className="mt-1 text-sm text-danger">{item.failureReason}</p> : null}
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-xs text-muted-foreground">{timeStamp(item, mode)}</span>
        {item.previewUrl ? <PreviewLink href={item.previewUrl} /> : <span />}
      </CardFooter>
    </Card>
  );
}

function timeStamp(item: EmailItem, mode: Mode): string {
  if (mode === "scheduled") return formatDateTime(item.scheduledAt);
  return sentStamp(item);
}

function sentStamp(item: EmailItem): string {
  if (item.sentAt) return formatDateTime(item.sentAt);
  if (item.status === "failed" && item.failedAt) return `Failed ${formatDateTime(item.failedAt)}`;
  return "—";
}

function PreviewLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
      Preview
    </a>
  );
}
