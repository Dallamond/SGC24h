"use client";

import { useState } from "react";
import { descargarPdf } from "@/lib/pdf/descargar";
import type { DatosDocumento } from "@/lib/pdf/Documento";

export function BotonPdf({ datos, imagenes }: { datos: Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web" | "imagenes">; imagenes: string[] }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function generar() {
    setCargando(true);
    setError("");
    try {
      await descargarPdf(datos, imagenes);
    } catch {
      setError("No se pudo generar el PDF");
    }
    setCargando(false);
  }

  return (
    <div className="text-right">
      <button className="btn" onClick={generar} disabled={cargando}>{cargando ? "Generando…" : "Descargar PDF"}</button>
      {error && <p className="mt-1 text-sm text-rust-dark">{error}</p>}
    </div>
  );
}
