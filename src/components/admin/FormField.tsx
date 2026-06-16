import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premium form field with built-in error rendering.
 * Use with react-hook-form: <FormField {...register("email")} error={errors.email?.message} />
 */

type FieldShellProps = {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  required?: boolean;
  rightSlot?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FieldShell({ label, hint, error, icon: Icon, required, rightSlot, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-maroon-deep/70">
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div
        className={cn(
          "input-premium flex items-center gap-2",
          error && "input-error",
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-saffron-deep" />}
        <div className="flex-1 min-w-0">{children}</div>
        {rightSlot}
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-maroon-deep/55">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = ComponentPropsWithoutRef<"input"> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  rightSlot?: ReactNode;
  wrapperClassName?: string;
};

export const FormField = forwardRef<HTMLInputElement, InputProps>(function FormField(
  { label, hint, error, icon, rightSlot, wrapperClassName, required, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} icon={icon} required={required} rightSlot={rightSlot} className={wrapperClassName}>
      <input
        ref={ref}
        required={required}
        aria-invalid={!!error}
        className={cn("w-full bg-transparent text-sm text-maroon-deep placeholder:text-maroon-deep/40 focus:outline-none", className)}
        {...rest}
      />
    </FieldShell>
  );
});

type TextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function FormTextarea(
  { label, hint, error, wrapperClassName, required, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea
        ref={ref}
        required={required}
        aria-invalid={!!error}
        className={cn(
          "w-full bg-transparent text-sm text-maroon-deep placeholder:text-maroon-deep/40 focus:outline-none resize-y min-h-[80px]",
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});
