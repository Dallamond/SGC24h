import { supabaseServer } from "@/lib/supabase/server";
import { BotonCopia } from "./BotonCopia";

export const dynamic = "force-dynamic";

const TABLAS: [string, string][] = [
  ["sg_clientes", "Clientes"], ["sg_pedidos", "Pedidos"], ["sg_pedido_lineas", "Líneas de pedido"],
  ["sg_prendas", "Modelos de prenda"], ["sg_stock_lineas", "Líneas de stock"], ["sg_stock_movimientos", "Movimientos de stock"],
  ["sg_pedido_adjuntos", "Imágenes adjuntas"], ["sg_tareas", "Tareas"],
];

export default async function Copias() {
  const db = await supabaseServer();
  const cuentas = await Promise.all(TABLAS.map(([t]) => db.from(t).select("id", { count: "exact", head: true })));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Copias de seguridad</h1>

      <section className="card space-y-3">
        <p className="text-sm text-ink/70">
          Descarga todos los datos en un ZIP: un CSV por tabla (para abrir con Excel) y una copia completa en JSON.
          El plan gratuito de Supabase no hace copias automáticas, así que conviene descargarla <b>una vez por semana</b>
          y guardarla fuera del ordenador del local (Drive, por ejemplo).
        </p>
        <BotonCopia />
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Qué contiene ahora mismo</h2>
        <ul className="divide-y divide-ink/5 text-sm">
          {TABLAS.map(([, nombre], i) => (
            <li key={nombre} className="flex justify-between py-1.5">
              <span>{nombre}</span>
              <b>{cuentas[i].error ? "—" : cuentas[i].count}</b>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink/50">Las imágenes en sí no van en el ZIP: siguen en Supabase → Storage → «adjuntos». El CSV de adjuntos indica a qué pedido pertenece cada una.</p>
      </section>
    </div>
  );
}
