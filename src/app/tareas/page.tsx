import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { borrarTarea, completarTarea, crearTarea } from "./actions";

export const dynamic = "force-dynamic";

interface Tarea { id: string; texto: string; vence: string | null; completada: boolean; completada_en: string | null }

export default async function Tareas() {
  const db = await supabaseServer();
  const { data, error } = await db.from("sg_tareas").select("*").order("created_at", { ascending: false });
  if (error) return <p className="card text-rust-dark">No se pudo leer: {error.message}. ¿Has ejecutado <code>0002_tareas_stats_totebag.sql</code>?</p>;
  const tareas = (data ?? []) as Tarea[];
  const pendientes = tareas.filter((t) => !t.completada).sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999"));
  const hechas = tareas.filter((t) => t.completada).slice(0, 15);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Tareas</h1>

      <form action={crearTarea} className="card flex flex-wrap gap-2">
        <input name="texto" required maxLength={300} placeholder="Ej. Comprar polvo DTF, llamar a Nasser…" className="min-w-0 flex-1 basis-60" />
        <input name="vence" type="date" className="!w-40" aria-label="Fecha límite" />
        <button className="btn">Añadir</button>
      </form>

      <ul className="space-y-2">
        {pendientes.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 !p-3">
            <form action={completarTarea.bind(null, t.id, true)}>
              <button aria-label="Marcar como hecha" className="h-6 w-6 rounded-full border-2 border-ink/30 hover:border-sage hover:bg-sage/10" />
            </form>
            <span className="flex-1">{t.texto}</span>
            {t.vence && (
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", t.vence < hoy ? "bg-rust/10 text-rust-dark" : "bg-ink/5 text-ink/60")}>
                {new Date(t.vence).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
            )}
            <form action={borrarTarea.bind(null, t.id)}><button className="px-1 text-ink/30 hover:text-rust" aria-label="Borrar">✕</button></form>
          </li>
        ))}
        {!pendientes.length && <li className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-ink/40">Nada pendiente 🎉</li>}
      </ul>

      {hechas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Completadas</h2>
          <ul className="space-y-1.5">
            {hechas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-1 text-ink/50">
                <form action={completarTarea.bind(null, t.id, false)}>
                  <button aria-label="Reabrir" className="flex h-6 w-6 items-center justify-center rounded-full bg-sage text-xs text-white">✓</button>
                </form>
                <span className="flex-1 line-through">{t.texto}</span>
                <form action={borrarTarea.bind(null, t.id)}><button className="px-1 hover:text-rust" aria-label="Borrar">✕</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
