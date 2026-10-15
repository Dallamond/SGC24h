"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ESTADOS, refPedido } from "@/lib/types";
import { supabaseServer } from "@/lib/supabase/server";
import { planificarDescuento, type LineaNecesidad, type LineaStock } from "@/lib/stockPedido";

const zona = z.object({
  tamano: z.enum(["pecho-izq-pequeno", "pecho-izq-grande", "normal-pequeno", "normal-grande", "manga", "masivo"]),
  vista: z.enum(["delante", "espalda"]),
});

const linea = z
  .object({
    tipo: z.enum(["prenda", "solo_estampado", "servicio"]),
    prenda_id: z.string().uuid().nullable(),
    color: z.string().trim().nullable(),
    descripcion: z.string().trim().min(1),
    tallas: z.record(z.number().int().min(0)),
    cantidad: z.number().int().min(1).max(500),
    zonas: z.array(zona),
    precio_unitario: z.number().min(0),
    precio_calculado: z.number().min(0),
  })
  .refine((l) => l.tipo === "servicio" || l.zonas.length > 0, { message: "Falta al menos una zona de estampado" });

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
const refrescar = () => revalidatePath("/", "layout");

export async function crearPedido(input: NuevoPedido): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const p = pedidoSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Faltan datos: revisa cliente, unidades y zonas de cada línea" };
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

  // Foto del coste de compra de cada prenda al crear la línea. Precio 0 = "sin definir" → coste desconocido.
  const ids = [...new Set(d.lineas.map((l) => l.prenda_id).filter((x): x is string => !!x))];
  const costes = new Map<string, number>();
  if (ids.length) {
    const { data } = await db.from("sg_prendas").select("id,precio_compra").in("id", ids);
    data?.forEach((x) => Number(x.precio_compra) > 0 && costes.set(x.id, Number(x.precio_compra)));
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
    d.lineas.map((l) => ({
      ...l,
      color: l.color ? l.color.toLowerCase() : null,
      pedido_id: pedido.id,
      // Estampado propio y servicios no tienen coste de prenda: 0 conocido, no "desconocido".
      coste_unitario: l.tipo !== "prenda" ? 0 : l.prenda_id ? (costes.get(l.prenda_id) ?? null) : null,
    })),
  );
  if (e2) {
    await db.from("sg_pedidos").delete().eq("id", pedido.id);
    return { ok: false, error: e2.message };
  }

  refrescar();
  return { ok: true, id: pedido.id };
}

type Db = Awaited<ReturnType<typeof supabaseServer>>;

// Al llegar a "Listo" se restan del inventario las prendas del pedido (solo líneas tipo prenda).
async function descontarStock(db: Db, pedidoId: string, numero: number) {
  const { data: ls } = await db.from("sg_pedido_lineas").select("tipo,prenda_id,color,tallas").eq("pedido_id", pedidoId);
  const necesidades: LineaNecesidad[] = (ls ?? []).filter((l) => l.tipo === "prenda");
  const prendaIds = [...new Set(necesidades.map((l) => l.prenda_id).filter((x): x is string => !!x))];
  const stock: LineaStock[] = prendaIds.length
    ? (((await db.from("sg_stock_lineas").select("id,prenda_id,talla,color,cantidad").in("prenda_id", prendaIds)).data ?? []) as LineaStock[])
    : [];

  const plan = planificarDescuento(necesidades, stock);
  for (const m of plan.movimientos) {
    await db.rpc("sg_mover_stock", { p_linea: m.linea_id, p_delta: -m.unidades, p_motivo: "planchado", p_pedido: pedidoId, p_nota: `Pedido ${refPedido(numero)}` });
  }
  if (plan.faltas.length) {
    await db.from("sg_tareas").insert({ texto: `Revisar stock del pedido ${refPedido(numero)}: ${[...new Set(plan.faltas)].join("; ")}` });
  }
  await db.from("sg_pedidos").update({ stock_descontado: true }).eq("id", pedidoId);
}

// Si el pedido retrocede (o se descarta) después de descontar, se devuelve exactamente lo que se restó.
async function devolverStock(db: Db, pedidoId: string, numero: number) {
  // Saldo neto por línea (planchado − devoluciones anteriores): así nunca se devuelve dos veces.
  const { data: movs } = await db.from("sg_stock_movimientos").select("linea_id,delta").eq("pedido_id", pedidoId).in("motivo", ["planchado", "devolucion"]);
  const porLinea = new Map<string, number>();
  movs?.forEach((m) => porLinea.set(m.linea_id, (porLinea.get(m.linea_id) ?? 0) + m.delta));
  for (const [linea, neto] of porLinea) {
    if (neto < 0) await db.rpc("sg_mover_stock", { p_linea: linea, p_delta: -neto, p_motivo: "devolucion", p_pedido: pedidoId, p_nota: `Pedido ${refPedido(numero)} retrocedido` });
  }
  await db.from("sg_pedidos").update({ stock_descontado: false }).eq("id", pedidoId);
}

export async function cambiarEstado(id: string, estado: (typeof ESTADOS)[number] | "descartado") {
  z.object({ id: z.string().uuid(), estado: z.enum([...ESTADOS, "descartado"]) }).parse({ id, estado });
  const db = await supabaseServer();
  const { data: actual } = await db.from("sg_pedidos").select("numero,stock_descontado").eq("id", id).single();
  await db.from("sg_pedidos").update({ estado, entregado_en: estado === "entregado" ? new Date().toISOString() : null }).eq("id", id);

  if (actual) {
    const llegaAListo = estado !== "descartado" && ESTADOS.indexOf(estado) >= ESTADOS.indexOf("listo");
    if (llegaAListo && !actual.stock_descontado) await descontarStock(db, id, actual.numero);
    else if (!llegaAListo && actual.stock_descontado) await devolverStock(db, id, actual.numero);
  }
  refrescar();
}

export async function marcarPagado(id: string, pagado: boolean, metodo: "efectivo" | "bizum" | null) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ pagado, metodo_pago: pagado ? metodo : null, pagado_en: pagado ? new Date().toISOString() : null }).eq("id", id);
  refrescar();
}

export async function marcarDtf(id: string, recogido: boolean) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ dtf_recogido: recogido }).eq("id", id);
  refrescar();
}
