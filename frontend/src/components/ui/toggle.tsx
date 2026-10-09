import { type ComponentProps } from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40 data-[state=on]:text-brand",
  {
    variants: {
      size: {
        sm: "size-8",
        md: "size-9",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

function Toggle({
  className,
  size,
  ...props
}: ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ size }), className)} {...props} />
  );
}

export { Toggle };
