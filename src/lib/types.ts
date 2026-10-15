import type { ZonaPedido } from "@/lib/pricing";

export const ESTADOS = ["posible", "aprobado", "diseno", "produccion", "listo", "entregado"] as const;
export type Estado = (typeof ESTADOS)[number] | "descartado";

export const ESTADO_LABEL: Record<Estado, string> = {
  posible: "Posibles",
  aprobado: "Aprobados",
  diseno: "Diseño",
  produccion: "Producción",
  listo: "Listos",
  entregado: "Entregados",
  descartado: "Descartados",
};

export const TALLAS = ["XS", "S", "M", "L", "XL", "XXL", "U"] as const;
export const TALLA_LABEL: Record<string, string> = { U: "Única" };

export interface Cliente {
  id: string;
  nombre: string;
  contacto: string | null;
  zona: string | null;
  canal: string | null;
  notas: string | null;
}

export interface PedidoLinea {
  id?: string;
  prenda_id: string | null;
  descripcion: string;
  tallas: Record<string, number>;
  cantidad: number;
  zonas: ZonaPedido[];
  precio_unitario: number;
  precio_calculado: number;
}

export interface Pedido {
  id: string;
  numero: number;
  created_at: string;
  cliente_id: string | null;
  estado: Estado;
  dtf_recogido: boolean;
  fecha_entrega: string | null;
  envio: number;
  descuento: number;
  total: number;
  pagado: boolean;
  pagado_en: string | null;
  entregado_en: string | null;
  metodo_pago: "efectivo" | "bizum" | null;
  anticipo: number;
  validez_dias: number;
  notas: string | null;
}

export const refPedido = (n: number) => `C24H-${String(n).padStart(4, "0")}`;
