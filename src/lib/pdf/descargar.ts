import type { DatosDocumento } from "./Documento";

export const WEB_CAMIS24H = "https://camis24h.store";

// Descarga una imagen y la convierte a data URL para incrustarla en el PDF (si falla, se omite).
async function aDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = ko;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Se carga bajo demanda: react-pdf pesa y solo hace falta al pulsar el botón.
export async function descargarPdf(d: Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web" | "imagenes">, urlsImagenes: string[] = []) {
  const [{ pdf }, { Documento }, QR, imagenes] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./Documento"),
    import("qrcode"),
    Promise.all(urlsImagenes.slice(0, 6).map(aDataUrl)),
  ]);
  const qrDataUrl = await QR.toDataURL(WEB_CAMIS24H, { margin: 0, width: 256 });
  const logoUrl = `${window.location.origin}/logo-blanco.png`;
  const blob = await pdf(
    Documento({ ...d, logoUrl, qrDataUrl, web: WEB_CAMIS24H, imagenes: imagenes.filter((x): x is string => !!x) }),
  ).toBlob();

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${d.tipo === "factura" ? "Factura" : "Presupuesto"}-${d.referencia}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
