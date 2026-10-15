"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { subirImagenSuelta } from "@/lib/adjuntos";
import { costeMedio } from "@/lib/compra";
import { TALLAS, TALLA_LABEL } from "@/lib/types";
import { eur } from "@/lib/utils";
import { registrarCompra } from "./actions";

export interface PrendaCompra { id: string; nombre: string; precio: number; stock: number; colores: string[]; tallas: string[] }

const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")) || 0);

export function FormCompra({ prendas }: { prendas: PrendaCompra[] }) {
  const [prendaId, setPrendaId] = useState("");
  const [color, setColor] = useState("");
  const [tallas, setTallas] = useState<Record<string, number>>({});
  const [coste, setCoste] = useState("");
  const [envio, setEnvio] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [proveedor, setProveedor] = useState("");
  const [pagadoPor, setPagadoPor] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const prenda = prendas.find((p) => p.id === prendaId);
  const uds = Object.values(tallas).reduce((s, n) => s + n, 0);
  const costeUd = num(coste) + (uds > 0 ? num(envio) / uds : 0);
  const total = num(coste) * uds + num(envio);
  const tallasMostradas = useMemo(() => TALLAS.filter((t) => t !== "U" || prenda?.tallas.includes("U")), [prenda]);

  function guardar() {
    setError("");
    if (!prenda) return setError("Elige una prenda");
    if (!color.trim()) return setError("Indica el color");
    if (uds < 1) return setError("Indica las unidades por talla");
    start(async () => {
      let foto_path: string | null = null;
      if (foto) {
        foto_path = await subirImagenSuelta(foto, "gastos");
        if (!foto_path) return setError("No se pudo subir la foto del ticket");
      }
      const r = await registrarCompra({
        prenda_id: prenda.id, color: color.trim(), tallas: Object.fromEntries(Object.entries(tallas).filter(([, n]) => n > 0)),
        coste_unitario: num(coste), envio: num(envio), fecha, proveedor: proveedor.trim() || null, pagado_por: pagadoPor || null, foto_path,
      });
      if (!r.ok) return setError(r.error);
      setHecho(`Compra registrada: ${r.unidades} uds · ${eur(r.importe)} · coste medio de la prenda ahora ${eur(r.precioMedio)}`);
      setTallas({}); setCoste(""); setEnvio(""); setFoto(null);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/inventario" className="text-sm text-ink/50 hover:text-rust">← Inventario</Link>
        <h1 className="text-2xl font-bold">Registrar compra de prendas</h1>
        <p className="text-sm text-ink/60">Suma las unidades al stock, recalcula el coste medio de la prenda y apunta el gasto.</p>
      </div>

      {hecho && <p className="card border-sage/40 bg-sage/10 text-sm font-semibold text-sage-dark">{hecho}</p>}

      <section className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Prenda</label>
            <select value={prendaId} onChange={(e) => { setPrendaId(e.target.value); setColor(""); setHecho(null); }}>
              <option value="">Elige…</option>
              {prendas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Color</label>
            <input list="colores-compra" value={color} onChange={(e) => setColor(e.target.value)} placeholder="negro" />
            <datalist id="colores-compra">{prenda?.colores.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        <div>
          <label>Unidades compradas por talla</label>
          <div className="mt-1 grid grid-cols-7 gap-2">
            {tallasMostradas.map((t) => (
              <div key={t} className="text-center">
                <span className="text-xs font-semibold text-ink/60">{TALLA_LABEL[t] ?? t}</span>
                <input type="number" min={0} inputMode="numeric" className="!px-1 text-center" value={tallas[t] ?? ""}
                  onChange={(e) => setTallas({ ...tallas, [t]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div><label>Precio por ud (€)</label><input inputMode="decimal" value={coste} onChange={(e) => setCoste(e.target.value)} /></div>
          <div><label>Envío total (€)</label><input inputMode="decimal" value={envio} onChange={(e) => setEnvio(e.target.value)} /></div>
          <div><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><label>Lo pagó</label><select value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)}><option value="">—</option><option>Lucas</option><option>Nasser</option></select></div>
          <div className="sm:col-span-2"><label>Proveedor / tienda</label><input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Tuskamisetas, Cobo Calleja…" /></div>
          <div className="sm:col-span-2"><label>Foto del ticket</label><input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></div>
        </div>

        {prenda && uds > 0 && (
          <div className="rounded-lg bg-paper p-3 text-sm">
            <p>{uds} uds · total <b>{eur(total)}</b> · coste real por unidad <b>{eur(costeUd)}</b></p>
            <p className="text-ink/60">
              Coste medio de la prenda: {prenda.precio > 0 ? `${eur(prenda.precio)} → ` : "sin definir → "}
              <b>{eur(costeMedio(prenda.stock, prenda.precio, uds, costeUd))}</b>
            </p>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-rust-dark">{error}</p>}
      <button className="btn w-full" onClick={guardar} disabled={pendiente}>{pendiente ? "Guardando…" : "Registrar compra"}</button>
    </div>
  );
}

