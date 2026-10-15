import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { TAMANOS_ZONA } from "@/lib/pricing";
import type { PedidoLinea } from "@/lib/types";

export interface DatosDocumento {
  tipo: "presupuesto" | "factura";
  referencia: string;
  fecha: string; // DD/MM/AAAA
  validezDias?: number;
  cliente: { nombre: string; contacto?: string | null };
  lineas: PedidoLinea[];
  envio: number;
  descuento: number;
  total: number;
  notas?: string | null;
  logoUrl: string;
  qrDataUrl: string;
  web: string;
}

const C = { rust: "#C1502E", ink: "#1A1B1B", gris: "#6b6b6b", linea: "#e5e0d3" };
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: C.ink, fontFamily: "Helvetica" },
  cab: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 70, height: 70 },
  titulo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.rust, textAlign: "right" },
  meta: { textAlign: "right", color: C.gris, marginTop: 2 },
  bloque: { marginBottom: 16 },
  etiqueta: { color: C.gris, fontSize: 8, textTransform: "uppercase", marginBottom: 2 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.linea, paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold", color: C.gris, fontSize: 8, textTransform: "uppercase" },
  cDesc: { flex: 1 },
  cUds: { width: 36, textAlign: "right" },
  cPu: { width: 56, textAlign: "right" },
  cTot: { width: 64, textAlign: "right" },
  sub: { color: C.gris, fontSize: 8.5, marginTop: 2 },
  totales: { marginTop: 14, alignSelf: "flex-end", width: 200 },
  tFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  tTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.ink, marginTop: 4, paddingTop: 6, fontFamily: "Helvetica-Bold", fontSize: 13 },
  pie: { position: "absolute", left: 36, right: 36, bottom: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  qr: { width: 64, height: 64 },
  peq: { color: C.gris, fontSize: 8.5, maxWidth: 380 },
});

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

const textoTallas = (t: Record<string, number>) =>
  Object.entries(t).filter(([, n]) => n > 0).map(([k, n]) => `${k}×${n}`).join("  ");

const textoZonas = (l: PedidoLinea) =>
  l.zonas.map((z) => `${TAMANOS_ZONA[z.tamano].label} ${TAMANOS_ZONA[z.tamano].medida} (${z.vista})`).join(" · ");

export function Documento(d: DatosDocumento) {
  const esFactura = d.tipo === "factura";
  return (
    <Document title={`${esFactura ? "Factura" : "Presupuesto"} ${d.referencia}`}>
      <Page size="A4" style={s.page}>
        <View style={s.cab}>
          <Image src={d.logoUrl} style={s.logo} />
          <View>
            <Text style={s.titulo}>{esFactura ? "FACTURA" : "PRESUPUESTO"}</Text>
            <Text style={s.meta}>Nº {d.referencia}</Text>
            <Text style={s.meta}>Fecha: {d.fecha}</Text>
            {!esFactura && d.validezDias ? <Text style={s.meta}>Válido {d.validezDias} días</Text> : null}
          </View>
        </View>

        <View style={s.bloque}>
          <Text style={s.etiqueta}>Cliente</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.cliente.nombre}</Text>
          {d.cliente.contacto ? <Text>{d.cliente.contacto}</Text> : null}
        </View>

        <View style={[s.fila, { borderBottomColor: C.ink }]}>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cUds]}>Uds</Text>
          <Text style={[s.th, s.cPu]}>Precio ud</Text>
          <Text style={[s.th, s.cTot]}>Total</Text>
        </View>
        {d.lineas.map((l, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <View style={s.cDesc}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{l.descripcion}</Text>
              {textoTallas(l.tallas) ? <Text style={s.sub}>Tallas: {textoTallas(l.tallas)}</Text> : null}
              {l.zonas.length ? <Text style={s.sub}>Estampado: {textoZonas(l)}</Text> : null}
            </View>
            <Text style={s.cUds}>{l.cantidad}</Text>
            <Text style={s.cPu}>{eur(l.precio_unitario)}</Text>
            <Text style={s.cTot}>{eur(l.precio_unitario * l.cantidad)}</Text>
          </View>
        ))}

        <View style={s.totales}>
          {d.envio > 0 ? <View style={s.tFila}><Text>Envío</Text><Text>{eur(d.envio)}</Text></View> : null}
          {d.descuento > 0 ? <View style={s.tFila}><Text>Descuento</Text><Text>−{eur(d.descuento)}</Text></View> : null}
          <View style={s.tTotal}><Text>TOTAL</Text><Text>{eur(d.total)}</Text></View>
        </View>

        {d.notas ? <View style={[s.bloque, { marginTop: 18 }]}><Text style={s.etiqueta}>Notas</Text><Text>{d.notas}</Text></View> : null}

        <View style={s.pie} fixed>
          <View>
            <Text style={s.peq}>
              {esFactura
                ? "Documento comercial interno. No válido como factura fiscal hasta el alta de la actividad."
                : "Pago en efectivo o Bizum. Precios con impresión DTF incluida. Presupuesto sujeto a revisión del diseño."}
            </Text>
            <Text style={[s.peq, { color: C.rust, marginTop: 2 }]}>{d.web.replace("https://", "")}</Text>
          </View>
          <Image src={d.qrDataUrl} style={s.qr} />
        </View>
      </Page>
    </Document>
  );
}
