import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Spacing = "none" | "sm" | "md" | "lg";

const SPACING: Record<Spacing, string> = {
  none: "",
  sm: "my-3 sm:my-4",
  md: "my-4 sm:my-6",
  lg: "my-6 sm:my-10",
};

/**
 * Reusable hairline divider tuned to the brand palette.
 * Resolves through CSS tokens (`--divider-color`), so global palette
 * changes update every divider in the app.
 *
 * Variants:
 *   - `subtle`  (default) — soft fade at both ends
 *   - `strong`  — slightly more visible mid-tone
 *   - `dashed`  — dashed teal line for inline separators
 */
export function SectionDivider({
  className,
  spacing = "md",
  variant = "subtle",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  spacing?: Spacing;
  variant?: "subtle" | "strong" | "dashed";
}) {
  if (variant === "dashed") {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn(
          "w-full border-t border-dashed",
          SPACING[spacing],
          className,
        )}
        style={{ borderColor: "var(--divider-color)" }}
        {...props}
      />
    );
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        variant === "strong" ? "section-divider opacity-100" : "section-divider opacity-90",
        SPACING[spacing],
        className,
      )}
      style={
        variant === "strong"
          ? { backgroundImage: "linear-gradient(90deg, transparent, var(--divider-strong), transparent)" }
          : undefined
      }
      {...props}
    />
  );
}