import { describe, expect, it } from "vitest";
import { calcularPrecio } from "./pricing";

const z = (tamano: Parameters<typeof calcularPrecio>[0][0]["tamano"]) => ({ tamano, vista: "delante" as const });

describe("calcularPrecio", () => {
  it("1 ud con diseño pequeño = 18 €", () => {
    expect(calcularPrecio([z("pecho-izq-pequeno")], 1).precioUnitario).toBe(18);
  });

  it("recargo del primer diseño según zona (tabla de la vault, 1 ud)", () => {
    expect(calcularPrecio([z("pecho-izq-grande")], 1).precioUnitario).toBe(18.25);
    expect(calcularPrecio([z("normal-pequeno")], 1).precioUnitario).toBe(18.5);
    expect(calcularPrecio([z("normal-grande")], 1).precioUnitario).toBe(18.75);
    expect(calcularPrecio([z("masivo")], 1).precioUnitario).toBe(21);
  });

  it("tramos de cantidad", () => {
    const zonas = [z("manga")];
    expect(calcularPrecio(zonas, 3).precioUnitario).toBe(17);
    expect(calcularPrecio(zonas, 5).precioUnitario).toBe(16);
    expect(calcularPrecio(zonas, 10).precioUnitario).toBe(15);
    expect(calcularPrecio(zonas, 50).precioUnitario).toBe(15);
  });

  it("diseños adicionales: +1,50 normal, +3 masivo", () => {
    const r = calcularPrecio([z("manga"), z("normal-grande"), z("masivo")], 1);
    expect(r.recargoExtras).toBe(4.5);
    expect(r.precioUnitario).toBe(22.5);
  });

  it("total = unitario × unidades", () => {
    expect(calcularPrecio([z("masivo")], 10).precioTotal).toBe(180);
  });

  it("sin zonas lanza error", () => {
    expect(() => calcularPrecio([], 1)).toThrow();
  });
});
