import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { resumir, type GastoStat, type PagoStat, type PedidoStat } from "@/lib/stats";
import { ESTADO_LABEL, refPedido, type Estado } from "@/lib/types";
import { eur, cn } from "@/lib/utils";
import { completarTarea } from "./tareas/actions";
import { PlancharBoton } from "@/components/PlancharBoton";
import { NumeroAnimado } from "@/components/NumeroAnimado";
import { Tendencia } from "@/components/Tendencia";
import { AvisoCopia } from "@/components/AvisoCopia";
import { costeRealLinea } from "@/lib/costes";
import { preverFaltas } from "@/lib/stockPedido";
import type { TamanoZona } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type PagoConPedido = PagoStat & { pedido_id: string };

interface FilaPedido {
  id: string; numero: number; estado: Estado; total: number; pagado: boolean; pagado_en: string | null; created_at: string;
  fecha_entrega: string | null; cliente_id: string | null;
  sg_clientes: { nombre: string } | null;
  stock_descontado: boolean;
  sg_pedido_lineas: { tipo: "prenda" | "solo_estampado" | "servicio"; cantidad: number; coste_unitario: number | null; prenda_id: string | null; color: string | null; tallas: Record<string, number>; zonas: { tamano: TamanoZona }[] }[];
}

type KpiProps = { titulo: string; valor: number; formato?: "eur" | "int"; sub?: React.ReactNode; tono?: "bueno" | "malo"; tendencia?: React.ReactNode; destacado?: boolean; i?: number };

function Kpi({ titulo, valor, formato = "eur", sub, tono, tendencia, destacado, i = 0 }: KpiProps) {
  return (
    <div
      className={cn("card", destacado && "col-span-2 !border-0 bg-gradient-to-br from-rust to-rust-dark text-white lg:col-span-1")}
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <p className={cn("text-sm", destacado ? "text-white/80" : "text-ink/60")}>{titulo}</p>
      <p className={cn("mt-1 font-bold tracking-tight", destacado ? "text-4xl md:text-3xl" : "text-2xl md:text-3xl", tono === "bueno" && "text-sage-dark", tono === "malo" && "text-rust-dark")}>
        <NumeroAnimado valor={valor} formato={formato} />
      </p>
      {tendencia && <div className="mt-1">{tendencia}</div>}
      {sub && <p className={cn("mt-0.5 text-xs", destacado ? "text-white/70" : "text-ink/50")}>{sub}</p>}
    </div>
  );
}

export default async function Inicio() {
  const db = await supabaseServer();
  const [{ data: ped, error }, { data: stock }, { data: tareas }, { data: pagosDb, error: errPagos }, { data: gastosDb }] = await Promise.all([
    db.from("sg_pedidos").select("id,numero,estado,total,pagado,pagado_en,created_at,fecha_entrega,cliente_id,stock_descontado, sg_clientes(nombre), sg_pedido_lineas(tipo,cantidad,coste_unitario,prenda_id,color,tallas,zonas)"),
    db.from("sg_v_stock").select("linea_id,prenda_id,nombre_oficial,color,talla,valor,cantidad,reponer,tipo").eq("activa", true),
    db.from("sg_tareas").select("id,texto,vence").eq("completada", false).order("vence", { ascending: true, nullsFirst: false }).limit(6),
    db.from("sg_pagos").select("pedido_id,importe,fecha"),
    db.from("sg_gastos").select("importe,fecha"),
  ]);
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}</p>;

  const filas = (ped ?? []) as unknown as FilaPedido[];

  // Cobros: de la tabla sg_pagos; si aún no existe (migración 0004 pendiente) se deducen de los pedidos marcados como pagados.
  const pagos: PagoConPedido[] = errPagos
    ? filas.filter((p) => p.pagado).map((p) => ({ pedido_id: p.id, importe: Number(p.total), fecha: (p.pagado_en ?? p.created_at).slice(0, 10) }))
    : (pagosDb ?? []).map((x) => ({ pedido_id: x.pedido_id as string, importe: Number(x.importe), fecha: String(x.fecha) }));
  const cobradoPorPedido = new Map<string, number>();
  for (const x of pagos) cobradoPorPedido.set(x.pedido_id, (cobradoPorPedido.get(x.pedido_id) ?? 0) + x.importe);
  const gastos: GastoStat[] = (gastosDb ?? []).map((g) => ({ importe: Number(g.importe), fecha: String(g.fecha) }));

  const stats: PedidoStat[] = filas.map((p) => ({
    estado: p.estado, total: Number(p.total), cobrado: cobradoPorPedido.get(p.id) ?? 0, created_at: p.created_at,
    fecha_entrega: p.fecha_entrega, cliente_id: p.cliente_id, cliente: p.sg_clientes?.nombre ?? null,
    // Cuentan las prendas estampadas (nuestras o del cliente); los servicios no son prendas.
    uds: p.sg_pedido_lineas.filter((l) => l.tipo !== "servicio").reduce((s, l) => s + l.cantidad, 0),
    // Coste real: prenda + lámina DTF de cada zona + planchado.
    coste: p.sg_pedido_lineas.reduce((s, l) => s + costeRealLinea(l).total, 0),
    sinCoste: p.sg_pedido_lineas.some((l) => l.coste_unitario === null),
  }));
  const r = resumir(stats, new Date(), pagos, gastos);
  const porId = new Map(filas.map((p, i) => [stats[i], p]));

  // Pedidos aún sin descontar (aprobado → producción): ¿alcanzará el stock cuando lleguen a «Listo»?
  const faltas = preverFaltas(
    filas.filter((p) => ["aprobado", "diseno", "produccion"].includes(p.estado) && !p.stock_descontado).flatMap((p) => p.sg_pedido_lineas),
    (stock ?? []).map((x) => ({ id: x.linea_id as string, prenda_id: x.prenda_id as string, talla: x.talla as string, color: x.color as string, cantidad: x.cantidad as number, nombre_oficial: x.nombre_oficial as string })),
  );

  const valorStock = (stock ?? []).reduce((s, f) => s + Number(f.valor), 0);
  const uds = (stock ?? []).reduce((s, f) => s + f.cantidad, 0);
  const reponer = (stock ?? []).filter((f) => f.reponer && f.tipo !== "consumible").length;
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.vendido));
  const hoy = new Date().toISOString().slice(0, 10);
  const mesNombre = new Date().toLocaleDateString("es-ES", { month: "long" });

  const extras = (
    <>
      <Kpi i={4} titulo="Camisetas vendidas" valor={r.udsMes} formato="int" tendencia={<Tendencia actual={r.udsMes} anterior={r.anterior.uds} />} sub={`${r.udsTotal} en total`} />
      <Kpi i={5} titulo="Gastos del mes" valor={r.gastosMes} tendencia={<Tendencia actual={r.gastosMes} anterior={r.anterior.gastos} masEsMalo />} sub={<Link href="/gastos" className="font-semibold text-rust">Ver gastos</Link>} />
      <Kpi i={6} titulo="Caja del mes" valor={r.resultadoMes} tono={r.resultadoMes >= 0 ? "bueno" : "malo"} sub="cobrado − gastos" />
      <Kpi i={7} titulo="Beneficio real" valor={r.beneficioMes} tendencia={<Tendencia actual={r.beneficioMes} anterior={r.anterior.beneficio} />} sub={r.margenMes === null ? "faltan costes de prenda" : `margen ${r.margenMes.toFixed(0)} % · con lámina y planchado`} />
      <Kpi i={8} titulo="Presupuestos abiertos" valor={r.posibles} formato="int" sub={`${eur(r.valorPosibles)} en juego${r.aceptacion !== null ? ` · aceptación ${r.aceptacion.toFixed(0)} %` : ""}`} />
    </>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Camis24h" className="-my-3 -ml-2 h-24 w-24 shrink-0 animate-fade-up object-contain md:h-28 md:w-28" />
          <h1 className="sr-only">Inicio</h1>
          <p className="text-sm capitalize text-ink/50">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pedidos/nuevo" className="btn !py-2">+ Presupuesto</Link>
          <div className="hidden md:block"><PlancharBoton /></div>
        </div>
      </div>

      <AvisoCopia />

      {faltas.length > 0 && (
        <section className="animate-fade-up rounded-2xl border border-rust/30 bg-rust/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-rust-dark">⚠ Te faltará stock para los pedidos en curso</h2>
            <Link href="/inventario/compra" className="shrink-0 text-sm font-semibold text-rust">Registrar compra →</Link>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {faltas.slice(0, 6).map((f) => (
              <li key={`${f.nombre}${f.color}${f.talla}`} className="flex justify-between gap-2">
                <span>{f.nombre} · {f.color} · {f.talla}</span>
                <span className="shrink-0 font-semibold text-rust-dark">faltan {f.falta} <span className="font-normal text-ink/50">(necesitas {f.necesito}, hay {f.hay})</span></span>
              </li>
            ))}
          </ul>
          {faltas.length > 6 && <p className="mt-1 text-xs text-ink/50">y {faltas.length - 6} más en el inventario</p>}
        </section>
      )}

      {/* En móvil solo lo esencial; el resto, desplegable */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-6">
        <Kpi i={0} destacado titulo={`Vendido en ${mesNombre}`} valor={r.vendidoMes} tendencia={<Tendencia claro actual={r.vendidoMes} anterior={r.anterior.vendido} />} sub={r.ticketMedio ? `ticket medio ${eur(r.ticketMedio)}` : undefined} />
        <Kpi i={1} titulo="Por cobrar" valor={r.porCobrar} tono={r.porCobrar > 0 ? "malo" : undefined} sub="total de pedidos − cobros" />
        <Kpi i={2} titulo="Cobrado este mes" valor={r.cobradoMes} tono="bueno" tendencia={<Tendencia actual={r.cobradoMes} anterior={r.anterior.cobrado} />} sub="incluye anticipos" />
        <Kpi i={3} titulo="Pedidos en curso" valor={r.activos} formato="int" sub="aprobados → listos" />
        <div className="hidden md:contents">{extras}</div>
      </section>
      <details className="group md:hidden">
        <summary className="cursor-pointer list-none rounded-xl border border-ink/10 bg-white py-2.5 text-center text-sm font-semibold text-ink/60 transition active:scale-[.98] group-open:mb-3">
          <span className="group-open:hidden">Ver más cifras</span>
          <span className="hidden group-open:inline">Ocultar</span>
        </summary>
        <div className="grid grid-cols-2 gap-3">{extras}</div>
      </details>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-bold">Ventas últimos 6 meses</h2>
          <div className="flex h-44 items-end gap-3">
            {r.porMes.map((m, i) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold text-ink/60">{m.vendido > 0 ? eur(m.vendido) : ""}</span>
                <div className="w-full origin-bottom animate-grow rounded-t-lg bg-gradient-to-t from-rust-dark to-rust-light" style={{ height: `${Math.max(m.vendido > 0 ? 4 : 1, (m.vendido / maxMes) * 100)}%`, opacity: m.vendido > 0 ? 1 : 0.2, animationDelay: `${i * 80}ms` }} />
                <span className="text-xs uppercase text-ink/50">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Tareas</h2>
            <Link href="/tareas" className="text-sm font-semibold text-rust">Ver todas</Link>
          </div>
          <ul className="space-y-2">
            {(tareas ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-2.5">
                <form action={completarTarea.bind(null, t.id, true)}>
                  <button aria-label="Hecha" className="h-5 w-5 rounded-full border-2 border-ink/30 hover:border-sage hover:bg-sage/10" />
                </form>
                <span className="flex-1 text-sm">{t.texto}</span>
                {t.vence && <span className={cn("text-xs font-semibold", t.vence < hoy ? "text-rust-dark" : "text-ink/50")}>{new Date(t.vence).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>}
              </li>
            ))}
            {!(tareas ?? []).length && <li className="text-sm text-ink/40">Nada pendiente.</li>}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card">
          <h2 className="mb-3 font-bold">Próximas entregas</h2>
          <ul className="space-y-2 text-sm">
            {r.entregasProximas.map((p) => {
              const f = porId.get(p)!;
              return (
                <li key={f.id}>
                  <Link href={`/pedidos/${f.id}`} className="flex justify-between gap-2 hover:text-rust">
                    <span><b>{refPedido(f.numero)}</b> · {p.cliente ?? "Sin cliente"} <span className="text-ink/40">({ESTADO_LABEL[p.estado]})</span></span>
                    <span className={cn("shrink-0 font-semibold", p.fecha_entrega! < hoy && "text-rust-dark")}>{new Date(p.fecha_entrega!).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                  </Link>
                </li>
              );
            })}
            {!r.entregasProximas.length && <li className="text-ink/40">Sin entregas con fecha.</li>}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Mejores clientes</h2>
          <ul className="space-y-2 text-sm">
            {r.topClientes.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex justify-between hover:text-rust">
                  <span>{c.nombre} <span className="text-ink/40">· {c.pedidos} ped.</span></span><b>{eur(c.total)}</b>
                </Link>
              </li>
            ))}
            {!r.topClientes.length && <li className="text-ink/40">Aún no hay ventas.</li>}
          </ul>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Inventario</h2>
            <Link href="/inventario" className="text-sm font-semibold text-rust">Abrir</Link>
          </div>
          <p className="text-3xl font-bold">{eur(valorStock)}</p>
          <p className="text-sm text-ink/60">{uds} unidades en stock</p>
          <p className={cn("mt-2 text-sm font-semibold", reponer > 0 ? "text-rust-dark" : "text-sage-dark")}>
            {reponer > 0 ? `${reponer} líneas por reponer` : "Nada que reponer"}
          </p>
        </section>
      </div>
    </div>
  );
}
