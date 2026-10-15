import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { eur } from "@/lib/utils";
import { borrarGasto } from "./actions";
import { FormGasto } from "./FormGasto";

export const dynamic = "force-dynamic";

interface Gasto {
  id: string; fecha: string; concepto: string; categoria: string; importe: number;
  pagado_por: string | null; proveedor: string | null; foto_path: string | null;
}

const CAT: Record<string, string> = { prendas: "Prendas", polvo: "Polvo DTF", film: "Film / láminas", cinta: "Cinta", otros: "Otros" };

export default async function Gastos() {
  const db = await supabaseServer();
  const { data, error } = await db.from("sg_gastos").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}. ¿Has ejecutado <code>0004_pagos_gastos.sql</code>?</p>;
  const gastos = (data ?? []) as Gasto[];

  const fotos = gastos.filter((g) => g.foto_path);
  const { data: firmadas } = fotos.length ? await db.storage.from("adjuntos").createSignedUrls(fotos.map((g) => g.foto_path!), 3600) : { data: [] };
  const urlDe = new Map(fotos.map((g, i) => [g.id, firmadas?.[i]?.signedUrl]));

  // Agrupa por mes (YYYY-MM) con total y desglose por categoría.
  const meses = new Map<string, Gasto[]>();
  for (const g of gastos) meses.set(g.fecha.slice(0, 7), [...(meses.get(g.fecha.slice(0, 7)) ?? []), g]);
  const nombreMes = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <Link href="/inventario/compra" className="btn-ghost">Registrar compra de prendas</Link>
      </div>

      <FormGasto />

      {[...meses].map(([mes, lista]) => {
        const total = lista.reduce((s, g) => s + Number(g.importe), 0);
        const porCat = Object.entries(lista.reduce<Record<string, number>>((a, g) => ({ ...a, [g.categoria]: (a[g.categoria] ?? 0) + Number(g.importe) }), {}));
        return (
          <section key={mes} className="card space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold capitalize">{nombreMes(mes)}</h2>
              <p className="text-xl font-bold">{eur(total)}</p>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">{porCat.map(([c, v]) => <span key={c}>{CAT[c] ?? c}: <b>{eur(v)}</b></span>)}</p>
            <ul className="divide-y divide-ink/5 text-sm">
              {lista.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.concepto}</p>
                    <p className="text-xs text-ink/50">
                      {new Date(g.fecha).toLocaleDateString("es-ES")} · {CAT[g.categoria] ?? g.categoria}{g.proveedor ? ` · ${g.proveedor}` : ""}{g.pagado_por ? ` · pagó ${g.pagado_por}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {urlDe.get(g.id) && <a href={urlDe.get(g.id) ?? undefined} target="_blank" rel="noreferrer" className="text-xs font-semibold text-rust">Ticket</a>}
                    <b>{eur(Number(g.importe))}</b>
                    <form action={borrarGasto.bind(null, g.id, g.foto_path)}><button className="text-ink/30 hover:text-rust" aria-label="Borrar gasto">✕</button></form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!gastos.length && <p className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-ink/40">Aún no hay gastos registrados.</p>}
    </div>
  );
}
