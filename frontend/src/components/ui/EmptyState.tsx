import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-8 sm:py-28">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-4 py-10 text-center sm:px-8">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry ? (
        <Button type="button" variant="ghost" className="mt-3 h-8 underline underline-offset-2" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
