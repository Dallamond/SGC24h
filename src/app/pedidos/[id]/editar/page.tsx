import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { refPedido } from "@/lib/types";
import { Formulario } from "../../nuevo/Formulario";
import { cargarInicial, cargarOpciones } from "../../nuevo/datos";

export const dynamic = "force-dynamic";

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const [{ clientes, prendas }, datos] = await Promise.all([cargarOpciones(db), cargarInicial(db, id)]);
  if (!datos) notFound();

  return <Formulario clientes={clientes} prendas={prendas} clienteInicial="" inicial={datos.inicial} pedidoId={id} referencia={refPedido(datos.numero)} />;
}
