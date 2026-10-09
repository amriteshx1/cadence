import { forwardRef, type ComponentProps } from "react";
import { cn } from "../../lib/cn";

const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full border border-line bg-wash px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export { Input };
