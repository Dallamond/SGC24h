import { supabaseServer } from "@/lib/supabase/server";
import { Formulario, type PrendaOpt } from "./Formulario";

export const dynamic = "force-dynamic";

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const db = await supabaseServer();
  const [{ data: clientes }, { data: prendas }, { data: stock }] = await Promise.all([
    db.from("sg_clientes").select("id,nombre").order("nombre"),
    db.from("sg_prendas").select("id,nombre_oficial,gramaje,tipo").eq("activa", true).neq("tipo", "consumible").order("nombre_oficial"),
    db.from("sg_v_stock").select("prenda_id,color").neq("tipo", "consumible"),
  ]);

  const colores = new Map<string, Set<string>>();
  stock?.forEach((s) => colores.set(s.prenda_id, (colores.get(s.prenda_id) ?? new Set()).add(s.color)));
  const opts: PrendaOpt[] = (prendas ?? []).map((p) => ({ ...p, colores: [...(colores.get(p.id) ?? [])] }));

  return <Formulario clientes={clientes ?? []} prendas={opts} clienteInicial={cliente ?? ""} />;
}
