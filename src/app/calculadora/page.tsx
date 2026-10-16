import { supabaseServer } from "@/lib/supabase/server";
import { Calculadora, type PrendaCalc } from "./Calculadora";

export const dynamic = "force-dynamic";

type Fila = { id: string; nombre_oficial: string; tipo: string; precio_compra: number; imagen_path?: string | null };

export default async function PaginaCalculadora() {
  const db = await supabaseServer();
  const conImg = await db.from("sg_prendas").select("id,nombre_oficial,tipo,precio_compra,imagen_path").eq("activa", true).neq("tipo", "consumible").order("nombre_oficial");
  // Si la migración 0005 aún no está, se leen sin foto.
  const filas: Fila[] = conImg.error
    ? (((await db.from("sg_prendas").select("id,nombre_oficial,tipo,precio_compra").eq("activa", true).neq("tipo", "consumible").order("nombre_oficial")).data ?? []) as Fila[])
    : ((conImg.data ?? []) as Fila[]);

  const conFoto = filas.filter((f) => f.imagen_path);
  const { data: firmadas } = conFoto.length ? await db.storage.from("adjuntos").createSignedUrls(conFoto.map((f) => f.imagen_path!), 3600) : { data: [] };
  const foto = new Map(conFoto.map((f, i) => [f.id, firmadas?.[i]?.signedUrl ?? null]));

  const prendas: PrendaCalc[] = filas.map((f) => ({ id: f.id, nombre_oficial: f.nombre_oficial, tipo: f.tipo, precio_compra: Number(f.precio_compra), foto: foto.get(f.id) ?? null }));
  return <Calculadora prendas={prendas} />;
}
