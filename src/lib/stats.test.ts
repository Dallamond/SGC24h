import { describe, expect, it } from "vitest";
import { resumir, type PedidoStat } from "./stats";

const base: PedidoStat = {
  estado: "entregado", total: 100, pagado: true, pagado_en: "2026-10-10T10:00:00Z", created_at: "2026-10-05T10:00:00Z",
  fecha_entrega: null, cliente_id: "c1", cliente: "Ana", uds: 5, coste: 40, sinCoste: false,
};
const ahora = new Date("2026-10-15T12:00:00Z");

describe("resumir", () => {
  it("calcula vendido, cobrado y beneficio del mes", () => {
    const r = resumir([base, { ...base, total: 50, coste: 20, pagado: false, pagado_en: null }], ahora);
    expect(r.vendidoMes).toBe(150);
    expect(r.cobradoMes).toBe(100);
    expect(r.beneficioMes).toBe(90);
    expect(r.margenMes).toBe(60);
    expect(r.porCobrar).toBe(50);
    expect(r.ticketMedio).toBe(75);
  });

  it("los posibles y descartados no cuentan como venta", () => {
    const r = resumir([{ ...base, estado: "posible" }, { ...base, estado: "descartado" }], ahora);
    expect(r.vendidoMes).toBe(0);
    expect(r.posibles).toBe(1);
    expect(r.valorPosibles).toBe(100);
  });

  it("la aceptación excluye los posibles aún sin resolver", () => {
    const r = resumir([base, { ...base, estado: "descartado" }, { ...base, estado: "posible" }], ahora);
    expect(r.aceptacion).toBe(50);
  });

  it("el beneficio ignora pedidos sin coste conocido", () => {
    const r = resumir([base, { ...base, total: 80, coste: 0, sinCoste: true }], ahora);
    expect(r.vendidoMes).toBe(180);
    expect(r.beneficioMes).toBe(60);
  });

  it("serie de 6 meses y ranking de clientes", () => {
    const r = resumir([base, { ...base, created_at: "2026-08-02T10:00:00Z", total: 30 }], ahora);
    expect(r.porMes).toHaveLength(6);
    expect(r.porMes[5].vendido).toBe(100);
    expect(r.porMes[3].vendido).toBe(30);
    expect(r.topClientes[0]).toMatchObject({ nombre: "Ana", total: 130, pedidos: 2 });
  });
});
