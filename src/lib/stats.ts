// Estadísticas del negocio, calculadas a partir de los pedidos. Función pura: fácil de probar.
export interface PedidoStat {
  estado: "posible" | "aprobado" | "diseno" | "produccion" | "listo" | "entregado" | "descartado";
  total: number;
  cobrado: number; // suma de los cobros registrados del pedido
  created_at: string;
  fecha_entrega: string | null;
  cliente_id: string | null;
  cliente: string | null;
  uds: number;
  coste: number; // suma de coste_unitario × cantidad de las líneas con coste conocido
  sinCoste: boolean; // alguna línea no tiene coste
}

export interface PagoStat {
  importe: number;
  fecha: string; // YYYY-MM-DD
}

export interface GastoStat {
  importe: number;
  fecha: string; // YYYY-MM-DD
}

export interface Resumen {
  activos: number;          // aprobado → listo
  posibles: number;
  valorPosibles: number;
  porCobrar: number;        // pedidos aceptados: total − lo ya cobrado
  vendidoMes: number;
  cobradoMes: number;       // cobros registrados este mes
  gastosMes: number;
  resultadoMes: number;     // cobrado − gastos (caja del mes)
  beneficioMes: number;     // estimado, solo pedidos con coste conocido
  margenMes: number | null; // %
  ticketMedio: number | null;
  udsMes: number;
  udsTotal: number;         // prendas vendidas desde el principio
  aceptacion: number | null; // % de presupuestos resueltos que se aceptaron
  porMes: { mes: string; etiqueta: string; vendido: number }[]; // últimos 6 meses
  topClientes: { id: string; nombre: string; total: number; pedidos: number }[];
  entregasProximas: PedidoStat[];
}

const aceptado = (e: PedidoStat["estado"]) => !["posible", "descartado"].includes(e);
const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function resumir(pedidos: PedidoStat[], ahora = new Date(), pagos: PagoStat[] = [], gastos: GastoStat[] = []): Resumen {
  const mesActual = claveMes(ahora);
  const aceptados = pedidos.filter((p) => aceptado(p.estado));

  const delMes = aceptados.filter((p) => claveMes(new Date(p.created_at)) === mesActual);
  const vendidoMes = delMes.reduce((s, p) => s + p.total, 0);
  const cobradoMes = pagos.filter((p) => p.fecha.slice(0, 7) === mesActual).reduce((s, p) => s + p.importe, 0);
  const gastosMes = gastos.filter((g) => g.fecha.slice(0, 7) === mesActual).reduce((s, g) => s + g.importe, 0);

  const conCoste = delMes.filter((p) => !p.sinCoste);
  const ingresoConCoste = conCoste.reduce((s, p) => s + p.total, 0);
  const beneficioMes = ingresoConCoste - conCoste.reduce((s, p) => s + p.coste, 0);

  const resueltos = pedidos.filter((p) => p.estado !== "posible");
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    return { mes: claveMes(d), etiqueta: MESES[d.getMonth()], vendido: 0 };
  });
  for (const p of aceptados) {
    const m = meses.find((x) => x.mes === claveMes(new Date(p.created_at)));
    if (m) m.vendido += p.total;
  }

  const porCliente = new Map<string, { id: string; nombre: string; total: number; pedidos: number }>();
  for (const p of aceptados) {
    if (!p.cliente_id) continue;
    const c = porCliente.get(p.cliente_id) ?? { id: p.cliente_id, nombre: p.cliente ?? "—", total: 0, pedidos: 0 };
    c.total += p.total;
    c.pedidos += 1;
    porCliente.set(p.cliente_id, c);
  }

  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const entregasProximas = pedidos
    .filter((p) => p.fecha_entrega && ["aprobado", "diseno", "produccion", "listo"].includes(p.estado))
    .sort((a, b) => a.fecha_entrega!.localeCompare(b.fecha_entrega!))
    .filter((p) => new Date(p.fecha_entrega!).getTime() >= hoy - 7 * 864e5)
    .slice(0, 5);

  return {
    activos: pedidos.filter((p) => ["aprobado", "diseno", "produccion", "listo"].includes(p.estado)).length,
    posibles: pedidos.filter((p) => p.estado === "posible").length,
    valorPosibles: pedidos.filter((p) => p.estado === "posible").reduce((s, p) => s + p.total, 0),
    porCobrar: aceptados.reduce((s, p) => s + Math.max(0, p.total - p.cobrado), 0),
    vendidoMes,
    cobradoMes,
    gastosMes,
    resultadoMes: cobradoMes - gastosMes,
    beneficioMes,
    margenMes: ingresoConCoste > 0 ? (beneficioMes / ingresoConCoste) * 100 : null,
    ticketMedio: delMes.length ? vendidoMes / delMes.length : null,
    udsMes: delMes.reduce((s, p) => s + p.uds, 0),
    udsTotal: aceptados.reduce((s, p) => s + p.uds, 0),
    aceptacion: resueltos.length ? (aceptados.length / resueltos.length) * 100 : null,
    porMes: meses,
    topClientes: [...porCliente.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    entregasProximas,
  };
}
