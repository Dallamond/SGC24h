import { TAMANOS_ZONA, calcularPrecio } from "@/lib/pricing";
import type { PedidoLinea } from "@/lib/types";

export interface FilaDesglose { concepto: string; importe: number | null } // null = incluido en el precio

const r2 = (n: number) => Math.round(n * 100) / 100;

// Explica de dónde sale el precio por unidad de una línea (para el recibo): prenda + estampado base,
// cada zona con su recargo y los estampados adicionales. Si el precio se acordó a mano, aparece como ajuste.
export function desglosarLinea(l: PedidoLinea): FilaDesglose[] {
  const tipo = l.tipo ?? "prenda";
  if (tipo === "servicio") return [];
  const zona = (z: PedidoLinea["zonas"][number]) => `${TAMANOS_ZONA[z.tamano].label} · ${TAMANOS_ZONA[z.tamano].medida} (${z.vista})`;

  if (tipo === "solo_estampado" || !l.zonas.length) {
    return [{ concepto: "Estampado DTF (prenda aportada por el cliente)", importe: Number(l.precio_unitario) }, ...l.zonas.map((z) => ({ concepto: zona(z), importe: null }))];
  }

  const c = calcularPrecio(l.zonas, l.cantidad);
  const filas: FilaDesglose[] = [{ concepto: `Prenda + impresión base (${l.cantidad} ${l.cantidad === 1 ? "ud" : "uds"})`, importe: c.pvpBase }];
  l.zonas.forEach((z, i) => {
    if (i === 0) filas.push({ concepto: `Estampado 1: ${zona(z)}`, importe: TAMANOS_ZONA[z.tamano].recargoBase || null });
    else filas.push({ concepto: `Estampado adicional: ${zona(z)}`, importe: TAMANOS_ZONA[z.tamano].masivo ? 3 : 1.5 });
  });
  const ajuste = r2(Number(l.precio_unitario) - c.precioUnitario);
  if (Math.abs(ajuste) >= 0.01) filas.push({ concepto: ajuste < 0 ? "Descuento acordado" : "Ajuste acordado", importe: ajuste });
  return filas;
}
