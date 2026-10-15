import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { refPedido } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Mov {
  id: string; created_at: string; delta: number; motivo: string; pedido_id: string | null; nota: string | null;
  sg_stock_lineas: { talla: string; color: string; sg_prendas: { nombre_oficial: string } | null } | null;
}

const MOTIVO: Record<string, string> = { entrada: "Entrada", planchado: "Planchado", ajuste: "Ajuste", devolucion: "Devolución" };

export default async function Historial() {
  const db = await supabaseServer();
  const { data, error } = await db
    .from("sg_stock_movimientos")
    .select("id,created_at,delta,motivo,pedido_id,nota, sg_stock_lineas(talla,color, sg_prendas(nombre_oficial))")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}</p>;
  const movs = (data ?? []) as unknown as Mov[];

  // Nº de pedido de los movimientos que vienen de un pedido
  const ids = [...new Set(movs.map((m) => m.pedido_id).filter((x): x is string => !!x))];
  const numeros = new Map<string, number>();
  if (ids.length) (await db.from("sg_pedidos").select("id,numero").in("id", ids)).data?.forEach((p) => numeros.set(p.id, p.numero));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/inventario" className="text-sm text-ink/50 hover:text-rust">← Inventario</Link>
        <h1 className="text-2xl font-bold">Historial de stock</h1>
        <p className="text-sm text-ink/60">Los últimos {movs.length} movimientos: entradas, planchados, ajustes y devoluciones.</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/60">
            <tr><th className="p-3">Fecha</th><th>Prenda</th><th>Color · talla</th><th className="text-right">Uds</th><th className="px-3">Motivo</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id} className="border-b border-ink/5 last:border-0">
                <td className="whitespace-nowrap p-3 text-ink/60">{new Date(m.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="font-medium">{m.sg_stock_lineas?.sg_prendas?.nombre_oficial ?? "—"}</td>
                <td className="capitalize">{m.sg_stock_lineas ? `${m.sg_stock_lineas.color}${m.sg_stock_lineas.talla !== "U" ? ` · ${m.sg_stock_lineas.talla}` : ""}` : "—"}</td>
                <td className={cn("text-right font-bold", m.delta > 0 ? "text-sage-dark" : "text-rust-dark")}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                <td className="px-3">{MOTIVO[m.motivo] ?? m.motivo}</td>
                <td className="text-ink/60">
                  {m.pedido_id && numeros.has(m.pedido_id) ? <Link href={`/pedidos/${m.pedido_id}`} className="font-semibold text-rust">{refPedido(numeros.get(m.pedido_id)!)}</Link> : m.nota}
                </td>
              </tr>
            ))}
            {!movs.length && <tr><td colSpan={6} className="p-6 text-center text-ink/40">Todavía no hay movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
