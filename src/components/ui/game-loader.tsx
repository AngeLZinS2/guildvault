import { cn } from "@/lib/utils";

export function GameLoader({ label = "Preparando sua operação...", inline = false }: { label?: string; inline?: boolean }) {
  return <span className={cn("game-loading", inline && "game-loading-inline")} role="status" aria-live="polite"><span className="uiverse-loader" aria-hidden="true" /><span>{label}</span></span>;
}
