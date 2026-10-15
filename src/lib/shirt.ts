import type { TamanoZona, ZonaPedido } from "@/lib/pricing";

// Silueta de camiseta de la web de Camis24h (viewBox 0 0 243.9 229.9) y zonas de impresión
// aproximadas sobre ella (mismos rectángulos que el configurador de la web).
export const SHIRT_VIEWBOX = "-6 -6 255.9 241.9";
export const SHIRT_MATRIX = "matrix(.13333 0 0 -.13333 0 229.933)";

export const SHIRT_BODY =
  "m1712.09 1139.07 107.89 343.29-407.05 177.17-310.17 49.65c-42.29-44.14-110.947-72.33-188.205-72.33-76.61 0-145.282 28.19-188.192 72.33l-310.773-49.65L9.176 1482.36l107.879-343.29s177.168-5.52 229.883-49.66c0 0 35.546-602.555-25.137-1081.91H1507.35c-61.31 479.355-25.14 1081.91-25.14 1081.91 52.71 44.14 229.88 49.66 229.88 49.66z";
export const SHIRT_SEAMS =
  "M1412.93 1659.53s-80.29-257.46 69.28-570.12m310.78 403.36-112.17-356.13Zm-1377.4 166.76s80.305-257.46-68.652-570.12";
export const SHIRT_COLLAR =
  "M914.555 1636.85c77.258 0 145.915 28.19 188.205 72.33l-44.74 7.35c-35.56-26.98-86.434-43.52-143.465-43.52-56.375 0-107.266 16.54-143.426 43.52l-44.766-7.35c42.91-44.14 111.582-72.33 188.192-72.33z";

export const ZONA_RECT: Record<TamanoZona, { x: number; y: number; w: number; h: number }> = {
  "pecho-izq-pequeno": { x: 76, y: 48, w: 26, h: 26 },
  "pecho-izq-grande": { x: 76, y: 48, w: 39, h: 39 },
  "normal-pequeno": { x: 91, y: 55, w: 60, h: 45 },
  "normal-grande": { x: 84, y: 55, w: 75, h: 45 },
  manga: { x: 205, y: 42, w: 26, h: 26 },
  masivo: { x: 76, y: 40, w: 91, h: 104 },
};

export type ColorPrenda = "blanco" | "negro" | "gris";

export const COLOR_FILL: Record<ColorPrenda, string> = { blanco: "#FAF7EF", negro: "#232423", gris: "#9A9C9B" };

export function colorDe(texto: string): ColorPrenda {
  const t = texto.toLowerCase();
  if (t.includes("negr")) return "negro";
  if (t.includes("gris")) return "gris";
  return "blanco";
}

// Las zonas se dibujan sobre la silueta; la espalda usa la misma forma con sus propios estampados.
export const zonasDe = (zonas: ZonaPedido[], vista: "delante" | "espalda") => zonas.filter((z) => z.vista === vista);
