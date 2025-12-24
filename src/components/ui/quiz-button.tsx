import * as React from "react";
import { cn } from "@/lib/utils";

interface QuizButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

const QuizButton = React.forwardRef<HTMLButtonElement, QuizButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "rounded-lg px-5 py-3 font-body font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
          variant === "ghost" && "bg-transparent text-foreground border border-border hover:bg-secondary",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

QuizButton.displayName = "QuizButton";

export { QuizButton };
