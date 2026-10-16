import { describe, expect, it } from "vitest";
import { desglosarLinea } from "./desglose";
import type { PedidoLinea } from "./types";

const base: PedidoLinea = { prenda_id: null, descripcion: "Camiseta", tallas: {}, cantidad: 1, zonas: [], precio_unitario: 0, precio_calculado: 0 };

describe("desglosarLinea", () => {
  it("la suma del desglose es el precio unitario", () => {
    const l: PedidoLinea = { ...base, cantidad: 3, zonas: [{ tamano: "normal-grande", vista: "delante" }, { tamano: "masivo", vista: "espalda" }], precio_unitario: 20.75 };
    const f = desglosarLinea(l);
    expect(f.reduce((s, x) => s + (x.importe ?? 0), 0)).toBeCloseTo(20.75, 2);
    expect(f[0].importe).toBe(17);
  });
  it("muestra el ajuste cuando el precio se cambió a mano", () => {
    const f = desglosarLinea({ ...base, zonas: [{ tamano: "manga", vista: "delante" }], precio_unitario: 15 });
    expect(f.at(-1)).toEqual({ concepto: "Descuento acordado", importe: -3 });
  });
  it("solo estampado y servicio", () => {
    expect(desglosarLinea({ ...base, tipo: "servicio", precio_unitario: 15 })).toEqual([]);
    expect(desglosarLinea({ ...base, tipo: "solo_estampado", zonas: [{ tamano: "manga", vista: "delante" }], precio_unitario: 12 })[0].importe).toBe(12);
  });
});
