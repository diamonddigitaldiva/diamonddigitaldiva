import { cn } from "@/lib/utils";

interface SignetProps {
  size?: number;
  className?: string;
  withShadow?: boolean;
  animate?: boolean;
}

/**
 * The Signet — Diamond Digital Diva mark.
 * A 45°-rotated amethyst square with a thin gold inner border,
 * "DDD" in Cinzel set upright at the center.
 */
export function Signet({ size = 44, className, withShadow = true, animate = false }: SignetProps) {
  const inset = Math.max(4, Math.round(size * 0.08));
  const fontSize = Math.max(8, Math.round(size * 0.22));
  return (
    <div
      role="img"
      aria-label="Diamond Digital Diva"
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(animate && "animate-signet-in")}
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(var(--amethyst))",
          transform: "rotate(45deg)",
          boxShadow: withShadow ? "var(--signet-shadow)" : undefined,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          border: "1px solid hsl(var(--gold))",
          transform: "rotate(45deg)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Cinzel, serif",
          fontWeight: 600,
          fontSize,
          letterSpacing: "0.12em",
          color: "hsl(var(--gold))",
          lineHeight: 1,
          paddingLeft: "0.06em",
        }}
      >
        DDD
      </div>
    </div>
  );
}
