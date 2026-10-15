import { supabaseServer } from "@/lib/supabase/server";
import { Formulario } from "./Formulario";
import { cargarInicial, cargarOpciones } from "./datos";

export const dynamic = "force-dynamic";

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ cliente?: string; duplicar?: string }> }) {
  const { cliente, duplicar } = await searchParams;
  const db = await supabaseServer();
  const { clientes, prendas } = await cargarOpciones(db);
  const copia = duplicar ? await cargarInicial(db, duplicar) : null;

  // Un pedido duplicado nace como presupuesto nuevo, sin fecha de entrega.
  return <Formulario clientes={clientes} prendas={prendas} clienteInicial={cliente ?? ""} inicial={copia ? { ...copia.inicial, entrega: "" } : undefined} />;
}
