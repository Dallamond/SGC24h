"use client";

import { useEffect, useRef, useState } from "react";

const fmt = {
  eur: (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n),
  int: (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n),
};

// Cifra que sube desde 0 (o desde su valor anterior) hasta el valor real. Sin animación si el sistema pide reducir movimiento.
export function NumeroAnimado({ valor, formato = "eur", duracion = 800 }: { valor: number; formato?: keyof typeof fmt; duracion?: number }) {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setMostrado(valor);
    const ini = performance.now();
    const origen = desde.current;
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - ini) / duracion);
      const ease = 1 - Math.pow(1 - k, 3);
      setMostrado(origen + (valor - origen) * ease);
      if (k < 1) raf = requestAnimationFrame(paso);
      else desde.current = valor;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);

  return <span className="tabular-nums">{fmt[formato](formato === "int" ? Math.round(mostrado) : mostrado)}</span>;
}
