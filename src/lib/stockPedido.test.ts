import { describe, expect, it } from "vitest";
import { planificarDescuento, type LineaStock } from "./stockPedido";

const stock: LineaStock[] = [
  { id: "a", prenda_id: "p1", talla: "M", color: "negro", cantidad: 9 },
  { id: "b", prenda_id: "p1", talla: "L", color: "negro", cantidad: 2 },
  { id: "c", prenda_id: "p1", talla: "M", color: "blanco", cantidad: 10 },
];

describe("planificarDescuento", () => {
  it("resta por talla y color", () => {
    const r = planificarDescuento([{ prenda_id: "p1", color: "Negro", tallas: { M: 3, L: 1 } }], stock);
    expect(r.movimientos).toEqual([{ linea_id: "a", unidades: 3 }, { linea_id: "b", unidades: 1 }]);
    expect(r.faltas).toEqual([]);
  });

  it("suma varias líneas del mismo pedido sobre la misma línea de stock", () => {
    const r = planificarDescuento([
      { prenda_id: "p1", color: "negro", tallas: { M: 4 } },
      { prenda_id: "p1", color: "negro", tallas: { M: 5 } },
    ], stock);
    expect(r.movimientos).toEqual([{ linea_id: "a", unidades: 9 }]);
  });

  it("si no hay suficiente, descuenta lo que hay y avisa", () => {
    const r = planificarDescuento([{ prenda_id: "p1", color: "negro", tallas: { L: 5 } }], stock);
    expect(r.movimientos).toEqual([{ linea_id: "b", unidades: 2 }]);
    expect(r.faltas).toHaveLength(1);
  });

  it("avisa de líneas sin prenda y de tallas inexistentes", () => {
    const r = planificarDescuento([
      { prenda_id: null, color: null, tallas: { M: 1 } },
      { prenda_id: "p1", color: "blanco", tallas: { XL: 1 } },
    ], stock);
    expect(r.movimientos).toEqual([]);
    expect(r.faltas).toHaveLength(2);
  });
});
