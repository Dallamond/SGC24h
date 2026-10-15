"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { borrarAdjunto, subirAdjuntos } from "@/lib/adjuntos";

export interface AdjuntoItem { id: string; path: string; url: string; nombre: string | null }

export function Adjuntos({ pedidoId, items }: { pedidoId: string; items: AdjuntoItem[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    setOcupado(true);
    setAviso("");
    const lista = Array.from(files).slice(0, 8);
    const ok = await subirAdjuntos(pedidoId, lista);
    if (ok < lista.length) setAviso(`Solo se subieron ${ok} de ${lista.length} imágenes.`);
    if (input.current) input.current.value = "";
    setOcupado(false);
    router.refresh();
  }

  async function quitar(a: AdjuntoItem) {
    setOcupado(true);
    await borrarAdjunto(a.id, a.path);
    setOcupado(false);
    router.refresh();
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Imágenes adjuntas ({items.length})</h2>
        <button className="btn-ghost !py-1.5" disabled={ocupado} onClick={() => input.current?.click()}>{ocupado ? "Subiendo…" : "+ Añadir imágenes"}</button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      </div>
      {aviso && <p className="text-sm text-rust-dark">{aviso}</p>}
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <a href={a.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.nombre ?? "Imagen adjunta"} className="aspect-square w-full rounded-lg object-cover" />
              </a>
              <button className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full bg-ink/80 text-xs text-white" disabled={ocupado} onClick={() => quitar(a)} aria-label="Quitar imagen">✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/40">Sin imágenes. Los mockups que añadas aparecerán en el PDF.</p>
      )}
    </section>
  );
}
