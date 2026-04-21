"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  /** Label shown while the form is submitting. Read out by screen readers. */
  pendingLabel?: string;
}

const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ children, pendingLabel = "Working…", className, disabled, ...props }, ref) => {
    const { pending } = useFormStatus();
    return (
      <Button
        ref={ref}
        type="submit"
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        disabled={pending || disabled}
        className={cn(className)}
        {...props}
      >
        <span aria-hidden={pending ? "true" : undefined}>{children}</span>
        {pending ? (
          <>
            <span className="sr-only">{pendingLabel}</span>
            <span
              aria-hidden="true"
              className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            />
          </>
        ) : null}
      </Button>
    );
  },
);
SubmitButton.displayName = "SubmitButton";

export { SubmitButton };
