import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "node:fs";
import path from "node:path";
import QR from "qrcode";
import { Documento } from "./Documento";

describe("Documento PDF", () => {
  it("genera un PDF válido con camisetas dibujadas", async () => {
    const buf = await renderToBuffer(
      Documento({
        tipo: "presupuesto",
        referencia: "C24H-0001",
        fecha: "15/10/2026",
        validezDias: 15,
        fechaEntrega: "22/10/2026",
        cliente: { nombre: "Cliente de prueba", contacto: "@prueba" },
        lineas: [
          { prenda_id: null, descripcion: "Camiseta 220 g · negro", tallas: { S: 2, M: 3 }, cantidad: 5, zonas: [{ tamano: "masivo", vista: "delante" }, { tamano: "manga", vista: "delante" }, { tamano: "normal-pequeno", vista: "espalda" }], precio_unitario: 20.5, precio_calculado: 20.5 },
          { prenda_id: null, descripcion: "Polo · negro", tallas: { L: 1 }, cantidad: 1, zonas: [{ tamano: "pecho-izq-pequeno", vista: "delante" }], precio_unitario: 18, precio_calculado: 18 },
          { tipo: "solo_estampado", prenda_id: null, descripcion: "Solo estampado · Camiseta negra del cliente", tallas: {}, cantidad: 2, zonas: [{ tamano: "normal-grande", vista: "delante" }], precio_unitario: 12, precio_calculado: 12 },
          { tipo: "servicio", prenda_id: null, descripcion: "Digitalización de diseño", tallas: {}, cantidad: 1, zonas: [], precio_unitario: 15, precio_calculado: 0 },
        ],
        imagenes: [await QR.toDataURL("mockup de prueba")],
        envio: 3, descuento: 2, total: 121.5, notas: "Entrega en mano",
        logoUrl: path.resolve("public/logo-blanco.png"),
        qrDataUrl: await QR.toDataURL("https://camis24h.store"),
        web: "https://camis24h.store",
      }),
    );
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, buf);
  });
});
