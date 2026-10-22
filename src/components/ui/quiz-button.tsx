import * as React from "react";
import { cn } from "@/lib/utils";

type QuizButtonVariant = "primary" | "ghost" | "outline";

interface QuizButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: QuizButtonVariant;
}

/** Shared classes so links can look like QuizButtons without nesting a button in a link. */
export function quizButtonClasses(variant: QuizButtonVariant = "primary", className?: string) {
  return cn(
    "relative overflow-hidden inline-flex items-center justify-center font-body font-semibold uppercase text-center",
    "text-[11px] tracking-[0.25em] px-7 py-4 rounded-sm transition-all duration-300",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amethyst focus-visible:ring-offset-2",
    variant === "primary" &&
      "bg-amethyst text-pearl shadow-soft hover:bg-amethyst-deep hover:shadow-editorial hover:-translate-y-0.5",
    variant === "outline" &&
      "bg-transparent text-amethyst border border-amethyst hover:bg-amethyst hover:text-pearl",
    variant === "ghost" &&
      "bg-transparent text-charcoal border border-border hover:border-amethyst hover:text-amethyst",
    className
  );
}

const QuizButton = React.forwardRef<HTMLButtonElement, QuizButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    return (
      <button ref={ref} className={quizButtonClasses(variant, className)} {...props}>
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

QuizButton.displayName = "QuizButton";

export { QuizButton };
