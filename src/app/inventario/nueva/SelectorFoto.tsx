"use client";

import { useRef, useState } from "react";
import { subirImagenSuelta } from "@/lib/adjuntos";

// Foto opcional al crear un modelo: se sube al elegirla y la ruta viaja en un campo oculto.
export function SelectorFoto() {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("");
  const [vista, setVista] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function elegir(f: File | undefined) {
    if (!f) return;
    setOcupado(true);
    const p = await subirImagenSuelta(f, "prendas");
    setPath(p ?? "");
    setVista(p ? URL.createObjectURL(f) : "");
    setOcupado(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => input.current?.click()} disabled={ocupado} className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-dashed border-ink/25 bg-paper text-xs font-semibold text-ink/50">
        {vista ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista} alt="" className="h-full w-full object-cover" />
        ) : ocupado ? "Subiendo…" : "+ Foto"}
      </button>
      <p className="text-xs text-ink/50">Opcional. Con la cámara del móvil o desde la galería.</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => elegir(e.target.files?.[0])} />
      <input type="hidden" name="imagen_path" value={path} />
    </div>
  );
}
