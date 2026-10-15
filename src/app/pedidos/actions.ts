"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ESTADOS } from "@/lib/types";
import { supabaseServer } from "@/lib/supabase/server";

const zona = z.object({
  tamano: z.enum(["pecho-izq-pequeno", "pecho-izq-grande", "normal-pequeno", "normal-grande", "manga", "masivo"]),
  vista: z.enum(["delante", "espalda"]),
});

const linea = z.object({
  prenda_id: z.string().uuid().nullable(),
  descripcion: z.string().trim().min(1),
  tallas: z.record(z.number().int().min(0)),
  cantidad: z.number().int().min(1).max(500),
  zonas: z.array(zona).min(1),
  precio_unitario: z.number().min(0),
  precio_calculado: z.number().min(0),
});

const pedidoSchema = z.object({
  cliente_id: z.string().uuid().nullable(),
  cliente_nuevo: z.object({ nombre: z.string().trim().min(1), contacto: z.string().trim().optional() }).nullable(),
  lineas: z.array(linea).min(1),
  envio: z.number().min(0),
  descuento: z.number().min(0),
  validez_dias: z.number().int().min(1).max(90),
  fecha_entrega: z.string().nullable(),
  notas: z.string().trim().nullable(),
});

export type NuevoPedido = z.infer<typeof pedidoSchema>;

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function crearPedido(input: NuevoPedido): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const p = pedidoSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Faltan datos: revisa cliente, tallas y zonas de cada línea" };
  const d = p.data;
  if (!d.cliente_id && !d.cliente_nuevo) return { ok: false, error: "Elige un cliente o crea uno nuevo" };

  const db = await supabaseServer();

  let clienteId = d.cliente_id;
  if (!clienteId && d.cliente_nuevo) {
    const { data, error } = await db
      .from("sg_clientes")
      .insert({ nombre: d.cliente_nuevo.nombre, contacto: d.cliente_nuevo.contacto || null })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    clienteId = data.id;
  }

  // El total se recalcula aquí: no se confía en el navegador.
  const subtotal = d.lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0);
  const total = r2(Math.max(0, subtotal + d.envio - d.descuento));

  // Foto del coste de compra de cada prenda al crear la línea.
  const ids = [...new Set(d.lineas.map((l) => l.prenda_id).filter((x): x is string => !!x))];
  const costes = new Map<string, number>();
  if (ids.length) {
    const { data } = await db.from("sg_prendas").select("id,precio_compra").in("id", ids);
    data?.forEach((x) => costes.set(x.id, Number(x.precio_compra)));
  }

  const { data: pedido, error } = await db
    .from("sg_pedidos")
    .insert({
      cliente_id: clienteId,
      envio: d.envio,
      descuento: d.descuento,
      total,
      validez_dias: d.validez_dias,
      fecha_entrega: d.fecha_entrega || null,
      notas: d.notas || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const { error: e2 } = await db.from("sg_pedido_lineas").insert(
    d.lineas.map((l) => ({ ...l, pedido_id: pedido.id, coste_unitario: l.prenda_id ? (costes.get(l.prenda_id) ?? null) : null })),
  );
  if (e2) {
    await db.from("sg_pedidos").delete().eq("id", pedido.id);
    return { ok: false, error: e2.message };
  }

  revalidatePath("/pedidos");
  return { ok: true, id: pedido.id };
}

export async function cambiarEstado(id: string, estado: (typeof ESTADOS)[number] | "descartado") {
  z.object({ id: z.string().uuid(), estado: z.enum([...ESTADOS, "descartado"]) }).parse({ id, estado });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ estado }).eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
}

export async function marcarPagado(id: string, pagado: boolean, metodo: "efectivo" | "bizum" | null) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ pagado, metodo_pago: pagado ? metodo : null }).eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
}

export async function marcarDtf(id: string, recogido: boolean) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ dtf_recogido: recogido }).eq("id", id);
  revalidatePath("/pedidos");
}
