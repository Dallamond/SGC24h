import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ESTADO_LABEL, refPedido, type Pedido, type PedidoLinea } from "@/lib/types";
import { eur } from "@/lib/utils";
import { TAMANOS_ZONA } from "@/lib/pricing";
import { colorDe } from "@/lib/shirt";
import { ShirtPreview } from "@/components/ShirtPreview";
import { cambiarEstado, marcarPagado } from "../actions";
import { BotonPdf } from "./BotonPdf";
import { Adjuntos, type AdjuntoItem } from "./Adjuntos";

export const dynamic = "force-dynamic";

type LineaDb = PedidoLinea & { coste_unitario: number | null };

const ETIQUETA_TIPO = { solo_estampado: "Solo estampado", servicio: "Servicio" } as const;

export default async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data } = await db.from("sg_pedidos").select("*, sg_clientes(nombre,contacto), sg_pedido_lineas(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Pedido & { sg_clientes: { nombre: string; contacto: string | null } | null; sg_pedido_lineas: LineaDb[] };
  const lineas = p.sg_pedido_lineas;
  const ref = refPedido(p.numero);

  const { data: adj } = await db.from("sg_pedido_adjuntos").select("id,path,nombre").eq("pedido_id", id).order("created_at");
  const { data: firmadas } = adj?.length ? await db.storage.from("adjuntos").createSignedUrls(adj.map((a) => a.path), 3600) : { data: [] };
  const adjuntos: AdjuntoItem[] = (adj ?? []).flatMap((a, i) => {
    const url = firmadas?.[i]?.signedUrl;
    return url ? [{ id: a.id, path: a.path, nombre: a.nombre, url }] : [];
  });

  const coste = lineas.reduce((s, l) => s + Number(l.coste_unitario ?? 0) * l.cantidad, 0);
  const sinCoste = lineas.some((l) => l.coste_unitario === null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/pedidos" className="text-sm text-ink/50 hover:text-rust">← Pedidos</Link>
          <h1 className="text-2xl font-bold">{ref} · {p.sg_clientes?.nombre ?? "Sin cliente"}</h1>
          <p className="text-sm text-ink/60">{ESTADO_LABEL[p.estado]} · {new Date(p.created_at).toLocaleDateString("es-ES")}{p.pagado ? ` · pagado (${p.metodo_pago})` : " · sin pagar"}</p>
        </div>
        <BotonPdf
          imagenes={adjuntos.map((a) => a.url)}
          datos={{
            tipo: "presupuesto",
            referencia: ref,
            fecha: new Date(p.created_at).toLocaleDateString("es-ES"),
            validezDias: p.validez_dias,
            cliente: { nombre: p.sg_clientes?.nombre ?? "—", contacto: p.sg_clientes?.contacto },
            lineas,
            envio: Number(p.envio),
            descuento: Number(p.descuento),
            total: Number(p.total),
            notas: p.notas,
            fechaEntrega: p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString("es-ES") : null,
          }}
        />
      </div>

      <div className="card space-y-3">
        {lineas.map((l, i) => (
          <div key={i} className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/5 pb-3 last:border-0 last:pb-0">
            <div className="min-w-0 flex-1 basis-60">
              <p className="flex justify-between gap-2 font-semibold">
                <span>{l.tipo && l.tipo !== "prenda" && <span className="mr-2 rounded bg-ink/10 px-1.5 py-0.5 text-xs">{ETIQUETA_TIPO[l.tipo]}</span>}{l.descripcion}</span>
                <span>{eur(Number(l.precio_unitario) * l.cantidad)}</span>
              </p>
              <p className="text-sm text-ink/60">
                {l.cantidad} uds × {eur(Number(l.precio_unitario))}
                {Number(l.precio_unitario) !== Number(l.precio_calculado) && Number(l.precio_calculado) > 0 && ` (propuesto ${eur(Number(l.precio_calculado))})`}
                {Object.keys(l.tallas).length > 0 && " · " + Object.entries(l.tallas).filter(([, n]) => n > 0).map(([t, n]) => `${t}×${n}`).join(" ")}
              </p>
              {l.zonas.length > 0 && <p className="text-sm text-ink/60">{l.zonas.map((z) => `${TAMANOS_ZONA[z.tamano].label} (${z.vista})`).join(" · ")}</p>}
            </div>
            <ShirtPreview zonas={l.zonas} color={colorDe(l.descripcion)} />
          </div>
        ))}
        <div className="space-y-1 pt-1 text-sm">
          {Number(p.envio) > 0 && <p className="flex justify-between"><span>Envío</span><span>{eur(Number(p.envio))}</span></p>}
          {Number(p.descuento) > 0 && <p className="flex justify-between"><span>Descuento</span><span>−{eur(Number(p.descuento))}</span></p>}
          <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{eur(Number(p.total))}</span></p>
          {lineas.some((l) => l.coste_unitario !== null) && (
            <p className="flex justify-between text-ink/60">
              <span>Beneficio estimado{sinCoste ? " (faltan costes)" : ""}</span><span>{eur(Number(p.total) - coste)}</span>
            </p>
          )}
        </div>
        {p.notas && <p className="rounded-lg bg-ink/5 p-3 text-sm">{p.notas}</p>}
        {p.stock_descontado && <p className="text-xs font-semibold text-sage-dark">✓ Stock descontado del inventario</p>}
      </div>

      <Adjuntos pedidoId={id} items={adjuntos} />

      <div className="flex flex-wrap gap-2">
        <Link href={`/pedidos/${p.id}/editar`} className="btn-ghost">Editar</Link>
        <Link href={`/pedidos/nuevo?duplicar=${p.id}`} className="btn-ghost">Duplicar</Link>
        {!p.pagado && (
          <>
            <form action={marcarPagado.bind(null, p.id, true, "efectivo")}><button className="btn-ghost">Pagado en efectivo</button></form>
            <form action={marcarPagado.bind(null, p.id, true, "bizum")}><button className="btn-ghost">Pagado por Bizum</button></form>
          </>
        )}
        {p.pagado && <form action={marcarPagado.bind(null, p.id, false, null)}><button className="btn-ghost">Quitar pagado</button></form>}
        {p.estado === "descartado"
          ? <form action={cambiarEstado.bind(null, p.id, "posible")}><button className="btn-ghost">Recuperar</button></form>
          : <form action={cambiarEstado.bind(null, p.id, "descartado")}><button className="btn-ghost">Descartar</button></form>}
      </div>
    </div>
  );
}
