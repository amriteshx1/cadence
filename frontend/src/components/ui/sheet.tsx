import { type ComponentProps } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";

function Sheet(props: ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: ComponentProps<typeof Dialog.Content> & { side?: "left" | "right" }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <Dialog.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-lg outline-none",
          side === "right" ? "right-0 border-l border-sidebar-border" : "left-0 border-r border-sidebar-border",
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />;
}

function SheetTitle({ className, ...props }: ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title data-slot="sheet-title" className={cn("font-medium text-foreground", className)} {...props} />;
}

function SheetDescription({ className, ...props }: ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
