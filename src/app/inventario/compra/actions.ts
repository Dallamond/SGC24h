"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { costeMedio } from "@/lib/compra";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  prenda_id: z.string().uuid(),
  color: z.string().trim().min(1).max(30),
  tallas: z.record(z.number().int().min(0).max(5000)),
  coste_unitario: z.number().min(0).max(1000),
  envio: z.number().min(0).max(10000),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proveedor: z.string().trim().max(80).nullable(),
  pagado_por: z.string().trim().max(40).nullable(),
  foto_path: z.string().max(200).nullable(),
});

export type NuevaCompra = z.infer<typeof schema>;

// Una compra: suma las unidades al stock, actualiza el coste medio de la prenda y apunta el gasto.
export async function registrarCompra(input: NuevaCompra) {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Revisa prenda, color, cantidades y coste" };
  const d = p.data;
  const lineasCompra = Object.entries(d.tallas).filter(([, n]) => n > 0);
  const uds = lineasCompra.reduce((s, [, n]) => s + n, 0);
  if (uds < 1) return { ok: false as const, error: "Indica al menos una unidad" };

  const db = await supabaseServer();
  const { data: prenda } = await db.from("sg_prendas").select("id,nombre_oficial,precio_compra").eq("id", d.prenda_id).single();
  if (!prenda) return { ok: false as const, error: "Prenda no encontrada" };

  // Stock antes de la compra (todas las líneas del modelo) para ponderar el coste.
  const { data: previas } = await db.from("sg_stock_lineas").select("cantidad").eq("prenda_id", d.prenda_id);
  const stockAntes = (previas ?? []).reduce((s, l) => s + l.cantidad, 0);

  const color = d.color.toLowerCase();
  for (const [talla, n] of lineasCompra) {
    const { data: linea, error } = await db
      .from("sg_stock_lineas")
      .upsert({ prenda_id: d.prenda_id, talla, color }, { onConflict: "prenda_id,talla,color" })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    const r = await db.rpc("sg_mover_stock", { p_linea: linea.id, p_delta: n, p_motivo: "entrada", p_nota: `Compra${d.proveedor ? ` a ${d.proveedor}` : ""}` });
    if (r.error) return { ok: false as const, error: r.error.message };
  }

  // Coste real por unidad = precio + envío repartido.
  const costeUd = d.coste_unitario + d.envio / uds;
  const nuevoPrecio = costeMedio(stockAntes, Number(prenda.precio_compra), uds, costeUd);
  await db.from("sg_prendas").update({ precio_compra: nuevoPrecio }).eq("id", d.prenda_id);

  const importe = Math.round((d.coste_unitario * uds + d.envio) * 100) / 100;
  await db.from("sg_gastos").insert({
    fecha: d.fecha,
    concepto: `Compra: ${prenda.nombre_oficial} ${color} (${uds} uds)`,
    categoria: "prendas",
    importe,
    pagado_por: d.pagado_por || null,
    proveedor: d.proveedor || null,
    foto_path: d.foto_path,
    prenda_id: d.prenda_id,
  });

  revalidatePath("/", "layout");
  return { ok: true as const, unidades: uds, importe, precioMedio: nuevoPrecio };
}
