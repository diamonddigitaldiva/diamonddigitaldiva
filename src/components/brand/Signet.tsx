import { cn } from "@/lib/utils";

interface SignetProps {
  size?: number;
  className?: string;
  withShadow?: boolean;
  animate?: boolean;
}

/** Diamond wordmark; text branding rather than a substitute DDD logo. */
export function Signet({ size = 44, className, animate = false }: SignetProps) {
  return (
    <span
      role="img"
      aria-label="Diamond Digital Diva"
      className={cn(
        "inline-flex items-center justify-center font-heading text-amethyst",
        animate && "animate-fade-up",
        className,
      )}
      style={{
        minWidth: size,
        height: size,
        fontSize: Math.max(14, Math.round(size * 0.4)),
        fontWeight: 600,
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
    >
      Diamond
    </span>
  );
}
