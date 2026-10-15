// Precios de Camis24h — sistema cerrado con Nasser el 10/07/2026, revisado el 29/07/2026
// (ver "Precios y Márgenes" en la vault). Misma lógica que la web, con el recargo
// por zona del PRIMER diseño. El total propuesto siempre se puede corregir a mano.

export type TamanoZona =
  | "pecho-izq-pequeno"
  | "pecho-izq-grande"
  | "normal-pequeno"
  | "normal-grande"
  | "manga"
  | "masivo";

export type Vista = "delante" | "espalda";

export interface ZonaPedido {
  tamano: TamanoZona;
  vista: Vista;
}

export const TAMANOS_ZONA: Record<
  TamanoZona,
  { label: string; medida: string; masivo: boolean; recargoBase: number }
> = {
  "pecho-izq-pequeno": { label: "Pecho izquierdo (pequeño)", medida: "10×10 cm", masivo: false, recargoBase: 0 },
  manga: { label: "Manga", medida: "10×10 cm", masivo: false, recargoBase: 0 },
  "pecho-izq-grande": { label: "Pecho izquierdo (grande)", medida: "15×15 cm", masivo: false, recargoBase: 0.25 },
  "normal-pequeno": { label: "Normal (pequeño)", medida: "15×20 cm", masivo: false, recargoBase: 0.5 },
  "normal-grande": { label: "Normal (grande)", medida: "15×25 cm", masivo: false, recargoBase: 0.75 },
  masivo: { label: "Masivo", medida: "35×40 cm", masivo: true, recargoBase: 3 },
};

const PVP_BASE = [
  { min: 1, max: 1, pvp: 18 },
  { min: 2, max: 4, pvp: 17 },
  { min: 5, max: 9, pvp: 16 },
  { min: 10, max: Infinity, pvp: 15 }, // suelo
];

const RECARGO_EXTRA_NORMAL = 1.5;
const RECARGO_EXTRA_MASIVO = 3;

const redondear = (n: number) => Math.round(n * 100) / 100;

export interface PrecioLinea {
  pvpBase: number;
  recargoPrimero: number;
  recargoExtras: number;
  precioUnitario: number;
  precioTotal: number;
}

export function calcularPrecio(zonas: ZonaPedido[], cantidad: number): PrecioLinea {
  if (zonas.length === 0) throw new Error("Selecciona al menos una zona de impresión");

  const uds = Math.max(1, Math.floor(cantidad));
  const tramo = PVP_BASE.find((t) => uds >= t.min && uds <= t.max)!;

  const recargoPrimero = TAMANOS_ZONA[zonas[0].tamano].recargoBase;
  const recargoExtras = zonas
    .slice(1)
    .reduce((s, z) => s + (TAMANOS_ZONA[z.tamano].masivo ? RECARGO_EXTRA_MASIVO : RECARGO_EXTRA_NORMAL), 0);

  const precioUnitario = redondear(tramo.pvp + recargoPrimero + recargoExtras);
  return {
    pvpBase: tramo.pvp,
    recargoPrimero,
    recargoExtras,
    precioUnitario,
    precioTotal: redondear(precioUnitario * uds),
  };
}

// Solo estampado (el cliente trae la prenda): precio sugerido = precio con prenda − lo que cuesta/vale la prenda.
// ⚠️ Valor PROVISIONAL, sin validar con Nasser (la prenda cuesta ~6,44 € a coste). Siempre se puede corregir a mano.
export const AHORRO_PRENDA_PROPIA = 6;

export function calcularSoloEstampado(zonas: ZonaPedido[], cantidad: number): number {
  const conPrenda = calcularPrecio(zonas, cantidad).precioUnitario;
  return Math.max(0, redondear(conPrenda - AHORRO_PRENDA_PROPIA));
}

export const SERVICIOS_SUGERIDOS = ["Digitalización de diseño", "Diseño desde cero", "Retoque / quitar fondo", "Maquetación de plancha"];
