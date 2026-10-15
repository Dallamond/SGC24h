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
type Resultado = { ok: true; id: string } | { ok: false; error: string };
type Db = Awaited<ReturnType<typeof supabaseServer>>;

const r2 = (n: number) => Math.round(n * 100) / 100;
const refrescar = () => revalidatePath("/", "layout");

async function resolverCliente(db: Db, d: NuevoPedido): Promise<{ id: string | null; error?: string }> {
  if (d.cliente_id) return { id: d.cliente_id };
  if (!d.cliente_nuevo) return { id: null, error: "Elige un cliente o crea uno nuevo" };
  const { data, error } = await db
    .from("sg_clientes")
    .insert({ nombre: d.cliente_nuevo.nombre, contacto: d.cliente_nuevo.contacto || null })
    .select("id")
    .single();
  return error ? { id: null, error: error.message } : { id: data.id };
}

// Total recalculado en el servidor y líneas listas para insertar (con la foto del coste de cada prenda).
async function prepararDatos(db: Db, d: NuevoPedido) {
  const subtotal = d.lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0);
  const total = r2(Math.max(0, subtotal + d.envio - d.descuento));

  // Precio de compra 0 = "sin definir" → coste desconocido (no se cuenta como beneficio total).
  const ids = [...new Set(d.lineas.map((l) => l.prenda_id).filter((x): x is string => !!x))];
  const costes = new Map<string, number>();
  if (ids.length) {
    const { data } = await db.from("sg_prendas").select("id,precio_compra").in("id", ids);
    data?.forEach((x) => Number(x.precio_compra) > 0 && costes.set(x.id, Number(x.precio_compra)));
  }

  const filas = (pedidoId: string) =>
    d.lineas.map((l) => ({
      ...l,
      color: l.color ? l.color.toLowerCase() : null,
      pedido_id: pedidoId,
      // Estampado propio y servicios no tienen coste de prenda: 0 conocido, no "desconocido".
      coste_unitario: l.tipo !== "prenda" ? 0 : l.prenda_id ? (costes.get(l.prenda_id) ?? null) : null,
    }));

  return { total, filas };
}

export async function crearPedido(input: NuevoPedido): Promise<Resultado> {
  const p = pedidoSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Faltan datos: revisa cliente, unidades y zonas de cada línea" };
  const d = p.data;
  const db = await supabaseServer();

  const cliente = await resolverCliente(db, d);
  if (cliente.error) return { ok: false, error: cliente.error };
  const { total, filas } = await prepararDatos(db, d);

  const { data: pedido, error } = await db
    .from("sg_pedidos")
    .insert({
      cliente_id: cliente.id,
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

  const { error: e2 } = await db.from("sg_pedido_lineas").insert(filas(pedido.id));
  if (e2) {
    await db.from("sg_pedidos").delete().eq("id", pedido.id);
    return { ok: false, error: e2.message };
  }

  refrescar();
  return { ok: true, id: pedido.id };
}

// Edita un pedido existente. Si ya había descontado stock, lo devuelve antes de cambiar las líneas
// y vuelve a descontar con las líneas nuevas (así el inventario siempre refleja el pedido actual).
export async function actualizarPedido(id: string, input: NuevoPedido): Promise<Resultado> {
  z.string().uuid().parse(id);
  const p = pedidoSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Faltan datos: revisa cliente, unidades y zonas de cada línea" };
  const d = p.data;
  const db = await supabaseServer();

  const { data: actual } = await db.from("sg_pedidos").select("numero,estado,stock_descontado").eq("id", id).single();
  if (!actual) return { ok: false, error: "Pedido no encontrado" };

  const cliente = await resolverCliente(db, d);
  if (cliente.error) return { ok: false, error: cliente.error };
  const { total, filas } = await prepararDatos(db, d);

  // Copia de las líneas antiguas por si la inserción de las nuevas falla.
  const { data: antiguas } = await db.from("sg_pedido_lineas").select("*").eq("pedido_id", id);

  if (actual.stock_descontado) await devolverStock(db, id, actual.numero);

  const { error } = await db
    .from("sg_pedidos")
    .update({ cliente_id: cliente.id, envio: d.envio, descuento: d.descuento, total, validez_dias: d.validez_dias, fecha_entrega: d.fecha_entrega || null, notas: d.notas || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await db.from("sg_pedido_lineas").delete().eq("pedido_id", id);
  const { error: e2 } = await db.from("sg_pedido_lineas").insert(filas(id));
  if (e2) {
    if (antiguas?.length) await db.from("sg_pedido_lineas").insert(antiguas);
    if (actual.stock_descontado) await descontarStock(db, id, actual.numero);
    return { ok: false, error: e2.message };
  }

  if (actual.estado !== "descartado" && ESTADOS.indexOf(actual.estado) >= ESTADOS.indexOf("listo")) {
    await descontarStock(db, id, actual.numero);
  }

  await recalcularPago(db, id); // el total puede haber cambiado: revisa si sigue pagado del todo
  refrescar();
  return { ok: true, id };
}

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

// Recalcula «cobrado», «pagado» y método a partir de los cobros registrados del pedido.
async function recalcularPago(db: Db, id: string) {
  const [{ data: ped }, { data: pagos, error }] = await Promise.all([
    db.from("sg_pedidos").select("total").eq("id", id).single(),
    db.from("sg_pagos").select("importe,metodo,fecha").eq("pedido_id", id).order("fecha").order("created_at"),
  ]);
  if (!ped || error) return false;
  const cobrado = r2((pagos ?? []).reduce((s, p) => s + Number(p.importe), 0));
  const completo = cobrado > 0 && cobrado >= Number(ped.total) - 0.005;
  const ultimo = pagos?.[pagos.length - 1];
  await db
    .from("sg_pedidos")
    .update({ anticipo: cobrado, pagado: completo, metodo_pago: completo ? (ultimo?.metodo ?? null) : null, pagado_en: completo ? new Date(ultimo?.fecha ?? Date.now()).toISOString() : null })
    .eq("id", id);
  return true;
}

export async function registrarPago(id: string, importe: number, metodo: "efectivo" | "bizum") {
  z.object({ id: z.string().uuid(), importe: z.number().positive().max(100000), metodo: z.enum(["efectivo", "bizum"]) }).parse({ id, importe, metodo });
  const db = await supabaseServer();
  const { error } = await db.from("sg_pagos").insert({ pedido_id: id, importe: r2(importe), metodo });
  if (error) return { ok: false as const, error: error.message };
  await recalcularPago(db, id);
  refrescar();
  return { ok: true as const };
}

export async function borrarPago(pagoId: string, pedidoId: string) {
  z.object({ pagoId: z.string().uuid(), pedidoId: z.string().uuid() }).parse({ pagoId, pedidoId });
  const db = await supabaseServer();
  await db.from("sg_pagos").delete().eq("id", pagoId);
  await recalcularPago(db, pedidoId);
  refrescar();
}

// Atajo de los botones «Pagado en efectivo/Bizum»: cobra lo que falte (o quita todos los cobros).
export async function marcarPagado(id: string, pagado: boolean, metodo: "efectivo" | "bizum" | null) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  const { data: ped } = await db.from("sg_pedidos").select("total,anticipo").eq("id", id).single();
  if (!ped) return;

  if (pagado) {
    const resto = r2(Number(ped.total) - Number(ped.anticipo ?? 0));
    const { error } = resto > 0 ? await db.from("sg_pagos").insert({ pedido_id: id, importe: resto, metodo: metodo ?? "efectivo" }) : { error: null };
    if (!error && (await recalcularPago(db, id))) return refrescar();
    // Sin la tabla de cobros (migración 0004 pendiente) se mantiene el comportamiento anterior.
    await db.from("sg_pedidos").update({ pagado: true, metodo_pago: metodo, pagado_en: new Date().toISOString() }).eq("id", id);
  } else {
    await db.from("sg_pagos").delete().eq("pedido_id", id);
    await db.from("sg_pedidos").update({ pagado: false, metodo_pago: null, pagado_en: null, anticipo: 0 }).eq("id", id);
  }
  refrescar();
}

export async function marcarDtf(id: string, recogido: boolean) {
  z.object({ id: z.string().uuid() }).parse({ id });
  const db = await supabaseServer();
  await db.from("sg_pedidos").update({ dtf_recogido: recogido }).eq("id", id);
  refrescar();
}
