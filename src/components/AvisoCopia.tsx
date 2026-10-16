"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sgc24h:ultima-copia"; // la escribe BotonCopia al descargar una copia

// Recordatorio: si hace más de 7 días que este dispositivo no descarga una copia de seguridad.
export function AvisoCopia() {
  const [dias, setDias] = useState<number | null>(null);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      setDias(v ? Math.floor((Date.now() - v) / 864e5) : 999);
    } catch { /* sin almacenamiento: no se avisa */ }
  }, []);

  if (dias === null || dias < 7) return null;
  return (
    <Link href="/copias" className="flex animate-fade-up items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
      <span>💾 {dias >= 999 ? "Aún no has hecho ninguna copia de seguridad en este dispositivo" : `Hace ${dias} días de tu última copia de seguridad`}</span>
      <span className="shrink-0 text-amber-700">Hacer copia →</span>
    </Link>
  );
}
