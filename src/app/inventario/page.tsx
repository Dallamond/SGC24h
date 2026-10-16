import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { eur, cn } from "@/lib/utils";
import { TALLA_LABEL } from "@/lib/types";
import { CantidadLinea, CargarInicial, CargarRecuento, MinimoPrenda, PrecioPrenda } from "./Editores";
import { PlancharBoton } from "@/components/PlancharBoton";
import { ImagenPrenda } from "@/components/ImagenPrenda";

export const dynamic = "force-dynamic";

interface Fila {
  linea_id: string; prenda_id: string; nombre_oficial: string; tipo: string; proveedor: string | null;
  gramaje: number | null; precio_compra: number; stock_minimo: number; talla: string; color: string;
  cantidad: number; valor: number; reponer: boolean;
}

const ORDEN_TALLA = ["XS", "S", "M", "L", "XL", "XXL", "U"];
const TIPO_LABEL: Record<string, string> = { camiseta: "Camisetas", sudadera: "Sudaderas", polo: "Polos", totebag: "Totebags", consumible: "Consumibles" };

export default async function Inventario() {
  const db = await supabaseServer();
  const { data, error } = await db.from("sg_v_stock").select("*").eq("activa", true).order("nombre_oficial");
  if (error) return <p className="card text-rust-dark">No se pudo leer el inventario: {error.message}</p>;
  const filas = (data ?? []) as Fila[];

  const total = filas.reduce((s, f) => s + Number(f.valor), 0);
  const unidades = filas.reduce((s, f) => s + f.cantidad, 0);
  const reponer = filas.filter((f) => f.reponer && f.tipo !== "consumible");

  // Fotos de los modelos (si la migración 0005 aún no está, simplemente no hay fotos).
  const { data: imgs } = await db.from("sg_prendas").select("id,imagen_path").not("imagen_path", "is", null);
  const conFoto = (imgs ?? []) as { id: string; imagen_path: string }[];
  const { data: firmadas } = conFoto.length ? await db.storage.from("adjuntos").createSignedUrls(conFoto.map((i) => i.imagen_path), 3600) : { data: [] };
  const fotoDe = new Map(conFoto.map((i, k) => [i.id, firmadas?.[k]?.signedUrl ?? null]));

  const prendas = new Map<string, Fila[]>();
  for (const f of filas) prendas.set(f.prenda_id, [...(prendas.get(f.prenda_id) ?? []), f]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Inventario</h1>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&>a]:shrink-0 [&>a]:whitespace-nowrap">
        <div className="hidden md:block"><PlancharBoton /></div>
        <Link href="/inventario/compra" className="btn-ghost !py-2">+ Compra</Link>
        <Link href="/inventario/nueva" className="btn-ghost !py-2">+ Prenda</Link>
        <Link href="/inventario/historial" className="btn-ghost !py-2">Historial</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card"><p className="text-sm text-ink/60">Valor en stock</p><p className="text-2xl font-bold">{eur(total)}</p></div>
        <div className="card"><p className="text-sm text-ink/60">Unidades</p><p className="text-2xl font-bold">{unidades}</p></div>
        <div className="card"><p className="text-sm text-ink/60">Modelos</p><p className="text-2xl font-bold">{prendas.size}</p></div>
        <div className="card"><p className="text-sm text-ink/60">A reponer</p><p className={cn("text-2xl font-bold", reponer.length > 0 && "text-rust-dark")}>{reponer.length}</p></div>
      </div>

      {!filas.length && <CargarInicial />}
      {filas.length > 0 && unidades === 0 && <CargarRecuento />}

      <div className="grid gap-4 lg:grid-cols-2">
        {[...prendas.values()].map((lineas) => {
          const p = lineas[0];
          const colores = [...new Set(lineas.map((l) => l.color))];
          const subtotal = lineas.reduce((s, l) => s + Number(l.valor), 0);
          return (
            <section key={p.prenda_id} className="card space-y-3">
              <div className="flex items-start gap-3">
                <ImagenPrenda prendaId={p.prenda_id} url={fotoDe.get(p.prenda_id) ?? null} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{p.nombre_oficial}</h2>
                  <p className="text-xs text-ink/50">{TIPO_LABEL[p.tipo]}{p.gramaje ? ` · ${p.gramaje} g/m²` : ""}{p.proveedor ? ` · ${p.proveedor}` : ""}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{eur(subtotal)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-paper p-2.5 text-sm">
                <label className="flex items-center gap-2 !text-ink">Compra € <PrecioPrenda prendaId={p.prenda_id} precio={Number(p.precio_compra)} /></label>
                <label className="flex items-center gap-2 !text-ink">Mínimo <MinimoPrenda prendaId={p.prenda_id} minimo={p.stock_minimo} /></label>
                {Number(p.precio_compra) === 0 && <span className="text-xs font-semibold text-rust-dark">⚠ precio sin definir</span>}
              </div>

              {colores.map((color) => (
                <div key={color}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/50">{color}</p>
                  <div className="flex flex-wrap gap-3">
                    {lineas
                      .filter((l) => l.color === color)
                      .sort((a, b) => ORDEN_TALLA.indexOf(a.talla) - ORDEN_TALLA.indexOf(b.talla))
                      .map((l) => (
                        <div key={l.linea_id} className="text-center">
                          <span className={cn("text-xs font-semibold", l.reponer ? "text-rust" : "text-ink/60")}>{TALLA_LABEL[l.talla] ?? l.talla}</span>
                          <CantidadLinea lineaId={l.linea_id} cantidad={l.cantidad} etiqueta={`${p.nombre_oficial} ${color} ${l.talla}`} />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
