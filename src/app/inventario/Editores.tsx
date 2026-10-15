"use client";

import { useState, useTransition } from "react";
import { NumeroEditable } from "@/components/NumeroEditable";
import { cargarRecuento, cargarStockInicial, fijarCantidad, fijarMinimo, fijarPrecio } from "./actions";

export const CantidadLinea = ({ lineaId, cantidad, etiqueta }: { lineaId: string; cantidad: number; etiqueta: string }) => (
  <NumeroEditable etiqueta={etiqueta} valor={cantidad} className="w-16" onGuardar={(n) => fijarCantidad(lineaId, Math.floor(n))} />
);

export const PrecioPrenda = ({ prendaId, precio }: { prendaId: string; precio: number }) => (
  <NumeroEditable etiqueta="Precio de compra" valor={precio} paso={0.01} className="w-20" onGuardar={(n) => fijarPrecio(prendaId, n)} />
);

export const MinimoPrenda = ({ prendaId, minimo }: { prendaId: string; minimo: number }) => (
  <NumeroEditable etiqueta="Stock mínimo" valor={minimo} className="w-16" onGuardar={(n) => fijarMinimo(prendaId, Math.floor(n))} />
);

export function CargarInicial() {
  const [error, setError] = useState("");
  const [pendiente, start] = useTransition();
  return (
    <div className="card space-y-3 text-center">
      <p className="font-semibold">El inventario está vacío</p>
      <p className="text-sm text-ink/60">
        Puedo cargar el catálogo base: camisetas 220 y 190 g (blanco/negro, S–XL), sudaderas algodón/poliéster (negro/gris),
        polos negros (M–XL) y totebags, todo a 0 unidades. Luego rellenas las cantidades y los precios.
      </p>
      <button className="btn" disabled={pendiente} onClick={() => start(async () => { const r = await cargarStockInicial(); if (!r.ok) setError(r.error); })}>
        {pendiente ? "Cargando…" : "Cargar catálogo base"}
      </button>
      {error && <p className="text-sm text-rust-dark">{error}</p>}
    </div>
  );
}

export function CargarRecuento() {
  const [msg, setMsg] = useState<{ texto: string; error?: boolean } | null>(null);
  const [pendiente, start] = useTransition();
  return (
    <div className="card space-y-3 text-center">
      <p className="font-semibold">Hay modelos pero todo está a 0 unidades</p>
      <p className="text-sm text-ink/60">Puedo cargar el recuento real del 15/10/2026 (181 prendas: 162 camisetas, 12 polos y 7 sudaderas).</p>
      <button className="btn" disabled={pendiente} onClick={() => start(async () => {
        const r = await cargarRecuento();
        setMsg(r.ok ? { texto: `Cargadas ${r.aplicadas} líneas de stock` } : { texto: r.error, error: true });
      })}>
        {pendiente ? "Cargando…" : "Cargar recuento del 15/10"}
      </button>
      {msg && <p className={msg.error ? "text-sm text-rust-dark" : "text-sm text-sage-dark"}>{msg.texto}</p>}
    </div>
  );
}
