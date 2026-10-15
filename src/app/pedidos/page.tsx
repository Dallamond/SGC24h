import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ESTADOS, ESTADO_LABEL, refPedido, type Estado, type Pedido } from "@/lib/types";
import { eur, cn } from "@/lib/utils";
import { cambiarEstado, marcarDtf, marcarPagado } from "./actions";

export const dynamic = "force-dynamic";

type Fila = Pedido & { sg_clientes: { nombre: string } | null; sg_pedido_lineas: { cantidad: number }[] };

export default async function Tablero() {
  const db = await supabaseServer();
  const { data, error } = await db
    .from("sg_pedidos")
    .select("*, sg_clientes(nombre), sg_pedido_lineas(cantidad)")
    .neq("estado", "descartado")
    .order("created_at", { ascending: false });
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}</p>;
  const pedidos = (data ?? []) as unknown as Fila[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Link href="/pedidos/nuevo" className="btn">+ Presupuesto</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {ESTADOS.map((estado, i) => {
          const todos = pedidos.filter((p) => p.estado === estado);
          // Los entregados se acumulan: aquí solo los más recientes.
          const col = estado === "entregado" ? todos.slice(0, 6) : todos;
          const ant = ESTADOS[i - 1];
          const sig = ESTADOS[i + 1];
          return (
            <section key={estado} className="min-w-0 rounded-2xl bg-ink/[0.04] p-2.5">
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-bold uppercase tracking-wide text-ink/60">
                {ESTADO_LABEL[estado]} <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{todos.length}</span>
              </h2>
              <div className="space-y-2">
                {col.map((p) => (
                  <article key={p.id} className="card space-y-2 !p-3">
                    <Link href={`/pedidos/${p.id}`} className="block">
                      <p className="flex justify-between font-semibold"><span>{refPedido(p.numero)}</span><span>{eur(Number(p.total))}</span></p>
                      <p className="text-sm text-ink/70">{p.sg_clientes?.nombre ?? "Sin cliente"} · {p.sg_pedido_lineas.reduce((s, l) => s + l.cantidad, 0)} uds</p>
                      {p.fecha_entrega && <p className="text-xs text-ink/50">Entrega {new Date(p.fecha_entrega).toLocaleDateString("es-ES")}</p>}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {p.pagado ? <span className="rounded bg-sage/15 px-1.5 py-0.5 font-semibold text-sage-dark">Pagado</span> : <span className="rounded bg-rust/10 px-1.5 py-0.5 font-semibold text-rust-dark">Sin pagar</span>}
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
                        <form action={marcarPagado.bind(null, p.id, true, "efectivo")}><button className="btn-ghost !py-1.5">Cobrado</button></form>
                      )}
                      {estado === "posible" && (
                        <form action={cambiarEstado.bind(null, p.id, "descartado")}><button className="btn-ghost !px-3 !py-1.5" aria-label="Descartar">✕</button></form>
                      )}
                    </div>
                  </article>
                ))}
                {!col.length && <p className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-sm text-ink/40">Vacío</p>}
                {todos.length > col.length && <p className="text-center text-xs text-ink/40">+{todos.length - col.length} más en el historial</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
