import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { eur, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Fila {
  linea_id: string; prenda_id: string; nombre_oficial: string; tipo: string; proveedor: string | null;
  gramaje: number | null; precio_compra: number; talla: string; color: string; cantidad: number; valor: number; reponer: boolean;
}

export default async function Inventario() {
  const db = await supabaseServer();
  const { data, error } = await db.from("sg_v_stock").select("*").eq("activa", true).order("nombre_oficial").order("color").order("talla");
  if (error) return <p className="card text-rust-dark">No se pudo leer el inventario: {error.message}</p>;
  const filas = (data ?? []) as Fila[];

  const total = filas.reduce((s, f) => s + Number(f.valor), 0);
  const unidades = filas.reduce((s, f) => s + f.cantidad, 0);
  const porTipo = Object.entries(
    filas.reduce<Record<string, number>>((a, f) => ({ ...a, [f.tipo]: (a[f.tipo] ?? 0) + Number(f.valor) }), {}),
  );
  const reponer = filas.filter((f) => f.reponer);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <div className="flex gap-2">
          <Link href="/inventario/planchar" className="btn">Planchar</Link>
          <Link href="/inventario/nueva" className="btn-ghost">+ Prenda</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card"><p className="text-sm text-ink/60">Valor en stock</p><p className="text-2xl font-bold">{eur(total)}</p></div>
        <div className="card"><p className="text-sm text-ink/60">Unidades</p><p className="text-2xl font-bold">{unidades}</p></div>
        {porTipo.map(([t, v]) => (
          <div key={t} className="card"><p className="text-sm capitalize text-ink/60">{t}</p><p className="text-xl font-bold">{eur(v)}</p></div>
        ))}
      </div>

      {reponer.length > 0 && (
        <div className="card border-rust/40 bg-rust/5">
          <p className="mb-2 font-bold text-rust-dark">A reponer ({reponer.length})</p>
          <ul className="space-y-1 text-sm">
            {reponer.map((f) => (
              <li key={f.linea_id}>{f.nombre_oficial} · {f.color} · {f.talla} — quedan <b>{f.cantidad}</b></li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr><th className="p-3">Prenda</th><th>Color</th><th>Talla</th><th>Gramaje</th><th className="text-right">Uds</th><th className="p-3 text-right">Valor</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.linea_id} className="border-b border-ink/5 last:border-0">
                <td className="p-3 font-medium">{f.nombre_oficial}</td>
                <td className="capitalize">{f.color}</td><td>{f.talla}</td><td>{f.gramaje ? `${f.gramaje} g` : "—"}</td>
                <td className={cn("text-right font-bold", f.reponer && "text-rust")}>{f.cantidad}</td>
                <td className="p-3 text-right">{eur(Number(f.valor))}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={6} className="p-6 text-center text-ink/50">Aún no hay prendas. Añade la primera con “+ Prenda”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
