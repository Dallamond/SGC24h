import { comprimirImagen } from "@/lib/comprimirImagen";
import { supabaseBrowser } from "@/lib/supabase/client";

// Sube imágenes (mockups, referencias) al bucket privado "adjuntos" y las registra en el pedido.
// Devuelve cuántas se subieron bien.
export async function subirAdjuntos(pedidoId: string, archivos: File[]): Promise<number> {
  const db = supabaseBrowser();
  let ok = 0;
  for (const f of archivos) {
    try {
      const blob = await comprimirImagen(f);
      const path = `${pedidoId}/${crypto.randomUUID()}.jpg`;
      const { error } = await db.storage.from("adjuntos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) continue;
      const { error: e2 } = await db.from("sg_pedido_adjuntos").insert({ pedido_id: pedidoId, path, nombre: f.name.slice(0, 80) });
      if (e2) {
        await db.storage.from("adjuntos").remove([path]);
        continue;
      }
      ok++;
    } catch {
      /* imagen ilegible: se omite */
    }
  }
  return ok;
}

export async function borrarAdjunto(id: string, path: string) {
  const db = supabaseBrowser();
  await db.storage.from("adjuntos").remove([path]);
  await db.from("sg_pedido_adjuntos").delete().eq("id", id);
}
