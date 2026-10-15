import { supabaseServer } from "@/lib/supabase/server";
import { Planchar, type Linea } from "./Planchar";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await supabaseServer();
  const { data } = await db.from("sg_v_stock").select("linea_id,nombre_oficial,color,talla,cantidad,tipo").eq("activa", true).neq("tipo", "consumible").order("nombre_oficial");
  return <Planchar lineas={(data ?? []) as Linea[]} />;
}
