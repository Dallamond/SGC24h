"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const MOTIVOS = ["entrada", "planchado", "ajuste", "devolucion"] as const;
const TIPOS = ["camiseta", "sudadera", "polo", "totebag", "consumible"] as const;

export async function moverStock(lineaId: string, delta: number, motivo: (typeof MOTIVOS)[number], nota?: string) {
  z.object({ lineaId: z.string().uuid(), delta: z.number().int().refine((n) => n !== 0), motivo: z.enum(MOTIVOS) }).parse({ lineaId, delta, motivo });
  const db = await supabaseServer();
  const { data, error } = await db.rpc("sg_mover_stock", { p_linea: lineaId, p_delta: delta, p_motivo: motivo, p_nota: nota ?? null });
  if (error) return { ok: false as const, error: error.message.includes("cantidad_check") ? "No queda stock de esa prenda" : error.message };
  revalidatePath("/inventario");
  return { ok: true as const, cantidad: data as number };
}

// Fija la cantidad exacta de una línea (recuento): registra la diferencia como "ajuste" o "entrada".
export async function fijarCantidad(lineaId: string, nueva: number) {
  z.object({ lineaId: z.string().uuid(), nueva: z.number().int().min(0).max(100000) }).parse({ lineaId, nueva });
  const db = await supabaseServer();
  const { data: l } = await db.from("sg_stock_lineas").select("cantidad").eq("id", lineaId).single();
  if (!l) return { ok: false as const, error: "Línea no encontrada" };
  const delta = nueva - l.cantidad;
  if (delta === 0) return { ok: true as const, cantidad: nueva };
  return moverStock(lineaId, delta, delta > 0 ? "entrada" : "ajuste", "Recuento manual");
}

export async function fijarPrecio(prendaId: string, precio: number) {
  z.object({ prendaId: z.string().uuid(), precio: z.number().min(0).max(1000) }).parse({ prendaId, precio });
  const db = await supabaseServer();
  const { error } = await db.from("sg_prendas").update({ precio_compra: precio }).eq("id", prendaId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inventario");
  return { ok: true as const };
}

export async function fijarMinimo(prendaId: string, minimo: number) {
  z.object({ prendaId: z.string().uuid(), minimo: z.number().int().min(0).max(10000) }).parse({ prendaId, minimo });
  const db = await supabaseServer();
  const { error } = await db.from("sg_prendas").update({ stock_minimo: minimo }).eq("id", prendaId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inventario");
  return { ok: true as const };
}

const nuevaSchema = z.object({
  nombre_oficial: z.string().trim().min(1),
  tipo: z.enum(TIPOS),
  proveedor: z.string().trim().optional(),
  tienda: z.string().trim().optional(),
  gramaje: z.union([z.literal("").transform(() => undefined), z.coerce.number().int().positive()]),
  precio_compra: z.coerce.number().min(0),
  stock_minimo: z.coerce.number().int().min(0).default(0),
});

interface Modelo {
  nombre_oficial: string; tipo: (typeof TIPOS)[number]; gramaje?: number; precio_compra: number;
  proveedor?: string; tallas: string[]; colores: string[];
}

async function insertarModelo(db: Awaited<ReturnType<typeof supabaseServer>>, m: Modelo, cantidad: number, minimo = 0) {
  const { data: prenda, error } = await db
    .from("sg_prendas")
    .insert({ nombre_oficial: m.nombre_oficial, tipo: m.tipo, gramaje: m.gramaje ?? null, precio_compra: m.precio_compra, proveedor: m.proveedor ?? null, stock_minimo: minimo })
    .select("id")
    .single();
  if (error) return error.message;
  const lineas = m.tallas.flatMap((talla) => m.colores.map((color) => ({ prenda_id: prenda.id, talla, color })));
  const { data: creadas, error: e2 } = await db.from("sg_stock_lineas").insert(lineas).select("id");
  if (e2) return e2.message;
  if (cantidad > 0) for (const l of creadas) await db.rpc("sg_mover_stock", { p_linea: l.id, p_delta: cantidad, p_motivo: "entrada", p_nota: "Stock inicial" });
  return null;
}

// Crea el modelo y una línea de stock por cada talla × color con la cantidad inicial indicada.
export async function crearPrenda(_: unknown, form: FormData) {
  const p = nuevaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false as const, error: "Revisa los campos obligatorios" };

  const tallas = String(form.get("tallas") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const colores = String(form.get("colores") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const cantidad = Math.max(0, Math.floor(Number(form.get("cantidad") ?? 0)));

  const err = await insertarModelo(
    await supabaseServer(),
    { ...p.data, gramaje: p.data.gramaje, proveedor: p.data.proveedor || undefined, tallas: tallas.length ? tallas : ["U"], colores: colores.length ? colores : ["único"] },
    cantidad,
    p.data.stock_minimo,
  );
  if (err) return { ok: false as const, error: err };
  revalidatePath("/inventario");
  return { ok: true as const };
}

// Catálogo inicial de Camis24h (cantidades a 0: se rellenan con el recuento real).
// Solo el precio de la camiseta de 220 g está documentado (B&C #E220, 6,44 €); el resto queda en 0 para completarlo.
const STOCK_INICIAL: Modelo[] = [
  { nombre_oficial: "Camiseta 220 g/m² (B&C E220)", tipo: "camiseta", gramaje: 220, precio_compra: 6.44, proveedor: "Tuskamisetas", tallas: ["S", "M", "L", "XL"], colores: ["blanco", "negro"] },
  { nombre_oficial: "Camiseta 190 g/m²", tipo: "camiseta", gramaje: 190, precio_compra: 0, tallas: ["S", "M", "L", "XL"], colores: ["blanco", "negro"] },
  { nombre_oficial: "Sudadera algodón/poliéster", tipo: "sudadera", precio_compra: 0, tallas: ["S", "M", "L", "XL"], colores: ["negro", "gris"] },
  { nombre_oficial: "Polo", tipo: "polo", precio_compra: 0, tallas: ["M", "L", "XL"], colores: ["negro"] },
  { nombre_oficial: "Totebag", tipo: "totebag", precio_compra: 0, tallas: ["U"], colores: ["único"] },
];

export async function cargarStockInicial() {
  const db = await supabaseServer();
  const { count } = await db.from("sg_prendas").select("id", { count: "exact", head: true });
  if (count) return { ok: false as const, error: "Ya hay prendas en el inventario" };
  for (const m of STOCK_INICIAL) {
    const err = await insertarModelo(db, m, 0);
    if (err) return { ok: false as const, error: err };
  }
  revalidatePath("/inventario");
  return { ok: true as const };
}
