"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const CATEGORIAS = ["prendas", "polvo", "film", "cinta", "otros"] as const;

const gastoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concepto: z.string().trim().min(1).max(200),
  categoria: z.enum(CATEGORIAS),
  importe: z.number().min(0).max(100000),
  pagado_por: z.string().trim().max(40).nullable(),
  proveedor: z.string().trim().max(80).nullable(),
  foto_path: z.string().max(200).nullable(),
});

export type NuevoGasto = z.infer<typeof gastoSchema>;

export async function crearGasto(input: NuevoGasto) {
  const p = gastoSchema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Revisa fecha, concepto e importe" };
  const db = await supabaseServer();
  const { error } = await db.from("sg_gastos").insert({ ...p.data, proveedor: p.data.proveedor || null, pagado_por: p.data.pagado_por || null });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function borrarGasto(id: string, fotoPath: string | null) {
  z.string().uuid().parse(id);
  const db = await supabaseServer();
  await db.from("sg_gastos").delete().eq("id", id);
  if (fotoPath) await db.storage.from("adjuntos").remove([fotoPath]);
  revalidatePath("/", "layout");
}
