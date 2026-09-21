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
