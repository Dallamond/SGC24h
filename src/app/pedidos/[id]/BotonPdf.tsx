"use client";

import { useState } from "react";
import { compartirPdf, descargarPdf } from "@/lib/pdf/descargar";
import type { DatosDocumento } from "@/lib/pdf/Documento";

export function BotonPdf({ datos, imagenes }: { datos: Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web" | "imagenes">; imagenes: string[] }) {
  const [cargando, setCargando] = useState<"" | "descargar" | "compartir">("");
  const [aviso, setAviso] = useState("");

  async function ejecutar(modo: "descargar" | "compartir") {
    setCargando(modo);
    setAviso("");
    try {
      if (modo === "descargar") await descargarPdf(datos, imagenes);
      else if (!(await compartirPdf(datos, imagenes, `Presupuesto ${datos.referencia} de Camis24h`))) setAviso("Este dispositivo no permite compartir archivos: se ha descargado el PDF.");
    } catch {
      setAviso("No se pudo generar el PDF");
    }
    setCargando("");
  }

  return (
    <div className="text-right">
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => ejecutar("compartir")} disabled={!!cargando}>{cargando === "compartir" ? "Preparando…" : "Compartir"}</button>
        <button className="btn" onClick={() => ejecutar("descargar")} disabled={!!cargando}>{cargando === "descargar" ? "Generando…" : "Descargar PDF"}</button>
      </div>
      {aviso && <p className="mt-1 text-sm text-ink/60">{aviso}</p>}
    </div>
  );
}
