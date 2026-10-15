import type { DatosDocumento } from "./Documento";

export const WEB_CAMIS24H = "https://camis24h.store";

type Datos = Omit<DatosDocumento, "logoUrl" | "qrDataUrl" | "web" | "imagenes">;

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
export async function generarPdf(d: Datos, urlsImagenes: string[] = []): Promise<{ blob: Blob; nombre: string }> {
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
  return { blob, nombre: `${d.tipo === "factura" ? "Factura" : "Presupuesto"}-${d.referencia}.pdf` };
}

export function descargarBlob(blob: Blob, nombre: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function descargarPdf(d: Datos, urlsImagenes: string[] = []) {
  const { blob, nombre } = await generarPdf(d, urlsImagenes);
  descargarBlob(blob, nombre);
}

// Abre el menú de compartir del móvil (WhatsApp, Instagram…) con el PDF adjunto.
// Devuelve false si el dispositivo no puede compartir archivos (en ese caso se descarga).
export async function compartirPdf(d: Datos, urlsImagenes: string[] = [], texto = ""): Promise<boolean> {
  const { blob, nombre } = await generarPdf(d, urlsImagenes);
  const file = new File([blob], nombre, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nombre, text: texto });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return true; // el usuario cerró el menú
    }
  }
  descargarBlob(blob, nombre);
  return false;
}
