"use client";

import { useMemo, useState, useTransition } from "react";
import { moverStock } from "../actions";
import { cn } from "@/lib/utils";

export interface Linea { linea_id: string; nombre_oficial: string; color: string; talla: string; cantidad: number }

// Pantalla pensada para móvil o monitor del local: buscar, tocar y restar al coger la prenda.
export function Planchar({ lineas }: { lineas: Linea[] }) {
  const [filas, setFilas] = useState(lineas);
  const [q, setQ] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [pendiente, start] = useTransition();

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((f) => !t || `${f.nombre_oficial} ${f.color} ${f.talla}`.toLowerCase().includes(t));
  }, [filas, q]);

  function restar(l: Linea, n: number) {
    start(async () => {
      const r = await moverStock(l.linea_id, -n, "planchado");
      if (!r.ok) return setAviso({ texto: r.error, error: true });
      setFilas((fs) => fs.map((f) => (f.linea_id === l.linea_id ? { ...f, cantidad: r.cantidad } : f)));
      setAviso({ texto: `−${n} ${l.nombre_oficial} ${l.color} ${l.talla} · quedan ${r.cantidad}` });
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Planchar</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo, color o talla…" className="text-lg" />
      {aviso && <p className={cn("card text-sm font-semibold", aviso.error ? "text-rust-dark" : "text-sage-dark")}>{aviso.texto}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {visibles.map((l) => (
          <li key={l.linea_id} className="card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{l.nombre_oficial}</p>
              <p className="text-sm capitalize text-ink/60">{l.color} · {l.talla} · quedan <b className={cn(l.cantidad === 0 && "text-rust")}>{l.cantidad}</b></p>
            </div>
            <div className="flex gap-2">
              <button className="btn !px-4 text-lg" disabled={pendiente || l.cantidad < 1} onClick={() => restar(l, 1)}>−1</button>
              <button className="btn-ghost !px-3" disabled={pendiente || l.cantidad < 2} onClick={() => restar(l, 2)}>−2</button>
            </div>
          </li>
        ))}
        {!visibles.length && <li className="text-ink/50">Nada que coincida.</li>}
      </ul>
    </div>
  );
}
