import { supabaseServer } from "@/lib/supabase/server";
import { Formulario } from "./Formulario";
import { cargarInicial, cargarOpciones } from "./datos";
import { lineaDesdeCalculadora } from "@/lib/pedidoForm";

export const dynamic = "force-dynamic";

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ cliente?: string; duplicar?: string; prenda?: string; propia?: string; uds?: string; zonas?: string; precio?: string }> }) {
  const { cliente, duplicar, prenda, propia, uds, zonas, precio } = await searchParams;
  const db = await supabaseServer();
  const { clientes, prendas } = await cargarOpciones(db);
  const copia = duplicar ? await cargarInicial(db, duplicar) : null;

  // Desde la calculadora: una línea ya montada con prenda, zonas, unidades y precio.
  const desdeCalc = !copia && (prenda || propia) ? lineaDesdeCalculadora({ prenda, propia: !!propia, uds, zonas, precio }, prendas) : null;

  // Un pedido duplicado nace como presupuesto nuevo, sin fecha de entrega.
  return <Formulario clientes={clientes} prendas={prendas} clienteInicial={cliente ?? ""} inicial={copia ? { ...copia.inicial, entrega: "" } : desdeCalc ?? undefined} />;
}
