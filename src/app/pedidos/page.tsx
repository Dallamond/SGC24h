import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ESTADOS, ESTADO_LABEL, refPedido, type Estado, type Pedido } from "@/lib/types";
import { eur, cn } from "@/lib/utils";
import { cambiarEstado, marcarDtf, marcarPagado } from "./actions";

export const dynamic = "force-dynamic";

type Fila = Pedido & { sg_clientes: { nombre: string } | null; sg_pedido_lineas: { cantidad: number }[] };

const ENTREGADOS_VISIBLES = 6;
const EN_CURSO: Estado[] = ["aprobado", "diseno", "produccion", "listo"];

export default async function Tablero({ searchParams }: { searchParams: Promise<{ q?: string; todos?: string; e?: string }> }) {
  const { q = "", todos: verTodos, e } = await searchParams;
  const db = await supabaseServer();
  const { data, error } = await db
    .from("sg_pedidos")
    .select("*, sg_clientes(nombre), sg_pedido_lineas(cantidad)")
    .neq("estado", "descartado")
    .order("created_at", { ascending: false });
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}</p>;

  // Búsqueda por cliente o por número de pedido (C24H-0003 o simplemente 3).
  const t = q.trim().toLowerCase();
  const pedidos = ((data ?? []) as unknown as Fila[]).filter(
    (p) => !t || (p.sg_clientes?.nombre ?? "").toLowerCase().includes(t) || refPedido(p.numero).toLowerCase().includes(t) || String(p.numero) === t.replace(/^c24h-0*/, ""),
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const atrasados = pedidos.filter((p) => p.fecha_entrega && p.fecha_entrega < hoy && EN_CURSO.includes(p.estado)).length;

  // En móvil se ve una sola columna (pestañas); por defecto la primera en curso con pedidos.
  const sel = (ESTADOS as readonly string[]).includes(e ?? "") ? (e as (typeof ESTADOS)[number]) :(EN_CURSO.find((s) => pedidos.some((p) => p.estado === s)) ?? "posible");
  const href = (extra: Record<string, string>) => `/pedidos?${new URLSearchParams({ ...(q ? { q } : {}), ...extra })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Link href="/pedidos/nuevo" className="btn !py-2">+ Presupuesto</Link>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar cliente o nº…" className="md:!w-64" />
        <input type="hidden" name="e" value={sel} />
        <button className="btn-ghost">Buscar</button>
        {q && <Link href={`/pedidos?e=${sel}`} className="btn-ghost" aria-label="Limpiar">✕</Link>}
      </form>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none]" aria-label="Estados">
        {ESTADOS.map((s) => {
          const n = pedidos.filter((p) => p.estado === s).length;
          return (
            <Link key={s} href={href({ e: s })} replace className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-95", s === sel ? "bg-ink text-white" : "bg-ink/[0.06] text-ink/70")}>
              {ESTADO_LABEL[s]} <span className="opacity-60">{n}</span>
            </Link>
          );
        })}
      </nav>

      {atrasados > 0 && (
        <p className="rounded-xl border border-rust/30 bg-rust/5 px-4 py-2.5 text-sm font-semibold text-rust-dark">
          ⚠ {atrasados} {atrasados === 1 ? "pedido pasado" : "pedidos pasados"} de fecha de entrega
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {ESTADOS.map((estado, i) => {
          const todos = pedidos.filter((p) => p.estado === estado);
          // Los entregados se acumulan: por defecto solo los más recientes.
          const col = estado === "entregado" && !verTodos ? todos.slice(0, ENTREGADOS_VISIBLES) : todos;
          const ant = ESTADOS[i - 1];
          const sig = ESTADOS[i + 1];
          return (
            <section key={estado} className={cn("min-w-0 rounded-2xl md:block md:bg-ink/[0.04] md:p-2.5", estado === sel ? "block" : "hidden")}>
              <h2 className="mb-2 hidden items-center md:flex justify-between px-1 text-sm font-bold uppercase tracking-wide text-ink/60">
                {ESTADO_LABEL[estado]} <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{todos.length}</span>
              </h2>
              <div className="space-y-2">
                {col.map((p, k) => {
                  const atrasado = !!p.fecha_entrega && p.fecha_entrega < hoy && EN_CURSO.includes(p.estado);
                  const anticipo = Number(p.anticipo ?? 0);
                  return (
                    <article key={p.id} style={{ animationDelay: `${k * 40}ms` }} className={cn("card space-y-2 !p-3", atrasado && "!border-rust/50")}>
                      <Link href={`/pedidos/${p.id}`} className="block">
                        <p className="flex justify-between font-semibold"><span>{refPedido(p.numero)}</span><span>{eur(Number(p.total))}</span></p>
                        <p className="text-sm text-ink/70">{p.sg_clientes?.nombre ?? "Sin cliente"} · {p.sg_pedido_lineas.reduce((s, l) => s + l.cantidad, 0)} uds</p>
                        {p.fecha_entrega && (
                          <p className={cn("text-xs", atrasado ? "font-semibold text-rust-dark" : "text-ink/50")}>
                            {atrasado ? "Debía entregarse el " : "Entrega "}{new Date(p.fecha_entrega).toLocaleDateString("es-ES")}
                          </p>
                        )}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {p.pagado ? (
                          <span className="rounded bg-sage/15 px-1.5 py-0.5 font-semibold text-sage-dark">Pagado</span>
                        ) : anticipo > 0 ? (
                          <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-semibold text-yellow-800">Anticipo {eur(anticipo)} · faltan {eur(Math.max(0, Number(p.total) - anticipo))}</span>
                        ) : (
                          <span className="rounded bg-rust/10 px-1.5 py-0.5 font-semibold text-rust-dark">Sin pagar</span>
                        )}
                        {estado === "produccion" && (
                          <form action={marcarDtf.bind(null, p.id, !p.dtf_recogido)}>
                            <button className={cn("rounded px-1.5 py-0.5 font-semibold", p.dtf_recogido ? "bg-sage/15 text-sage-dark" : "bg-yellow-100 text-yellow-800")}>
                              {p.dtf_recogido ? "DTF recogido" : "Falta recoger DTF"}
                            </button>
                          </form>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {ant && <form action={cambiarEstado.bind(null, p.id, ant)}><button className="btn-ghost !px-3 !py-1.5" aria-label="Atrás">←</button></form>}
                        {sig && <form action={cambiarEstado.bind(null, p.id, sig)} className="flex-1"><button className="btn w-full !py-1.5">{ESTADO_LABEL[sig as Estado]} →</button></form>}
                        {estado === "entregado" && !p.pagado && (
                          <form action={marcarPagado.bind(null, p.id, true, "efectivo")}><button className="btn-ghost !py-1.5">Cobrar resto</button></form>
                        )}
                        {estado === "posible" && (
                          <form action={cambiarEstado.bind(null, p.id, "descartado")}><button className="btn-ghost !px-3 !py-1.5" aria-label="Descartar">✕</button></form>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!col.length && <p className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-sm text-ink/40">Vacío</p>}
                {todos.length > col.length && (
                  <Link href={href({ e: sel, todos: "1" })} className="block text-center text-xs font-semibold text-rust">
                    Ver {todos.length - col.length} más
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
