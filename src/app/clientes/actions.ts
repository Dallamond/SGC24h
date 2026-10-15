"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  nombre: z.string().trim().min(1),
  contacto: z.string().trim().optional(),
  zona: z.string().trim().optional(),
  canal: z.enum(["vinted", "instagram", "contacto", "web", "otro"]).optional(),
  notas: z.string().trim().optional(),
});

const vacioNull = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v]));

export async function crearCliente(_: unknown, form: FormData) {
  const p = schema.safeParse(vacioNull(Object.fromEntries(form)));
  if (!p.success) return { ok: false as const, error: "El nombre es obligatorio" };
  const db = await supabaseServer();
  const { error } = await db.from("sg_clientes").insert(p.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/clientes");
  return { ok: true as const };
}

export async function guardarNotas(id: string, notas: string) {
  z.string().uuid().parse(id);
  const db = await supabaseServer();
  await db.from("sg_clientes").update({ notas: notas.trim() || null }).eq("id", id);
  revalidatePath(`/clientes/${id}`);
}
