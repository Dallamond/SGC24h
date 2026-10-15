import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import QR from "qrcode";
import { Documento } from "./Documento";

describe("Documento PDF", () => {
  it("genera un PDF válido", async () => {
    const buf = await renderToBuffer(
      Documento({
        tipo: "presupuesto",
        referencia: "C24H-0001",
        fecha: "15/10/2026",
        validezDias: 15,
        cliente: { nombre: "Cliente de prueba", contacto: "@prueba" },
        lineas: [
          { prenda_id: null, descripcion: "JHK 190 g · blanco", tallas: { S: 2, M: 3 }, cantidad: 5, zonas: [{ tamano: "masivo", vista: "delante" }, { tamano: "manga", vista: "delante" }], precio_unitario: 20.5, precio_calculado: 20.5 },
        ],
        envio: 3, descuento: 2, total: 103.5, notas: "Entrega en mano",
        logoUrl: path.resolve("public/logo.png"),
        qrDataUrl: await QR.toDataURL("https://camis24h.store"),
        web: "https://camis24h.store",
      }),
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
