"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { crearPrenda } from "../actions";
import { SelectorFoto } from "./SelectorFoto";

export default function NuevaPrenda() {
  const router = useRouter();
  const [res, accion, pendiente] = useActionState(async (p: unknown, f: FormData) => {
    const r = await crearPrenda(p, f);
    if (r.ok) router.push("/inventario");
    return r;
  }, null);

  return (
    <form action={accion} className="card mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">Nueva prenda</h1>
      <SelectorFoto />
      <div><label>Nombre oficial (el de la etiqueta)</label><input name="nombre_oficial" required placeholder="JHK TSRA 190" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label>Tipo</label><select name="tipo"><option value="camiseta">Camiseta</option><option value="sudadera">Sudadera</option><option value="polo">Polo</option><option value="totebag">Totebag</option><option value="consumible">Consumible</option></select></div>
        <div><label>Gramaje (g/m²)</label><input name="gramaje" type="number" inputMode="numeric" /></div>
        <div><label>Proveedor</label><input name="proveedor" /></div>
        <div><label>Tienda</label><input name="tienda" /></div>
        <div><label>Precio de compra (€/ud)</label><input name="precio_compra" type="number" step="0.01" inputMode="decimal" required /></div>
        <div><label>Stock mínimo</label><input name="stock_minimo" type="number" inputMode="numeric" defaultValue={0} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label>Tallas (coma)</label><input name="tallas" placeholder="S,M,L,XL" /></div>
        <div><label>Colores (coma)</label><input name="colores" placeholder="blanco,negro" /></div>
        <div><label>Uds por línea</label><input name="cantidad" type="number" inputMode="numeric" defaultValue={0} /></div>
      </div>
      <p className="text-xs text-ink/50">Crea una línea de stock por cada talla × color con esas unidades iniciales. Para consumibles deja tallas y colores vacíos.</p>
      {res && !res.ok && <p className="text-sm text-rust-dark">{res.error}</p>}
      <button className="btn w-full" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
