import { TAMANOS_ZONA, type TamanoZona, type ZonaPedido } from "@/lib/pricing";
import type { PedidoLinea, TipoLinea } from "@/lib/types";

// Estado de una línea en el formulario de presupuesto.
export interface LineaForm {
  tipo: TipoLinea;
  prendaId: string; // id de prenda de inventario, "libre" (fuera de inventario) o vacío
  libre: string;    // descripción libre (prenda fuera de inventario, estampado propio o servicio)
  color: string;
  tallas: Record<string, number>;
  unidades: string; // estampado propio y servicios
  zonas: ZonaPedido[];
  precioManual: string; // vacío = usar el precio calculado
}

export interface Inicial {
  clienteId: string;
  lineas: LineaForm[];
  envio: string;
  descuento: string;
  validez: string;
  entrega: string;
  notas: string;
}

// Convierte una línea guardada en el estado del formulario (para editar o duplicar un pedido).
export function lineaAForm(l: PedidoLinea): LineaForm {
  const tipo = l.tipo ?? "prenda";
  const color = l.color ?? "";
  const sinColor = (d: string) => (color && d.toLowerCase().endsWith(` · ${color.toLowerCase()}`) ? d.slice(0, d.length - color.length - 3) : d);

  const libre =
    tipo === "prenda" ? (l.prenda_id ? "" : sinColor(l.descripcion))
    : tipo === "solo_estampado" ? l.descripcion.replace(/^Solo estampado · /, "")
    : l.descripcion;

  return {
    tipo,
    prendaId: tipo === "prenda" ? (l.prenda_id ?? "libre") : "",
    libre,
    color: tipo === "prenda" ? color : "",
    tallas: { ...l.tallas },
    unidades: String(l.cantidad),
    zonas: l.zonas,
    // Si el precio coincide con el propuesto se deja en blanco: así se recalcula al cambiar tallas o zonas.
    precioManual: Number(l.precio_unitario) !== Number(l.precio_calculado) ? String(l.precio_unitario) : "",
  };
}

const TAMANOS_VALIDOS = Object.keys(TAMANOS_ZONA);

// Presupuesto prellenado desde la calculadora (parámetros de la URL, todos opcionales y validados).
export function lineaDesdeCalculadora(
  q: { prenda?: string; propia: boolean; uds?: string; zonas?: string; precio?: string },
  prendas: { id: string; colores: string[] }[],
): Inicial {
  const zonas: ZonaPedido[] = (q.zonas ?? "").split(",").filter((t) => TAMANOS_VALIDOS.includes(t)).map((t) => ({ tamano: t as TamanoZona, vista: "delante" }));
  const uds = Math.max(1, Math.floor(Number(q.uds)) || 1);
  const precio = Number(q.precio);
  const modelo = q.propia ? undefined : prendas.find((p) => p.id === q.prenda);
  const linea: LineaForm = {
    tipo: modelo ? "prenda" : "solo_estampado",
    prendaId: modelo?.id ?? "",
    libre: "",
    color: modelo && modelo.colores.length === 1 ? modelo.colores[0] : "",
    tallas: {},
    unidades: String(uds),
    zonas: zonas.length ? zonas : [{ tamano: "normal-pequeno", vista: "delante" }],
    precioManual: precio > 0 && precio < 1000 ? String(precio) : "",
  };
  return { clienteId: "", lineas: [linea], envio: "", descuento: "", validez: "15", entrega: "", notas: "" };
}
