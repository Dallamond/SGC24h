"use client";

import { useEffect, useMemo, useState } from "react";
import { TAMANOS_ZONA, type TamanoZona } from "@/lib/pricing";
import { calcularCoste, medidaZona, PARAMS_POR_DEFECTO, type ParamsCoste } from "@/lib/costes";
import { cn, eur } from "@/lib/utils";

export interface PrendaCalc { id: string; nombre_oficial: string; tipo: string; precio_compra: number; foto: string | null }
interface FilaDiseno { preset: TamanoZona | "custom"; ancho: string; alto: string }

const CLAVE = "sgc24h-calc-params";
const num = (s: string) => Number(s.replace(",", ".")) || 0;
const pct = (n: number) => `${Math.round(n * 100)} %`;

export function Calculadora({ prendas }: { prendas: PrendaCalc[] }) {
  const [prendaId, setPrendaId] = useState<string>(prendas[0]?.id ?? "");
  const [propia, setPropia] = useState(false); // la prenda la trae el cliente
  const [uds, setUds] = useState("1");
  const [disenos, setDisenos] = useState<FilaDiseno[]>([{ preset: "normal-grande", ancho: "", alto: "" }]);
  const [params, setParams] = useState<ParamsCoste>(PARAMS_POR_DEFECTO);
  const [ajustes, setAjustes] = useState(false);

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g) setParams({ ...PARAMS_POR_DEFECTO, ...JSON.parse(g) });
    } catch { /* sin almacenamiento: valores por defecto */ }
  }, []);
  function cambiarParams(p: ParamsCoste) {
    setParams(p);
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* ignorar */ }
  }

  const prenda = prendas.find((p) => p.id === prendaId);
  const res = useMemo(
    () =>
      calcularCoste(
        {
          precioPrenda: propia ? null : (prenda?.precio_compra ?? 0),
          unidades: Math.floor(num(uds)) || 1,
          disenos: disenos.map((d) => (d.preset === "custom" ? { ancho: num(d.ancho), alto: num(d.alto) } : medidaZona(d.preset))),
        },
        params,
      ),
    [prenda, propia, uds, disenos, params],
  );
  const cambiar = (i: number, c: Partial<FilaDiseno>) => setDisenos((ds) => ds.map((d, k) => (k === i ? { ...d, ...c } : d)));
  const sinPrecio = !propia && prenda && prenda.precio_compra === 0;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Calculadora</h1>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <label className="!text-ink">Prenda</label>
          <label className="flex items-center gap-2 !text-sm !text-ink/70">
            <input type="checkbox" checked={propia} onChange={(e) => setPropia(e.target.checked)} className="!h-4 !w-4" /> La trae el cliente
          </label>
        </div>
        {!propia && (
          <div className="flex items-center gap-3">
            {prenda?.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prenda.foto} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            )}
            <select value={prendaId} onChange={(e) => setPrendaId(e.target.value)}>
              {prendas.map((p) => <option key={p.id} value={p.id}>{p.nombre_oficial} · {eur(p.precio_compra)}</option>)}
            </select>
          </div>
        )}
        {sinPrecio && <p className="text-xs font-semibold text-rust-dark">⚠ Esta prenda no tiene precio de compra: ponlo en Inventario para que el coste sea real.</p>}
        <div className="w-32"><label>Unidades</label><input inputMode="numeric" value={uds} onChange={(e) => setUds(e.target.value)} /></div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Diseños DTF</h2>
        {disenos.map((d, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-paper p-2.5">
            <div className="flex items-center gap-2">
              <select value={d.preset} onChange={(e) => cambiar(i, { preset: e.target.value as FilaDiseno["preset"] })}>
                {(Object.keys(TAMANOS_ZONA) as TamanoZona[]).map((t) => <option key={t} value={t}>{TAMANOS_ZONA[t].label} · {TAMANOS_ZONA[t].medida}</option>)}
                <option value="custom">Medida personalizada…</option>
              </select>
              {disenos.length > 1 && <button className="px-2 text-ink/40" onClick={() => setDisenos((ds) => ds.filter((_, k) => k !== i))} aria-label="Quitar diseño">✕</button>}
            </div>
            {d.preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div><label>Ancho (cm)</label><input inputMode="decimal" value={d.ancho} onChange={(e) => cambiar(i, { ancho: e.target.value })} /></div>
                <div><label>Alto (cm)</label><input inputMode="decimal" value={d.alto} onChange={(e) => cambiar(i, { alto: e.target.value })} /></div>
              </div>
            )}
          </div>
        ))}
        <button className="btn-ghost w-full !py-2" onClick={() => setDisenos((ds) => [...ds, { preset: "pecho-izq-pequeno", ancho: "", alto: "" }])}>+ Otro diseño</button>
      </section>

      <section className="card space-y-3">
        <div className="rounded-xl bg-sage/10 p-4 text-center">
          <p className="text-sm text-sage-dark">Deberíais cobrar</p>
          <p className="text-4xl font-bold tracking-tight text-sage-dark">{eur(res.recomendadoUd)}<span className="text-base font-semibold"> /ud</span></p>
          {res.totalPedido > 0 && <p className="mt-1 text-sm text-ink/60">{eur(res.totalPedido)} el pedido · beneficio {eur(res.beneficioPedido)} ({pct(res.margen)})</p>}
        </div>

        {res.tarifaBaja && (
          <p className="rounded-lg bg-rust/10 p-2.5 text-sm font-semibold text-rust-dark">
            La tarifa oficial ({eur(res.tarifaUd ?? 0)}) no llega al margen del {pct(params.margenObjetivo)}. Se recomienda el mínimo.
          </p>
        )}

        <dl className="divide-y divide-ink/5 text-sm">
          <div className="flex justify-between py-1.5"><dt className="text-ink/60">{propia ? "Prenda (la trae el cliente)" : "Prenda"}</dt><dd>{eur(res.costePrenda)}</dd></div>
          <div className="flex justify-between py-1.5"><dt className="text-ink/60">Lámina DTF</dt><dd>{eur(res.costeDtf)}</dd></div>
          <div className="flex justify-between py-1.5"><dt className="text-ink/60">Planchado</dt><dd>{eur(res.costePlanchado)}</dd></div>
          <div className="flex justify-between py-1.5 font-bold"><dt>Coste de producción</dt><dd>{eur(res.costeUd)} /ud</dd></div>
          <div className="flex justify-between py-1.5"><dt className="text-ink/60">Tarifa oficial</dt><dd className={cn(res.tarifaBaja && "text-rust-dark")}>{res.tarifaUd !== null ? `${eur(res.tarifaUd)} /ud` : "—"}</dd></div>
          <div className="flex justify-between py-1.5"><dt className="text-ink/60">Mínimo para {pct(params.margenObjetivo)} de margen</dt><dd>{eur(res.minimoUd)} /ud</dd></div>
        </dl>
      </section>

      <section className="card">
        <button className="flex w-full items-center justify-between font-bold" onClick={() => setAjustes((v) => !v)}>
          Ajustes de coste <span className="text-ink/40">{ajustes ? "−" : "+"}</span>
        </button>
        {ajustes && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><label>Lámina (€)</label><input inputMode="decimal" defaultValue={params.laminaEur} onBlur={(e) => cambiarParams({ ...params, laminaEur: num(e.target.value) || PARAMS_POR_DEFECTO.laminaEur })} /></div>
            <div><label>Lámina (cm²)</label><input inputMode="numeric" defaultValue={params.laminaCm2} onBlur={(e) => cambiarParams({ ...params, laminaCm2: num(e.target.value) || PARAMS_POR_DEFECTO.laminaCm2 })} /></div>
            <div><label>Aprovechamiento (%)</label><input inputMode="numeric" defaultValue={Math.round(params.aprovechamiento * 100)} onBlur={(e) => cambiarParams({ ...params, aprovechamiento: Math.min(100, num(e.target.value) || 85) / 100 })} /></div>
            <div><label>Planchado (€/ud)</label><input inputMode="decimal" defaultValue={params.planchadoEur} onBlur={(e) => cambiarParams({ ...params, planchadoEur: num(e.target.value) })} /></div>
            <div><label>Margen mínimo (%)</label><input inputMode="numeric" defaultValue={Math.round(params.margenObjetivo * 100)} onBlur={(e) => cambiarParams({ ...params, margenObjetivo: Math.min(90, num(e.target.value)) / 100 })} /></div>
            <button className="btn-ghost self-end" onClick={() => { cambiarParams(PARAMS_POR_DEFECTO); setAjustes(false); }}>Restablecer</button>
            <p className="col-span-2 text-xs text-ink/50">Lámina 55×100 cm a 10 €. El aprovechamiento cuenta lo que se pierde en huecos entre diseños. Se guarda en este dispositivo.</p>
          </div>
        )}
      </section>
    </div>
  );
}
