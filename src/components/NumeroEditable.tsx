"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// Campo numérico que se guarda solo al salir (blur) o al pulsar Enter, si el valor ha cambiado.
export function NumeroEditable({
  valor, onGuardar, paso = 1, className, etiqueta,
}: {
  valor: number;
  onGuardar: (n: number) => Promise<{ ok: boolean; error?: string }>;
  paso?: number;
  className?: string;
  etiqueta: string;
}) {
  const [texto, setTexto] = useState(String(valor));
  const [estado, setEstado] = useState<"" | "ok" | "error">("");
  const [pendiente, start] = useTransition();

  function guardar() {
    const n = Number(texto.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n === valor) return setTexto(String(valor));
    start(async () => {
      const r = await onGuardar(n);
      setEstado(r.ok ? "ok" : "error");
      if (!r.ok) setTexto(String(valor));
      setTimeout(() => setEstado(""), 1500);
    });
  }

  return (
    <input
      aria-label={etiqueta}
      type="number"
      inputMode="decimal"
      min={0}
      step={paso}
      value={texto}
      disabled={pendiente}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn("!px-2 !py-1.5 text-center", estado === "ok" && "!border-sage bg-sage/10", estado === "error" && "!border-rust bg-rust/10", className)}
    />
  );
}
