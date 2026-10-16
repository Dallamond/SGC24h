// Calculadora de coste de producción. Parámetros de "Precios y Márgenes" (10/07/2026):
// lámina DTF 55×100 cm = 10 €, planchado ≈ 0,50 €. Todo se puede cambiar en la pantalla.
import { calcularPrecio, calcularSoloEstampado, TAMANOS_ZONA, type TamanoZona, type ZonaPedido } from "@/lib/pricing";

export interface ParamsCoste {
  laminaEur: number;
  laminaCm2: number;
  /** Parte útil de la lámina (huecos y márgenes entre diseños se pierden). 0.85 reproduce los ≈0,80 € de un diseño normal. */
  aprovechamiento: number;
  planchadoEur: number;
  /** Margen mínimo sobre el precio de venta (0.5 = 50 %). */
  margenObjetivo: number;
}

export const PARAMS_POR_DEFECTO: ParamsCoste = { laminaEur: 10, laminaCm2: 55 * 100, aprovechamiento: 0.85, planchadoEur: 0.5, margenObjetivo: 0.5 };

export interface Diseno { ancho: number; alto: number }

export interface EntradaCoste {
  /** Precio de compra de la prenda; null = la trae el cliente (solo estampado). */
  precioPrenda: number | null;
  disenos: Diseno[];
  unidades: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const aMedioEuro = (n: number) => Math.ceil(n * 2 - 1e-9) / 2;

/** Medidas (cm) de una zona del catálogo, a partir de su texto «15×25 cm». */
export function medidaZona(t: TamanoZona): Diseno {
  const [ancho, alto] = TAMANOS_ZONA[t].medida.replace(/[^\d×]/g, "").split("×").map(Number);
  return { ancho, alto };
}

/** Zona del catálogo que corresponde a un diseño por su área (para aplicar la tarifa oficial). */
export function zonaPorArea(d: Diseno): TamanoZona {
  const a = d.ancho * d.alto;
  if (a <= 100) return "pecho-izq-pequeno";
  if (a <= 225) return "pecho-izq-grande";
  if (a <= 300) return "normal-pequeno";
  if (a <= 375) return "normal-grande";
  return "masivo";
}

export function costeDtf(d: Diseno, p: ParamsCoste): number {
  const util = Math.max(0.1, Math.min(1, p.aprovechamiento));
  return r2(((d.ancho * d.alto) / util) * (p.laminaEur / p.laminaCm2));
}

export interface ResultadoCoste {
  costePrenda: number;
  costeDtf: number;
  costePlanchado: number;
  costeUd: number;
  /** Tarifa oficial de Camis24h por unidad (null si no hay diseños). */
  tarifaUd: number | null;
  /** Precio mínimo por unidad para llegar al margen objetivo. */
  minimoUd: number;
  /** Lo que se debería cobrar por unidad: el mayor entre tarifa y mínimo, a múltiplos de 0,50 €. */
  recomendadoUd: number;
  beneficioUd: number;
  margen: number;
  totalPedido: number;
  beneficioPedido: number;
  /** true si la tarifa oficial no llega al margen objetivo. */
  tarifaBaja: boolean;
}

export function calcularCoste(e: EntradaCoste, p: ParamsCoste = PARAMS_POR_DEFECTO): ResultadoCoste {
  const uds = Math.max(1, Math.floor(e.unidades || 1));
  const validos = e.disenos.filter((d) => d.ancho > 0 && d.alto > 0);
  const costePrenda = e.precioPrenda ?? 0;
  const dtf = r2(validos.reduce((s, d) => s + costeDtf(d, p), 0));
  const costeUd = r2(costePrenda + dtf + p.planchadoEur);

  const zonas: ZonaPedido[] = validos.map((d) => ({ tamano: zonaPorArea(d), vista: "delante" }));
  const tarifaUd = zonas.length ? (e.precioPrenda === null ? calcularSoloEstampado(zonas, uds) : calcularPrecio(zonas, uds).precioUnitario) : null;
  const minimoUd = aMedioEuro(costeUd / (1 - Math.min(0.95, Math.max(0, p.margenObjetivo))));
  const recomendadoUd = Math.max(tarifaUd ?? 0, minimoUd);
  const beneficioUd = r2(recomendadoUd - costeUd);
  return {
    costePrenda, costeDtf: dtf, costePlanchado: p.planchadoEur, costeUd, tarifaUd, minimoUd, recomendadoUd, beneficioUd,
    margen: recomendadoUd > 0 ? beneficioUd / recomendadoUd : 0,
    totalPedido: r2(recomendadoUd * uds), beneficioPedido: r2(beneficioUd * uds),
    tarifaBaja: tarifaUd !== null && tarifaUd < minimoUd,
  };
}
