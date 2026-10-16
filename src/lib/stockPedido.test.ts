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

import { preverFaltas } from "./stockPedido";

describe("preverFaltas", () => {
  it("suma la demanda de varios pedidos y avisa de lo que no llega", () => {
    const stock = [{ id: "s1", prenda_id: "p", talla: "M", color: "negro", cantidad: 3, nombre_oficial: "Camiseta 190" }];
    const f = preverFaltas([{ prenda_id: "p", color: "Negro", tallas: { M: 2 } }, { prenda_id: "p", color: "negro", tallas: { M: 4 } }], stock);
    expect(f).toEqual([{ nombre: "Camiseta 190", color: "negro", talla: "M", necesito: 6, hay: 3, falta: 3 }]);
    expect(preverFaltas([{ prenda_id: "p", color: "negro", tallas: { M: 3 } }], stock)).toEqual([]);
  });
});
