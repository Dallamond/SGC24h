"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listarStock, moverStock, type LineaStockUi } from "@/app/inventario/actions";
import { TALLA_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDEN = ["XS", "S", "M", "L", "XL", "XXL", "U"];

// Botón verde "Planchar": abre un desplegable para elegir prenda, color, talla y unidades y restarlas del stock.
export function PlancharBoton({ className, icono }: { className?: string; icono?: React.ReactNode }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [lineas, setLineas] = useState<LineaStockUi[] | null>(null);
  const [prendaId, setPrendaId] = useState("");
  const [color, setColor] = useState("");
  const [talla, setTalla] = useState("");
  const [unidades, setUnidades] = useState("1");
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [pendiente, start] = useTransition();

  function abrir() {
    setAbierto(true);
    setAviso(null);
    start(async () => setLineas(await listarStock()));
  }

  const prendas = useMemo(() => [...new Map((lineas ?? []).map((l) => [l.prenda_id, l.nombre_oficial])).entries()], [lineas]);
  const delModelo = (lineas ?? []).filter((l) => l.prenda_id === prendaId);
  const colores = [...new Set(delModelo.map((l) => l.color))];
  const tallas = delModelo.filter((l) => l.color === color).sort((a, b) => ORDEN.indexOf(a.talla) - ORDEN.indexOf(b.talla));
  const seleccion = tallas.find((l) => l.talla === talla);
  const sinTalla = tallas.length === 1 && tallas[0].talla === "U";
  const n = Math.floor(Number(unidades));

  function elegirPrenda(id: string) {
    setPrendaId(id);
    setTalla("");
    const cs = [...new Set((lineas ?? []).filter((l) => l.prenda_id === id).map((l) => l.color))];
    setColor(cs.length === 1 ? cs[0] : "");
    setAviso(null);
  }

  function planchar() {
    const l = sinTalla ? tallas[0] : seleccion;
    if (!l) return setAviso({ texto: "Elige prenda, color y talla", error: true });
    if (!(n >= 1)) return setAviso({ texto: "Indica las unidades", error: true });
    start(async () => {
      const r = await moverStock(l.linea_id, -n, "planchado", "Planchado manual");
      if (!r.ok) return setAviso({ texto: r.error, error: true });
      setLineas((ls) => ls?.map((x) => (x.linea_id === l.linea_id ? { ...x, cantidad: r.cantidad } : x)) ?? null);
      setAviso({ texto: `−${n} · ${l.nombre_oficial} ${l.color}${l.talla !== "U" ? ` ${l.talla}` : ""} · quedan ${r.cantidad}` });
      setUnidades("1");
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={abrir} aria-label="Planchar" className={cn("inline-flex items-center justify-center rounded-lg bg-sage px-4 py-2 font-semibold text-white transition hover:bg-sage-dark active:scale-95", className)}>
        {icono ?? "Planchar"}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Planchar">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setAbierto(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-ink/10 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl md:inset-x-auto md:bottom-auto md:right-6 md:top-16 md:w-96 md:rounded-2xl md:border md:pb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Planchar</h2>
              <button className="px-2 text-ink/40 hover:text-ink" onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button>
            </div>

            {!lineas ? (
              <p className="py-6 text-center text-sm text-ink/50">Cargando inventario…</p>
            ) : !lineas.length ? (
              <p className="py-6 text-center text-sm text-ink/50">No hay prendas en el inventario.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label>Prenda</label>
                  <select value={prendaId} onChange={(e) => elegirPrenda(e.target.value)}>
                    <option value="">Elige…</option>
                    {prendas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                  </select>
                </div>

                {prendaId && (
                  <div>
                    <label>Color</label>
                    <select value={color} onChange={(e) => { setColor(e.target.value); setTalla(""); setAviso(null); }}>
                      <option value="">Elige…</option>
                      {colores.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                    </select>
                  </div>
                )}

                {prendaId && color && !sinTalla && (
                  <div>
                    <label>Talla</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {tallas.map((l) => (
                        <button
                          key={l.linea_id}
                          type="button"
                          disabled={l.cantidad < 1}
                          onClick={() => { setTalla(l.talla); setAviso(null); }}
                          className={cn("min-w-14 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-30", talla === l.talla ? "border-sage bg-sage text-white" : "border-ink/20 hover:border-sage")}
                        >
                          {TALLA_LABEL[l.talla] ?? l.talla}
                          <span className="block text-xs font-normal opacity-70">{l.cantidad} uds</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {prendaId && color && (sinTalla || talla) && (
                  <div>
                    <label>Unidades {sinTalla ? `(hay ${tallas[0].cantidad})` : seleccion ? `(hay ${seleccion.cantidad})` : ""}</label>
                    <input type="number" min={1} inputMode="numeric" value={unidades} onChange={(e) => setUnidades(e.target.value)} />
                  </div>
                )}

                {aviso && <p className={cn("rounded-lg p-2.5 text-sm font-semibold", aviso.error ? "bg-rust/10 text-rust-dark" : "bg-sage/10 text-sage-dark")}>{aviso.texto}</p>}

                <button
                  className="inline-flex w-full items-center justify-center rounded-lg bg-sage px-4 py-2.5 font-semibold text-white transition hover:bg-sage-dark active:scale-95 disabled:opacity-40"
                  disabled={pendiente || !prendaId || !color || (!sinTalla && !talla)}
                  onClick={planchar}
                >
                  {pendiente ? "Restando…" : "Restar del stock"}
                </button>
                <p className="text-xs text-ink/40">Los pedidos descuentan solos al pasar a «Listos». Usa esto solo para planchados sin pedido.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
