"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fijarImagen } from "@/app/inventario/actions";
import { subirImagenSuelta } from "@/lib/adjuntos";
import { cn } from "@/lib/utils";

// Miniatura de un modelo. Al pulsar: cámara o galería (en el móvil), sube la foto y la asigna.
export function ImagenPrenda({ prendaId, url, className }: { prendaId: string; url: string | null; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function elegir(f: File | undefined) {
    if (!f) return;
    setOcupado(true);
    setError("");
    const path = await subirImagenSuelta(f, "prendas");
    if (!path) setError("No se pudo subir");
    else {
      const r = await fijarImagen(prendaId, path);
      if (!r.ok) setError(r.error);
    }
    if (input.current) input.current.value = "";
    setOcupado(false);
    router.refresh();
  }

  return (
    <div className={cn("shrink-0", className)}>
      <button type="button" onClick={() => input.current?.click()} disabled={ocupado} aria-label={url ? "Cambiar foto" : "Añadir foto"}
        className="relative block h-16 w-16 overflow-hidden rounded-xl border border-ink/10 bg-paper text-ink/30 active:scale-95">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8h3l2-3h8l2 3h3v12H3zM12 17a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        )}
        {ocupado && <span className="absolute inset-0 grid place-items-center bg-white/70 text-[10px] font-semibold text-ink">…</span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => elegir(e.target.files?.[0])} />
      {error && <p className="mt-1 max-w-16 text-[10px] leading-tight text-rust-dark">{error}</p>}
    </div>
  );
}
