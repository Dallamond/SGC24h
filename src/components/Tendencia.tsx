import { cn } from "@/lib/utils";

// Flecha verde/roja con el cambio respecto al mes pasado. `masEsMalo`: para gastos, subir es rojo.
export function Tendencia({ actual, anterior, masEsMalo = false, claro = false }: { actual: number; anterior: number; masEsMalo?: boolean; claro?: boolean }) {
  if (anterior <= 0 && actual <= 0) return null;
  if (anterior <= 0) return <span className={cn("text-xs font-semibold", claro ? "text-white/80" : "text-ink/50")}>nuevo este mes</span>;
  const pct = ((actual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.5) return <span className={cn("text-xs font-semibold", claro ? "text-white/80" : "text-ink/50")}>= igual que el mes pasado</span>;

  const sube = pct > 0;
  const bueno = sube !== masEsMalo;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", claro ? (bueno ? "text-emerald-200" : "text-rose-200") : bueno ? "text-emerald-600" : "text-rose-600")}>
      <svg viewBox="0 0 12 12" className={cn("h-3 w-3 animate-pop", !sube && "rotate-180")} fill="currentColor" aria-hidden><path d="M6 1.5l5 7H1z" /></svg>
      {sube ? "+" : "−"}{Math.abs(pct).toFixed(0)} %
      <span className={cn("font-medium", claro ? "text-white/70" : "text-ink/40")}>vs mes pasado</span>
    </span>
  );
}
