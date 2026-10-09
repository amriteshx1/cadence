import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { toDatetimeLocalValue } from "../../lib/format";
import { isBlankBody } from "../../lib/html";
import { parseLeadsPreview, type LeadsPreview } from "../../lib/parseLeads";
import { ArrowLeft, Calendar, Clock, Paperclip, Upload } from "lucide-react";
import { BodyEditor } from "./BodyEditor";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Spinner } from "../ui/Spinner";
import { useToast } from "../ui/ToastProvider";

const MIN_DELAY_SEC = 2;
const DEFAULT_HOURLY = 50;

type Props = {
  open: boolean;
  onClose: () => void;
  onScheduled: (message: string) => void;
};

export function ComposeDialog({ open, onClose, onScheduled }: Props) {
  const { toast } = useToast();
  const sendersQuery = useQuery({
    queryKey: ["senders"],
    queryFn: async () => {
      const boot = await api.bootstrapSenders();
      return boot.senders;
    },
    enabled: open,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState("");
  const [startAt, setStartAt] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 60_000)));
  const [delaySec, setDelaySec] = useState(MIN_DELAY_SEC);
  const [hourlyLimit, setHourlyLimit] = useState(DEFAULT_HOURLY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LeadsPreview | null>(null);
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState("");
  const [laterOpen, setLaterOpen] = useState(false);
  const [importSkipped, setImportSkipped] = useState({ invalid: 0, duplicate: 0 });

  const reset = () => {
    setSubject("");
    setBody("");
    setSenderId("");
    setStartAt(toDatetimeLocalValue(new Date(Date.now() + 60_000)));
    setDelaySec(MIN_DELAY_SEC);
    setHourlyLimit(DEFAULT_HOURLY);
    setFile(null);
    setPreview(null);
    setPaste("");
    setDraft("");
    setLaterOpen(false);
    setImportSkipped({ invalid: 0, duplicate: 0 });
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    if (!next) return;
    try {
      const text = await next.text();
      const parsed = parseLeadsPreview(text, next.name);
      const priorFileEmails = file && preview ? preview.emails.join("\n") : "";
      const priorSkips =
        file && preview
          ? { invalid: preview.skippedInvalid, duplicate: preview.skippedDuplicate }
          : null;
      const pendingDraft = draft.trim();

      if (priorSkips) {
        setImportSkipped((prev) => ({
          invalid: prev.invalid + priorSkips.invalid,
          duplicate: prev.duplicate + priorSkips.duplicate,
        }));
      }
      if (priorFileEmails || pendingDraft) {
        setPaste((prev) => [prev.trim(), priorFileEmails, pendingDraft].filter(Boolean).join("\n"));
      }
      if (pendingDraft) setDraft("");
      setFile(next);
      setPreview(parsed);
    } catch {
      setPreview(null);
      toast("error", "Could not read that file.");
    }
  };

  const committedPreview = useMemo(
    () => (paste.trim() ? parseLeadsPreview(paste, "leads.txt") : null),
    [paste],
  );
  const badgeEmails = useMemo(() => {
    if (file && preview) {
      const merged = [paste, preview.emails.join("\n")].filter((part) => part.trim()).join("\n");
      return merged.trim() ? parseLeadsPreview(merged, "leads.txt").emails : preview.emails;
    }
    return committedPreview?.emails ?? [];
  }, [committedPreview, file, paste, preview]);
  const detected = useMemo(() => {
    const empty = { emails: [] as string[], skippedInvalid: 0, skippedDuplicate: 0 };
    const pasteParsed = paste.trim() ? parseLeadsPreview(paste, "leads.txt") : empty;
    const draftParsed = draft.trim() ? parseLeadsPreview(draft, "leads.txt") : empty;
    const fileEmails = file && preview ? preview.emails : [];
    const fileInvalid = file && preview ? preview.skippedInvalid : 0;
    const fileDuplicate = file && preview ? preview.skippedDuplicate : 0;

    const seen = new Set<string>();
    const emails: string[] = [];
    let overlap = 0;
    for (const email of [...pasteParsed.emails, ...fileEmails]) {
      if (seen.has(email)) {
        overlap += 1;
        continue;
      }
      seen.add(email);
      emails.push(email);
    }
    for (const email of draftParsed.emails) {
      if (seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }

    const skippedInvalid = importSkipped.invalid + fileInvalid + pasteParsed.skippedInvalid;
    const skippedDuplicate =
      importSkipped.duplicate + fileDuplicate + pasteParsed.skippedDuplicate + overlap;

    if (!emails.length && skippedInvalid === 0 && skippedDuplicate === 0) return null;
    return { emails, skippedInvalid, skippedDuplicate };
  }, [draft, file, importSkipped, paste, preview]);

  const clearFileUpload = () => {
    setImportSkipped((prev) => ({
      invalid: prev.invalid + (preview?.skippedInvalid ?? 0),
      duplicate: prev.duplicate + (preview?.skippedDuplicate ?? 0),
    }));
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const appendCommitted = (tokens: string[]) => {
    const cleaned = tokens.map((token) => token.trim()).filter(Boolean);
    if (!cleaned.length) return;
    const fromFile = file && preview ? preview.emails.join("\n") : "";
    setPaste((prev) => {
      const base = [prev.trim(), fromFile].filter(Boolean).join("\n");
      return base ? `${base}\n${cleaned.join("\n")}` : cleaned.join("\n");
    });
    if (file) clearFileUpload();
  };

  const commitDraftValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setDraft("");
      return;
    }
    appendCommitted([trimmed]);
    setDraft("");
  };

  const onToChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/[,;\n]/.test(value)) {
      setDraft(value);
      return;
    }
    const parts = value.split(/[,;\n]+/);
    const rest = parts.pop() ?? "";
    appendCommitted(parts);
    setDraft(rest);
  };

  const onToKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraftValue(draft);
      return;
    }
    if (e.key !== "Backspace" || draft !== "") return;
    const last = badgeEmails[badgeEmails.length - 1];
    if (!last) return;
    e.preventDefault();
    const rest = badgeEmails.slice(0, -1);
    if (file) clearFileUpload();
    setPaste(rest.join("\n"));
  };

  const editChip = (email: string) => {
    if (draft.trim() && draft.trim().toLowerCase() !== email) {
      appendCommitted([draft.trim()]);
    }
    const rest = badgeEmails.filter((item) => item !== email);
    if (file) clearFileUpload();
    setPaste(rest.join("\n"));
    setDraft(email);
    queueMicrotask(() => toInputRef.current?.focus());
  };

  const senders = sendersQuery.data ?? [];
  const selectedSenderId =
    (senderId && senders.some((sender) => sender.id === senderId) ? senderId : null) ??
    senders.find((sender) => sender.isDefault)?.id ??
    senders[0]?.id ??
    "";

  const create = useMutation({
    mutationFn: (form: FormData) => api.createCampaign(form),
    onSuccess: (data) => {
      const extra = [
        data.skippedInvalid ? `${data.skippedInvalid} invalid skipped` : null,
        data.skippedDuplicate ? `${data.skippedDuplicate} duplicates skipped` : null,
      ]
        .filter(Boolean)
        .join(", ");
      onScheduled(
        `Scheduled ${data.scheduledCount} email${data.scheduledCount === 1 ? "" : "s"}${extra ? ` (${extra})` : ""}.`,
      );
      close();
    },
    onError: (err) => {
      toast("error", err instanceof ApiError ? err.message : "Could not schedule this campaign.");
    },
  });

  const validate = (): boolean => {
    if (!file && !paste.trim() && !draft.trim()) {
      toast("error", "Add at least one recipient.");
      return false;
    }
    if (!detected || detected.emails.length === 0) {
      toast("error", "No valid email addresses detected.");
      return false;
    }
    if (!subject.trim()) {
      toast("error", "Subject is required.");
      return false;
    }
    if (isBlankBody(body)) {
      toast("error", "Body is required.");
      return false;
    }
    if (!startAt) {
      toast("error", "Start time is required.");
      return false;
    }
    if (!Number.isFinite(delaySec) || delaySec < MIN_DELAY_SEC) {
      toast("error", `Delay must be at least ${MIN_DELAY_SEC} seconds.`);
      return false;
    }
    if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1) {
      toast("error", "Hourly limit must be at least 1.");
      return false;
    }
    return true;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const form = new FormData();
    form.append("subject", subject.trim());
    form.append("body", body.trim());
    form.append("startAt", new Date(startAt).toISOString());
    form.append("delayMs", String(Math.round(delaySec * 1000)));
    form.append("hourlyLimit", String(hourlyLimit));
    if (senderId) form.append("senderId", senderId);
    const typedLeads = [paste, draft].filter((part) => part.trim()).join("\n");
    if (file && !typedLeads) {
      form.append("file", file);
    } else {
      const fromFile = file && preview ? preview.emails.join("\n") : "";
      form.append("leadsText", [typedLeads, fromFile].filter((part) => part.trim()).join("\n"));
    }
    create.mutate(form);
  };

  if (!open) return null;

  const compact = Boolean(file && preview && preview.emails.length > 3);
  const pillEmails = compact ? badgeEmails.slice(0, 3) : badgeEmails;
  const extra = compact ? Math.max(0, badgeEmails.length - pillEmails.length) : 0;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-page">
      <form id="compose-form" className="mx-auto min-h-full max-w-5xl px-4 py-4 sm:px-8 sm:py-5" onSubmit={onSubmit}>
        <header className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="ghost" className="!size-8 shrink-0 !rounded-full !px-0" onClick={close} aria-label="Back">
              <ArrowLeft className="size-4.5" />
            </Button>
            <h2 className="truncate text-[17px] font-medium">Compose New Email</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Button type="button" variant="ghost" className="relative !size-8 !px-0 text-brand" title="Attach leads" aria-label="Attach leads" onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-4.5" />
              {detected && detected.emails.length > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-page">
                  {detected.emails.length}
                </span>
              ) : null}
            </Button>
            <Popover open={laterOpen} onOpenChange={setLaterOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" className="!size-8 !px-0 text-brand" title="Schedule" aria-label="Schedule">
                  <Clock className="size-4.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <h3 className="mb-3 text-sm font-semibold">Send Later</h3>
                <label className="relative block">
                  <span className="sr-only">Pick date and time</span>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="rounded-lg border-0 bg-page pr-9"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
                    <Calendar className="size-4" />
                  </span>
                </label>
                <div className="mt-3 space-y-1">
                  {laterPresets().map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="ghost"
                      className="h-8 w-full justify-start px-2 font-normal"
                      onClick={() => setStartAt(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-4">
                  <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setLaterOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="outline" pill size="sm" onClick={() => setLaterOpen(false)}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button type="submit" variant="outline" pill disabled={create.isPending}>
              {create.isPending ? <Spinner className="h-4 w-4" /> : null}
              Send
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 items-center sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <div className="py-3.5 text-sm text-muted">From</div>
          <div className="border-b border-line py-2.5">
            <Select
              value={selectedSenderId || undefined}
              onValueChange={setSenderId}
              disabled={sendersQuery.isPending || senders.length === 0}
            >
              <SelectTrigger className="w-fit max-w-full" aria-label="From">
                <SelectValue placeholder={sendersQuery.isPending ? "Loading senders" : "Choose a sender"} />
              </SelectTrigger>
              <SelectContent>
                {senders.map((sender) => (
                  <SelectItem key={sender.id} value={sender.id}>
                    {sender.label} · {sender.fromEmail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="py-3.5 text-sm text-muted">To</div>
          <div className="flex items-center gap-2 border-b border-line py-2.5">
            <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {pillEmails.map((email) => (
                <button
                  key={email}
                  type="button"
                  title="Click to edit"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editChip(email)}
                  className="max-w-full"
                >
                  <Badge variant="sent" className="max-w-full border border-brand/50 bg-transparent text-brand hover:bg-accent">
                    <span className="truncate">{email}</span>
                  </Badge>
                </button>
              ))}
              {extra > 0 ? (
                <Badge variant="sent" className="border border-brand/50 bg-transparent text-brand">
                  +{extra}
                </Badge>
              ) : null}
              <Input
                ref={toInputRef}
                value={draft}
                onChange={onToChange}
                onKeyDown={onToKeyDown}
                placeholder={badgeEmails.length ? "Add another email" : "recipient@example.com"}
                aria-label="To"
                className="h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 shrink-0 px-2 whitespace-nowrap text-brand"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" /> Upload List
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={onFile} />
          </div>
          <div className="py-3.5 text-sm text-muted">Subject</div>
          <div className="border-b border-line py-2.5">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={500}
              aria-label="Subject"
              className="h-8 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-start gap-3 text-sm text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-10">
          <label className="inline-flex items-center gap-3">
            Delay between 2 emails
            <Input
              type="number"
              min={MIN_DELAY_SEC}
              value={delaySec}
              onChange={(e) => setDelaySec(Number(e.target.value))}
              aria-label="Delay between 2 emails"
              className="h-8 w-14 rounded-lg border-0 bg-wash px-1 text-center"
            />
          </label>
          <label className="inline-flex items-center gap-3">
            Hourly Limit
            <Input
              type="number"
              min={1}
              max={1000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              aria-label="Hourly Limit"
              className="h-8 w-14 rounded-lg border-0 bg-wash px-1 text-center"
            />
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-wash px-3 pt-4 pb-5 sm:px-5">
          <BodyEditor value={body} onChange={setBody} />
        </div>
        <p className="mt-3 text-sm text-muted">
          {detected ? (
            <>
              <span className="font-semibold text-brand">{detected.emails.length}</span>
              {` email${detected.emails.length === 1 ? "" : "s"} detected · ${detected.skippedInvalid} invalid · ${detected.skippedDuplicate} duplicate · `}
            </>
          ) : null}
          Press Enter or comma for each email address in order to add that.
        </p>
      </form>
    </div>
  );
}

function laterPresets(): Array<{ label: string; value: string }> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const at = (hours: number, minutes = 0) => {
    const next = new Date(tomorrow);
    next.setHours(hours, minutes, 0, 0);
    return toDatetimeLocalValue(next);
  };
  return [
    { label: "Tomorrow", value: at(9) },
    { label: "Tomorrow, 10:00 AM", value: at(10) },
    { label: "Tomorrow, 11:00 AM", value: at(11) },
    { label: "Tomorrow, 3:00 PM", value: at(15) },
  ];
}


