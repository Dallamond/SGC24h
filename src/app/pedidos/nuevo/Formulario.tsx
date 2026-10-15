"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TAMANOS_ZONA, calcularPrecio, type TamanoZona, type Vista, type ZonaPedido } from "@/lib/pricing";
import { TALLAS } from "@/lib/types";
import { eur } from "@/lib/utils";
import { crearPedido } from "../actions";

export interface PrendaOpt { id: string; nombre_oficial: string; gramaje: number | null; colores: string[] }

interface LineaForm {
  prendaId: string; // id de prenda, "libre" (fuera de inventario) o vacío
  libre: string;
  color: string;
  tallas: Record<string, number>;
  zonas: ZonaPedido[];
  precioManual: string; // vacío = usar el calculado
}

interface Borrador {
  clienteId: string; nuevoNombre: string; nuevoContacto: string;
  lineas: LineaForm[]; envio: string; descuento: string; validez: string; entrega: string; notas: string;
}

const LINEA_VACIA = (): LineaForm => ({ prendaId: "", libre: "", color: "", tallas: {}, zonas: [{ tamano: "normal-pequeno", vista: "delante" }], precioManual: "" });
const KEY = "sgc24h:borrador-presupuesto";
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")) || 0);

export function Formulario({ clientes, prendas, clienteInicial }: { clientes: { id: string; nombre: string }[]; prendas: PrendaOpt[]; clienteInicial: string }) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState(clienteInicial);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoContacto, setNuevoContacto] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([LINEA_VACIA()]);
  const [envio, setEnvio] = useState("");
  const [descuento, setDescuento] = useState("");
  const [validez, setValidez] = useState("15");
  const [entrega, setEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [cargado, setCargado] = useState(false);
  const [guardando, start] = useTransition();

  // Borrador local: si se corta la conexión o se cierra la pestaña, no se pierde el formulario.
  useEffect(() => {
    try {
      const b: Borrador | null = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (b) {
        if (!clienteInicial) setClienteId(b.clienteId);
        setNuevoNombre(b.nuevoNombre); setNuevoContacto(b.nuevoContacto); setLineas(b.lineas.length ? b.lineas : [LINEA_VACIA()]);
        setEnvio(b.envio); setDescuento(b.descuento); setValidez(b.validez); setEntrega(b.entrega); setNotas(b.notas);
      }
    } catch { /* sin borrador */ }
    setCargado(true);
  }, [clienteInicial]);

  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ clienteId, nuevoNombre, nuevoContacto, lineas, envio, descuento, validez, entrega, notas } satisfies Borrador));
    } catch { /* almacenamiento no disponible */ }
  }, [cargado, clienteId, nuevoNombre, nuevoContacto, lineas, envio, descuento, validez, entrega, notas]);

  const calculadas = useMemo(
    () =>
      lineas.map((l) => {
        const cantidad = Object.values(l.tallas).reduce((s, n) => s + n, 0);
        const precio = cantidad > 0 && l.zonas.length ? calcularPrecio(l.zonas, cantidad).precioUnitario : 0;
        const unitario = l.precioManual.trim() !== "" ? num(l.precioManual) : precio;
        return { cantidad, precio, unitario };
      }),
    [lineas],
  );

  const subtotal = calculadas.reduce((s, c) => s + c.unitario * c.cantidad, 0);
  const total = Math.max(0, subtotal + num(envio) - num(descuento));

  const setLinea = (i: number, patch: Partial<LineaForm>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const setZona = (i: number, k: number, patch: Partial<ZonaPedido>) =>
    setLinea(i, { zonas: lineas[i].zonas.map((z, j) => (j === k ? { ...z, ...patch } : z)) });

  function guardar() {
    setError("");
    const prendaPorId = new Map(prendas.map((p) => [p.id, p]));
    for (const [i, l] of lineas.entries()) {
      if (!l.prendaId) return setError(`Línea ${i + 1}: elige una prenda`);
      if (l.prendaId === "libre" && !l.libre.trim()) return setError(`Línea ${i + 1}: describe la prenda`);
      if (calculadas[i].cantidad < 1) return setError(`Línea ${i + 1}: indica al menos una talla con unidades`);
    }
    start(async () => {
      const r = await crearPedido({
        cliente_id: clienteId || null,
        cliente_nuevo: clienteId ? null : nuevoNombre.trim() ? { nombre: nuevoNombre, contacto: nuevoContacto } : null,
        lineas: lineas.map((l, i) => {
          const p = prendaPorId.get(l.prendaId);
          return {
            prenda_id: p?.id ?? null,
            descripcion: p
              ? [p.nombre_oficial, p.gramaje ? `${p.gramaje} g` : "", l.color].filter(Boolean).join(" · ")
              : [l.libre.trim(), l.color].filter(Boolean).join(" · "),
            tallas: Object.fromEntries(Object.entries(l.tallas).filter(([, n]) => n > 0)),
            cantidad: calculadas[i].cantidad,
            zonas: l.zonas,
            precio_unitario: calculadas[i].unitario,
            precio_calculado: calculadas[i].precio,
          };
        }),
        envio: num(envio),
        descuento: num(descuento),
        validez_dias: Math.max(1, Math.floor(num(validez)) || 15),
        fecha_entrega: entrega || null,
        notas: notas.trim() || null,
      });
      if (!r.ok) return setError(r.error);
      try { localStorage.removeItem(KEY); } catch { /* nada */ }
      router.push(`/pedidos/${r.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nuevo presupuesto</h1>

      <section className="card space-y-3">
        <h2 className="font-bold">Cliente</h2>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">+ Cliente nuevo…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {!clienteId && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" />
            <input value={nuevoContacto} onChange={(e) => setNuevoContacto(e.target.value)} placeholder="Teléfono / usuario" />
          </div>
        )}
      </section>

      {lineas.map((l, i) => {
        const prenda = prendas.find((p) => p.id === l.prendaId);
        const c = calculadas[i];
        return (
          <section key={i} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Línea {i + 1}</h2>
              {lineas.length > 1 && <button className="text-sm text-ink/50 hover:text-rust" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}>Quitar</button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={l.prendaId} onChange={(e) => setLinea(i, { prendaId: e.target.value, color: "" })}>
                <option value="">Prenda…</option>
                <option value="libre">Otra (fuera de inventario)</option>
                {prendas.map((p) => <option key={p.id} value={p.id}>{p.nombre_oficial}{p.gramaje ? ` · ${p.gramaje} g` : ""}</option>)}
              </select>
              {l.prendaId === "libre" && <input className="sm:col-span-2" value={l.libre} onChange={(e) => setLinea(i, { libre: e.target.value })} placeholder="Descripción: camiseta blanca 190 g" />}
              <>
                <input list={`colores-${i}`} value={l.color} onChange={(e) => setLinea(i, { color: e.target.value })} placeholder="Color" />
                <datalist id={`colores-${i}`}>{prenda?.colores.map((col) => <option key={col} value={col} />)}</datalist>
              </>
            </div>

            <div>
              <label>Tallas y unidades</label>
              <div className="mt-1 grid grid-cols-6 gap-2">
                {TALLAS.map((t) => (
                  <div key={t} className="text-center">
                    <span className="text-xs font-semibold text-ink/60">{t}</span>
                    <input type="number" min={0} inputMode="numeric" className="!px-1 text-center" value={l.tallas[t] ?? ""}
                      onChange={(e) => setLinea(i, { tallas: { ...l.tallas, [t]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label>Estampados (el primero va incluido en el precio base)</label>
              {l.zonas.map((z, k) => (
                <div key={k} className="flex gap-2">
                  <select value={z.tamano} onChange={(e) => setZona(i, k, { tamano: e.target.value as TamanoZona })}>
                    {Object.entries(TAMANOS_ZONA).map(([id, t]) => <option key={id} value={id}>{t.label} · {t.medida}</option>)}
                  </select>
                  <select className="!w-32" value={z.vista} onChange={(e) => setZona(i, k, { vista: e.target.value as Vista })}>
                    <option value="delante">Delante</option><option value="espalda">Espalda</option>
                  </select>
                  {l.zonas.length > 1 && <button className="px-2 text-ink/40 hover:text-rust" onClick={() => setLinea(i, { zonas: l.zonas.filter((_, j) => j !== k) })} aria-label="Quitar zona">✕</button>}
                </div>
              ))}
              <button className="text-sm font-semibold text-rust" onClick={() => setLinea(i, { zonas: [...l.zonas, { tamano: "normal-pequeno", vista: "espalda" }] })}>+ Otro diseño</button>
            </div>

            <div className="flex items-end justify-between gap-3 rounded-lg bg-paper p-3">
              <div className="w-36">
                <label>Precio ud (€)</label>
                <input inputMode="decimal" placeholder={String(c.precio)} value={l.precioManual} onChange={(e) => setLinea(i, { precioManual: e.target.value })} />
              </div>
              <p className="text-right text-sm text-ink/60">
                {c.cantidad} uds × {eur(c.unitario)}<br />
                <b className="text-lg text-ink">{eur(c.unitario * c.cantidad)}</b>
                {l.precioManual.trim() !== "" && c.precio !== c.unitario && <><br />propuesto {eur(c.precio)}</>}
              </p>
            </div>
          </section>
        );
      })}

      <button className="btn-ghost w-full" onClick={() => setLineas((ls) => [...ls, LINEA_VACIA()])}>+ Añadir otra prenda</button>

      <section className="card grid gap-3 sm:grid-cols-4">
        <div><label>Envío (€)</label><input inputMode="decimal" value={envio} onChange={(e) => setEnvio(e.target.value)} /></div>
        <div><label>Descuento (€)</label><input inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} /></div>
        <div><label>Validez (días)</label><input inputMode="numeric" value={validez} onChange={(e) => setValidez(e.target.value)} /></div>
        <div><label>Entrega</label><input type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} /></div>
        <div className="sm:col-span-4"><label>Notas</label><textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur">
        {error && <p className="mb-2 text-sm text-rust-dark">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-bold">{eur(total)}</p>
          <button className="btn" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar presupuesto"}</button>
        </div>
      </div>
    </div>
  );
}
