"use client";

import { useActionState, useRef } from "react";
import { crearCliente } from "./actions";

export function NuevoCliente() {
  const ref = useRef<HTMLFormElement>(null);
  const [res, accion, pendiente] = useActionState(async (p: unknown, f: FormData) => {
    const r = await crearCliente(p, f);
    if (r.ok) ref.current?.reset();
    return r;
  }, null);

  return (
    <form ref={ref} action={accion} className="card grid gap-3 sm:grid-cols-5">
      <input name="nombre" required placeholder="Nombre" className="sm:col-span-2" />
      <input name="contacto" placeholder="Teléfono / usuario" />
      <select name="canal" defaultValue="">
        <option value="">Canal…</option>
        {["vinted", "instagram", "contacto", "web", "otro"].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input name="zona" placeholder="Zona" />
      <button className="btn sm:col-span-5" disabled={pendiente}>{pendiente ? "Guardando…" : "Añadir cliente"}</button>
      {res && !res.ok && <p className="text-sm text-rust-dark sm:col-span-5">{res.error}</p>}
    </form>
  );
}
