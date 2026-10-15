"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subirImagenSuelta } from "@/lib/adjuntos";
import { crearGasto } from "./actions";

const CATS = [["prendas", "Prendas"], ["polvo", "Polvo DTF"], ["film", "Film / láminas"], ["cinta", "Cinta"], ["otros", "Otros"]] as const;

export function FormGasto() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pendiente, start] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const importe = Number(String(f.get("importe")).replace(",", "."));
    if (!(importe >= 0)) return setError("Importe no válido");
    setError("");
    start(async () => {
      const foto = f.get("foto") as File | null;
      let foto_path: string | null = null;
      if (foto && foto.size > 0) {
        foto_path = await subirImagenSuelta(foto, "gastos");
        if (!foto_path) return setError("No se pudo subir la foto del ticket");
      }
      const r = await crearGasto({
        fecha: String(f.get("fecha")),
        concepto: String(f.get("concepto")),
        categoria: String(f.get("categoria")) as (typeof CATS)[number][0],
        importe,
        pagado_por: String(f.get("pagado_por") ?? "") || null,
        proveedor: String(f.get("proveedor") ?? "") || null,
        foto_path,
      });
      if (!r.ok) return setError(r.error);
      form.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={form} onSubmit={enviar} className="card grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2"><label>Concepto</label><input name="concepto" required placeholder="Polvo DTF 1 kg" /></div>
      <div><label>Importe (€)</label><input name="importe" inputMode="decimal" required /></div>
      <div><label>Fecha</label><input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
      <div><label>Categoría</label><select name="categoria" defaultValue="otros">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div><label>Lo pagó</label><select name="pagado_por" defaultValue=""><option value="">—</option><option>Lucas</option><option>Nasser</option></select></div>
      <div className="sm:col-span-2"><label>Proveedor / tienda</label><input name="proveedor" /></div>
      <div className="sm:col-span-3"><label>Foto del ticket</label><input name="foto" type="file" accept="image/*" capture="environment" /></div>
      <div className="flex items-end"><button className="btn w-full" disabled={pendiente}>{pendiente ? "Guardando…" : "Añadir gasto"}</button></div>
      {error && <p className="text-sm text-rust-dark sm:col-span-6">{error}</p>}
    </form>
  );
}
