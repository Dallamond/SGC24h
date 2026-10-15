import { supabaseServer } from "@/lib/supabase/server";
import { lineaAForm, type Inicial } from "@/lib/pedidoForm";
import type { PedidoLinea } from "@/lib/types";
import type { PrendaOpt } from "./Formulario";

type Db = Awaited<ReturnType<typeof supabaseServer>>;

// Clientes y prendas (con los colores que existen en stock) para los desplegables del formulario.
export async function cargarOpciones(db: Db) {
  const [{ data: clientes }, { data: prendas }, { data: stock }] = await Promise.all([
    db.from("sg_clientes").select("id,nombre").order("nombre"),
    db.from("sg_prendas").select("id,nombre_oficial,gramaje,tipo").neq("tipo", "consumible").order("nombre_oficial"),
    db.from("sg_v_stock").select("prenda_id,color").neq("tipo", "consumible"),
  ]);

  const colores = new Map<string, Set<string>>();
  stock?.forEach((s) => colores.set(s.prenda_id, (colores.get(s.prenda_id) ?? new Set()).add(s.color)));
  const opts: PrendaOpt[] = (prendas ?? []).map((p) => ({ ...p, colores: [...(colores.get(p.id) ?? [])] }));
  return { clientes: clientes ?? [], prendas: opts };
}

// Datos de un pedido existente en el formato del formulario (para editarlo o duplicarlo).
export async function cargarInicial(db: Db, pedidoId: string) {
  const { data } = await db.from("sg_pedidos").select("*, sg_pedido_lineas(*)").eq("id", pedidoId).maybeSingle();
  if (!data) return null;
  const lineas = (data.sg_pedido_lineas as PedidoLinea[]).map(lineaAForm);
  const inicial: Inicial = {
    clienteId: data.cliente_id ?? "",
    lineas,
    envio: Number(data.envio) > 0 ? String(data.envio) : "",
    descuento: Number(data.descuento) > 0 ? String(data.descuento) : "",
    validez: String(data.validez_dias),
    entrega: data.fecha_entrega ?? "",
    notas: data.notas ?? "",
  };
  return { inicial, numero: data.numero as number };
}
