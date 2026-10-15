"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const refrescar = () => revalidatePath("/", "layout");

export async function crearTarea(form: FormData) {
  const p = z.object({ texto: z.string().trim().min(1).max(300), vence: z.string().optional() }).safeParse(Object.fromEntries(form));
  if (!p.success) return;
  const db = await supabaseServer();
  await db.from("sg_tareas").insert({ texto: p.data.texto, vence: p.data.vence || null });
  refrescar();
}

export async function completarTarea(id: string, completada: boolean) {
  z.string().uuid().parse(id);
  const db = await supabaseServer();
  await db.from("sg_tareas").update({ completada, completada_en: completada ? new Date().toISOString() : null }).eq("id", id);
  refrescar();
}

export async function borrarTarea(id: string) {
  z.string().uuid().parse(id);
  const db = await supabaseServer();
  await db.from("sg_tareas").delete().eq("id", id);
  refrescar();
}
