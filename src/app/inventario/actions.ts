"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const MOTIVOS = ["entrada", "planchado", "ajuste", "devolucion"] as const;

export async function moverStock(lineaId: string, delta: number, motivo: (typeof MOTIVOS)[number], nota?: string) {
  z.object({ lineaId: z.string().uuid(), delta: z.number().int().refine((n) => n !== 0), motivo: z.enum(MOTIVOS) }).parse({ lineaId, delta, motivo });
  const db = await supabaseServer();
  const { data, error } = await db.rpc("sg_mover_stock", { p_linea: lineaId, p_delta: delta, p_motivo: motivo, p_nota: nota ?? null });
  if (error) return { ok: false as const, error: error.message.includes("cantidad_check") ? "No queda stock de esa prenda" : error.message };
  revalidatePath("/inventario");
  return { ok: true as const, cantidad: data as number };
}

const nuevaSchema = z.object({
  nombre_oficial: z.string().trim().min(1),
  tipo: z.enum(["camiseta", "sudadera", "polo", "consumible"]),
  proveedor: z.string().trim().optional(),
  tienda: z.string().trim().optional(),
  gramaje: z.union([z.literal("").transform(() => undefined), z.coerce.number().int().positive()]),
  precio_compra: z.coerce.number().min(0),
  stock_minimo: z.coerce.number().int().min(0).default(0),
});

// Crea el modelo y una línea de stock por cada talla × color con la cantidad inicial indicada.
export async function crearPrenda(_: unknown, form: FormData) {
  const p = nuevaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false as const, error: "Revisa los campos obligatorios" };

  const tallas = String(form.get("tallas") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const colores = String(form.get("colores") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const cantidad = Math.max(0, Math.floor(Number(form.get("cantidad") ?? 0)));
  if (!tallas.length) tallas.push("U");
  if (!colores.length) colores.push("único");

  const db = await supabaseServer();
  const { data: prenda, error } = await db.from("sg_prendas").insert(p.data).select("id").single();
  if (error) return { ok: false as const, error: error.message };

  const lineas = tallas.flatMap((talla) => colores.map((color) => ({ prenda_id: prenda.id, talla, color })));
  const { data: creadas, error: e2 } = await db.from("sg_stock_lineas").insert(lineas).select("id");
  if (e2) return { ok: false as const, error: e2.message };

  if (cantidad > 0) {
    for (const l of creadas) await db.rpc("sg_mover_stock", { p_linea: l.id, p_delta: cantidad, p_motivo: "entrada", p_nota: "Stock inicial" });
  }
  revalidatePath("/inventario");
  return { ok: true as const };
}
