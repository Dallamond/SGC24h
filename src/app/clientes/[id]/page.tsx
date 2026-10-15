import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ESTADO_LABEL, refPedido, type Cliente, type Pedido } from "@/lib/types";
import { eur } from "@/lib/utils";
import { guardarNotas } from "../actions";

export const dynamic = "force-dynamic";

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: c } = await db.from("sg_clientes").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const cliente = c as Cliente;
  const { data: ps } = await db.from("sg_pedidos").select("*").eq("cliente_id", id).order("created_at", { ascending: false });
  const pedidos = (ps ?? []) as Pedido[];
  const gastado = pedidos.filter((p) => p.estado !== "descartado").reduce((s, p) => s + Number(p.total), 0);

  async function notas(f: FormData) {
    "use server";
    await guardarNotas(id, String(f.get("notas") ?? ""));
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/clientes" className="text-sm text-ink/50 hover:text-rust">← Clientes</Link>
        <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
        <p className="text-sm text-ink/60">{[cliente.canal, cliente.zona, cliente.contacto].filter(Boolean).join(" · ")}</p>
      </div>

      <form action={notas} className="card space-y-2">
        <label htmlFor="notas">Notas (tallas habituales, carpeta del diseño en el PC…)</label>
        <textarea id="notas" name="notas" rows={3} defaultValue={cliente.notas ?? ""} />
        <button className="btn-ghost">Guardar notas</button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Historial · {pedidos.length} · {eur(gastado)}</h2>
        <Link href={`/pedidos/nuevo?cliente=${id}`} className="btn">Nuevo presupuesto</Link>
      </div>
      <ul className="space-y-2">
        {pedidos.map((p) => (
          <li key={p.id}>
            <Link href={`/pedidos/${p.id}`} className="card flex items-center justify-between hover:border-rust">
              <span className="font-semibold">{refPedido(p.numero)}</span>
              <span className="text-sm text-ink/60">{new Date(p.created_at).toLocaleDateString("es-ES")} · {ESTADO_LABEL[p.estado]}{p.pagado ? " · pagado" : ""}</span>
              <b>{eur(Number(p.total))}</b>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
