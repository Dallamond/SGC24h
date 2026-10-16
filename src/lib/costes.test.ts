import { describe, expect, it } from "vitest";
import { calcularCoste, costeDtf, medidaZona, PARAMS_POR_DEFECTO as P, zonaPorArea } from "./costes";

describe("costes", () => {
  it("un diseño normal grande (15×25) cuesta ≈0,80 € de lámina", () => {
    expect(costeDtf({ ancho: 15, alto: 25 }, P)).toBeCloseTo(0.8, 1);
  });
  it("lee las medidas de las zonas", () => {
    expect(medidaZona("masivo")).toEqual({ ancho: 35, alto: 40 });
    expect(zonaPorArea({ ancho: 20, alto: 25 })).toBe("masivo");
    expect(zonaPorArea({ ancho: 10, alto: 10 })).toBe("pecho-izq-pequeno");
  });
  it("camiseta 220 con diseño 15×25: coste ≈7,74 € y recomendado = tarifa 18,75 €", () => {
    const r = calcularCoste({ precioPrenda: 6.44, disenos: [{ ancho: 15, alto: 25 }], unidades: 1 });
    expect(r.costeUd).toBeCloseTo(7.74, 1);
    expect(r.tarifaUd).toBe(18.75);
    expect(r.recomendadoUd).toBe(18.75);
    expect(r.tarifaBaja).toBe(false);
  });
  it("solo estampado: sin coste de prenda y tarifa de solo estampado", () => {
    const r = calcularCoste({ precioPrenda: null, disenos: [{ ancho: 10, alto: 10 }], unidades: 1 });
    expect(r.costePrenda).toBe(0);
    expect(r.tarifaUd).toBe(12);
  });
  it("si la tarifa no llega al margen, recomienda el mínimo", () => {
    const r = calcularCoste({ precioPrenda: 12, disenos: [{ ancho: 10, alto: 10 }], unidades: 10 });
    expect(r.tarifaBaja).toBe(true);
    expect(r.recomendadoUd).toBe(r.minimoUd);
    expect(r.margen).toBeGreaterThanOrEqual(0.5);
  });
  it("sin diseños no hay tarifa", () => {
    expect(calcularCoste({ precioPrenda: 5, disenos: [], unidades: 2 }).tarifaUd).toBeNull();
  });
});
