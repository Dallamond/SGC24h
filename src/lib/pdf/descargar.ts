import type { DatosDocumento } from "./Documento";

export const WEB_CAMIS24H = "https://camis24h.store";

// Se carga bajo demanda: react-pdf pesa y solo hace falta al pulsar el botón.
export async function descargarPdf(d: Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web">) {
  const [{ pdf }, { Documento }, QR] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./Documento"),
    import("qrcode"),
  ]);
  const qrDataUrl = await QR.toDataURL(WEB_CAMIS24H, { margin: 0, width: 256 });
  const logoUrl = `${window.location.origin}/logo.png`;
  const blob = await pdf(Documento({ ...d, logoUrl, qrDataUrl, web: WEB_CAMIS24H })).toBlob();

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${d.tipo === "factura" ? "Factura" : "Presupuesto"}-${d.referencia}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
