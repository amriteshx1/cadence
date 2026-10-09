import { useEffect } from "react";

type ToastItem = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

const colors = {
  success: "bg-zinc-200 text-zinc-950",
  error: "bg-red-600 text-white",
  info: "bg-zinc-800 text-white",
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-80">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), 4500);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={`pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${colors[toast.kind]}`}>
      {toast.message}
    </div>
  );
}

export type { ToastItem };
