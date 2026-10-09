import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium", {
  variants: {
    variant: {
      scheduled: "bg-badge text-progress",
      sending: "bg-badge text-progress",
      sent: "bg-wash text-[#c8c8c8]",
      failed: "bg-red-950/40 text-danger",
    },
  },
  defaultVariants: {
    variant: "scheduled",
  },
});

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
