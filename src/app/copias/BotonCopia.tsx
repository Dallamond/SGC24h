"use client";

import { useEffect, useState } from "react";

const KEY = "sgc24h:ultima-copia";

function hace(ms: number) {
  const dias = Math.floor((Date.now() - ms) / 864e5);
  return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
}

export function BotonCopia() {
  const [ultima, setUltima] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { const v = Number(localStorage.getItem(KEY)); if (v) setUltima(v); } catch { /* sin almacenamiento */ }
  }, []);

  async function descargar() {
    setDescargando(true);
    setError("");
    try {
      const res = await fetch("/api/exportar");
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sgc24h-copia-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      const ahora = Date.now();
      setUltima(ahora);
      try { localStorage.setItem(KEY, String(ahora)); } catch { /* nada */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la copia");
    }
    setDescargando(false);
  }

  const vieja = ultima !== null && Date.now() - ultima > 7 * 864e5;
  return (
    <div className="space-y-2">
      <button className="btn" onClick={descargar} disabled={descargando}>{descargando ? "Preparando copia…" : "Descargar copia completa"}</button>
      <p className={vieja || ultima === null ? "text-sm font-semibold text-rust-dark" : "text-sm text-sage-dark"}>
        {ultima === null ? "Aún no has descargado ninguna copia desde este navegador." : `Última copia desde este navegador: ${hace(ultima)}${vieja ? " — toca hacer otra" : ""}.`}
      </p>
      {error && <p className="text-sm text-rust-dark">{error}</p>}
    </div>
  );
}
