import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NuevoCliente } from "./NuevoCliente";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const db = await supabaseServer();
  const { data, error } = await db.from("sg_clientes").select("*").order("nombre");
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}</p>;
  const clientes = (data ?? []) as Cliente[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <NuevoCliente />
      <ul className="grid gap-2 sm:grid-cols-2">
        {clientes.map((c) => (
          <li key={c.id}>
            <Link href={`/clientes/${c.id}`} className="card block hover:border-rust">
              <p className="font-semibold">{c.nombre}</p>
              <p className="text-sm text-ink/60">{[c.canal, c.zona, c.contacto].filter(Boolean).join(" · ") || "—"}</p>
            </Link>
          </li>
        ))}
        {!clientes.length && <li className="text-ink/50">Aún no hay clientes. También se pueden crear al vuelo desde un presupuesto.</li>}
      </ul>
    </div>
  );
}
