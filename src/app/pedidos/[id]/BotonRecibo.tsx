"use client";

import { useState } from "react";
import { compartirPdf, descargarPdf } from "@/lib/pdf/descargar";
import type { DatosDocumento } from "@/lib/pdf/Documento";

// Recibo de pago: lo cobrado, cómo se compone el precio por unidad y lo que falta (si falta algo).
export function BotonRecibo({ datos }: { datos: Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web" | "imagenes"> }) {
  const [cargando, setCargando] = useState<"" | "descargar" | "compartir">("");
  const [aviso, setAviso] = useState("");

  async function ejecutar(modo: "descargar" | "compartir") {
    setCargando(modo);
    setAviso("");
    try {
      if (modo === "descargar") await descargarPdf(datos);
      else if (!(await compartirPdf(datos, [], `Recibo ${datos.referencia} de Camis24h`))) setAviso("Este dispositivo no permite compartir archivos: se ha descargado el PDF.");
    } catch {
      setAviso("No se pudo generar el recibo");
    }
    setCargando("");
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => ejecutar("compartir")} disabled={!!cargando}>{cargando === "compartir" ? "Preparando…" : "Compartir recibo"}</button>
        <button className="btn-ghost" onClick={() => ejecutar("descargar")} disabled={!!cargando}>{cargando === "descargar" ? "Generando…" : "Descargar recibo"}</button>
      </div>
      {aviso && <p className="text-sm text-ink/60">{aviso}</p>}
    </div>
  );
}
