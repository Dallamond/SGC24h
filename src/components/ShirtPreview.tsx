import { COLOR_FILL, SHIRT_BODY, SHIRT_COLLAR, SHIRT_MATRIX, SHIRT_SEAMS, SHIRT_VIEWBOX, ZONA_RECT, zonasDe, type ColorPrenda } from "@/lib/shirt";
import type { ZonaPedido } from "@/lib/pricing";

// Camiseta con las zonas de estampado marcadas en rojo (delante y/o espalda).
export function ShirtPreview({ zonas, color, className }: { zonas: ZonaPedido[]; color: ColorPrenda; className?: string }) {
  const vistas = (["delante", "espalda"] as const).filter((v) => zonasDe(zonas, v).length > 0);
  if (!vistas.length) return null;
  return (
    <div className={className ?? "flex gap-3"}>
      {vistas.map((v) => (
        <figure key={v} className="text-center">
          <svg viewBox={SHIRT_VIEWBOX} className="h-32 w-auto">
            <g transform={SHIRT_MATRIX}>
              <path d={SHIRT_BODY} fill={COLOR_FILL[color]} stroke="#1A1B1B" strokeWidth={15} />
              <path d={SHIRT_SEAMS} fill="none" stroke="#1A1B1B" strokeWidth={15} />
              <path d={SHIRT_COLLAR} fill={COLOR_FILL[color]} stroke="#1A1B1B" strokeWidth={15} />
            </g>
            {zonasDe(zonas, v).map((z, i) => {
              const r = ZONA_RECT[z.tamano];
              return <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#C1502E" fillOpacity={0.55} stroke="#C1502E" strokeWidth={1.5} strokeDasharray="4 2" />;
            })}
          </svg>
          <figcaption className="text-xs font-semibold uppercase text-ink/50">{v}</figcaption>
        </figure>
      ))}
    </div>
  );
}
