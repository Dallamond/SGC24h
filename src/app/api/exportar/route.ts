import { strToU8, zipSync } from "fflate";
import { aCsv } from "@/lib/csv";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Orden pensado para poder restaurar: primero lo que no depende de nada.
const TABLAS = [
  "sg_clientes", "sg_prendas", "sg_stock_lineas", "sg_stock_movimientos",
  "sg_pedidos", "sg_pedido_lineas", "sg_pedido_adjuntos", "sg_pagos", "sg_gastos", "sg_tareas",
] as const;

// Tablas de migraciones recientes: si aún no existen se exportan vacías en lugar de fallar.
const OPCIONALES = new Set<string>(["sg_pagos", "sg_gastos"]);

const PAGINA = 1000; // Supabase devuelve como máximo 1000 filas por consulta

export async function GET() {
  const db = await supabaseServer();
  const { data: sesion } = await db.auth.getUser();
  if (!sesion.user) return new Response("No autorizado", { status: 401 });

  const datos: Record<string, Record<string, unknown>[]> = {};
  for (const tabla of TABLAS) {
    const filas: Record<string, unknown>[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      // Orden estable por id para que la paginación no repita ni salte filas.
      const { data, error } = await db.from(tabla).select("*").order("id").range(desde, desde + PAGINA - 1);
      if (error) {
        if (OPCIONALES.has(tabla)) break;
        return new Response(`Error leyendo ${tabla}: ${error.message}`, { status: 500 });
      }
      filas.push(...(data as Record<string, unknown>[]));
      if (data.length < PAGINA) break;
    }
    datos[tabla] = filas;
  }

  const ahora = new Date();
  const archivos: Record<string, Uint8Array> = {
    "copia-completa.json": strToU8(JSON.stringify({ generada: ahora.toISOString(), tablas: datos }, null, 2)),
    "LEEME.txt": strToU8(
      [
        "Copia de seguridad de SGC24h (Camis24h)",
        `Generada: ${ahora.toLocaleString("es-ES")}`,
        "",
        "- *.csv: una hoja por tabla, para abrir con Excel (separador ';').",
        "- copia-completa.json: todos los datos sin perder tipos; es la que sirve para restaurar.",
        "- Las imágenes adjuntas (mockups) NO van dentro: están en Supabase → Storage → bucket «adjuntos».",
        "  sg_pedido_adjuntos.csv lista a qué pedido pertenece cada archivo.",
      ].join("\r\n"),
    ),
  };
  for (const tabla of TABLAS) archivos[`${tabla.replace("sg_", "")}.csv`] = strToU8(aCsv(datos[tabla]));

  const zip = zipSync(archivos);
  const sello = ahora.toISOString().slice(0, 10);
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sgc24h-copia-${sello}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
