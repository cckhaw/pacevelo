import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not user content
    <img src="/logo-mark.svg" alt="PaceVelo" width={size} height={size} className={cn("shrink-0", className)} />
  );
}

export function LogoFull({ height = 40, className }: { height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not user content
    <img
      src="/logo-full.svg"
      alt="PaceVelo — Workplace Movement Engine"
      style={{ height }}
      className={cn("w-auto", className)}
    />
  );
}

/** Icon + "PaceVelo" as real text (no baked-in tagline) - for compact nav bars where LogoFull's fixed aspect ratio shrinks the wordmark to the point of illegibility. */
export function LogoInline({ markSize = 32, className }: { markSize?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} className="rounded-md" />
      <span className="text-lg font-extrabold tracking-tight">
        <span className="text-foreground">Pace</span>
        <span className="text-primary">Velo</span>
      </span>
    </span>
  );
}
