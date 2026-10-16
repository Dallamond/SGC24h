import { describe, expect, it } from "vitest";
import { resumir, type PedidoStat } from "./stats";

const base: PedidoStat = {
  estado: "entregado", total: 100, cobrado: 100, created_at: "2026-10-05T10:00:00Z",
  fecha_entrega: null, cliente_id: "c1", cliente: "Ana", uds: 5, coste: 40, sinCoste: false,
};
const ahora = new Date("2026-10-15T12:00:00Z");

describe("resumir", () => {
  it("calcula vendido, cobrado y beneficio del mes", () => {
    const r = resumir(
      [base, { ...base, total: 50, coste: 20, cobrado: 0 }],
      ahora,
      [{ importe: 100, fecha: "2026-10-10" }],
    );
    expect(r.vendidoMes).toBe(150);
    expect(r.cobradoMes).toBe(100);
    expect(r.beneficioMes).toBe(90);
    expect(r.margenMes).toBe(60);
    expect(r.porCobrar).toBe(50);
    expect(r.ticketMedio).toBe(75);
    expect(r.udsMes).toBe(10);
  });

  it("los anticipos reducen lo que queda por cobrar", () => {
    const r = resumir([{ ...base, total: 100, cobrado: 30 }], ahora, [{ importe: 30, fecha: "2026-10-02" }]);
    expect(r.porCobrar).toBe(70);
    expect(r.cobradoMes).toBe(30);
  });

  it("el cobrado de otros meses no cuenta en el mes actual", () => {
    const r = resumir([base], ahora, [{ importe: 60, fecha: "2026-09-28" }, { importe: 40, fecha: "2026-10-01" }]);
    expect(r.cobradoMes).toBe(40);
  });

  it("gastos del mes y resultado de caja", () => {
    const r = resumir([base], ahora, [{ importe: 100, fecha: "2026-10-10" }], [{ importe: 35, fecha: "2026-10-03" }, { importe: 500, fecha: "2026-09-03" }]);
    expect(r.gastosMes).toBe(35);
    expect(r.resultadoMes).toBe(65);
  });

  it("cuenta las prendas vendidas del mes y en total", () => {
    const r = resumir([base, { ...base, created_at: "2026-08-02T10:00:00Z", uds: 7 }, { ...base, estado: "posible", uds: 99 }], ahora);
    expect(r.udsMes).toBe(5);
    expect(r.udsTotal).toBe(12);
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

describe("mes anterior", () => {
  it("separa lo vendido el mes pasado para las tendencias", () => {
    const p = (created_at: string, total: number) => ({ estado: "entregado" as const, total, cobrado: total, created_at, fecha_entrega: null, cliente_id: null, cliente: null, uds: 2, coste: 10, sinCoste: false });
    const r = resumir([p("2026-09-10T10:00:00Z", 100), p("2026-10-05T10:00:00Z", 150)], new Date("2026-10-16T12:00:00Z"));
    expect(r.anterior).toMatchObject({ vendido: 100, uds: 2, beneficio: 90 });
    expect(r.vendidoMes).toBe(150);
  });
});
