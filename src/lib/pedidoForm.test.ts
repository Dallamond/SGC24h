import { describe, expect, it } from "vitest";
import { lineaAForm } from "./pedidoForm";
import type { PedidoLinea } from "./types";

const base: PedidoLinea = {
  tipo: "prenda", prenda_id: "p1", color: "negro", descripcion: "Camiseta 220 g/m² · 220 g · negro",
  tallas: { M: 2 }, cantidad: 2, zonas: [{ tamano: "masivo", vista: "delante" }], precio_unitario: 20, precio_calculado: 20,
};

describe("lineaAForm", () => {
  it("prenda de inventario: conserva prenda, color y tallas; sin precio manual si coincide", () => {
    const f = lineaAForm(base);
    expect(f).toMatchObject({ tipo: "prenda", prendaId: "p1", color: "negro", libre: "", precioManual: "" });
    expect(f.tallas).toEqual({ M: 2 });
  });

  it("precio corregido a mano se conserva como manual", () => {
    expect(lineaAForm({ ...base, precio_unitario: 17.5 }).precioManual).toBe("17.5");
  });

  it("prenda fuera de inventario: separa descripción y color", () => {
    const f = lineaAForm({ ...base, prenda_id: null, descripcion: "Sudadera vintage · gris", color: "gris" });
    expect(f).toMatchObject({ prendaId: "libre", libre: "Sudadera vintage", color: "gris" });
  });

  it("solo estampado y servicio", () => {
    expect(lineaAForm({ ...base, tipo: "solo_estampado", prenda_id: null, color: null, descripcion: "Solo estampado · Camiseta del cliente", tallas: {} }).libre).toBe("Camiseta del cliente");
    const s = lineaAForm({ ...base, tipo: "servicio", prenda_id: null, color: null, descripcion: "Digitalización", tallas: {}, zonas: [], precio_unitario: 15, precio_calculado: 0 });
    expect(s).toMatchObject({ prendaId: "", libre: "Digitalización", precioManual: "15", unidades: "2" });
  });
});

import { lineaDesdeCalculadora } from "./pedidoForm";

describe("lineaDesdeCalculadora", () => {
  const prendas = [{ id: "p1", colores: ["negro"] }, { id: "p2", colores: ["blanco", "negro"] }];
  it("monta una línea de prenda con zonas, unidades y precio", () => {
    const l = lineaDesdeCalculadora({ prenda: "p1", propia: false, uds: "5", zonas: "masivo,manga,raro", precio: "19.5" }, prendas).lineas[0];
    expect(l).toMatchObject({ tipo: "prenda", prendaId: "p1", color: "negro", unidades: "5", precioManual: "19.5" });
    expect(l.zonas.map((z) => z.tamano)).toEqual(["masivo", "manga"]);
  });
  it("si la trae el cliente es solo estampado; sin color si hay varios", () => {
    expect(lineaDesdeCalculadora({ propia: true }, prendas).lineas[0].tipo).toBe("solo_estampado");
    expect(lineaDesdeCalculadora({ prenda: "p2", propia: false }, prendas).lineas[0].color).toBe("");
  });
});
