import { supabaseServer } from "@/lib/supabase/server";
import { FormCompra, type PrendaCompra } from "./FormCompra";

export const dynamic = "force-dynamic";

export default async function Compra() {
  const db = await supabaseServer();
  const [{ data: prendas }, { data: stock }] = await Promise.all([
    db.from("sg_prendas").select("id,nombre_oficial,precio_compra,tipo").neq("tipo", "consumible").order("nombre_oficial"),
    db.from("sg_v_stock").select("prenda_id,talla,color,cantidad").neq("tipo", "consumible"),
  ]);

  const lista: PrendaCompra[] = (prendas ?? []).map((p) => {
    const lineas = (stock ?? []).filter((s) => s.prenda_id === p.id);
    return {
      id: p.id,
      nombre: p.nombre_oficial,
      precio: Number(p.precio_compra),
      stock: lineas.reduce((t, l) => t + l.cantidad, 0),
      colores: [...new Set(lineas.map((l) => l.color))],
      tallas: [...new Set(lineas.map((l) => l.talla))],
    };
  });

  return <FormCompra prendas={lista} />;
}
