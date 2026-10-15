import { Document, G, Image, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { TAMANOS_ZONA } from "@/lib/pricing";
import { COLOR_FILL, SHIRT_BODY, SHIRT_COLLAR, SHIRT_MATRIX, SHIRT_SEAMS, SHIRT_VIEWBOX, ZONA_RECT, colorDe, zonasDe } from "@/lib/shirt";
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
  fechaEntrega?: string | null;
  logoUrl: string;
  qrDataUrl: string;
  web: string;
}

const C = { rust: "#C1502E", ink: "#1A1B1B", gris: "#6b6b6b", linea: "#e5e0d3", fondo: "#F3EEE3" };

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 90, paddingHorizontal: 0, fontSize: 9.5, color: C.ink, fontFamily: "Helvetica" },
  banda: { backgroundColor: C.ink, paddingHorizontal: 36, paddingVertical: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 54, height: 54 },
  marca: { color: "#fff", fontSize: 18, fontFamily: "Helvetica-Bold" },
  marcaSub: { color: "#bdb8ac", fontSize: 8.5, marginTop: 2 },
  tipo: { color: C.rust, fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right", letterSpacing: 1 },
  tipoSub: { color: "#e8e3d6", fontSize: 9, textAlign: "right", marginTop: 3 },
  cuerpo: { paddingHorizontal: 36, paddingTop: 22 },
  datos: { flexDirection: "row", gap: 12, marginBottom: 20 },
  caja: { flex: 1, backgroundColor: C.fondo, borderRadius: 4, padding: 10 },
  etiqueta: { color: C.gris, fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  fuerte: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingBottom: 5, color: C.gris, fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.6 },
  linea: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.linea, paddingVertical: 10 },
  cDesc: { flex: 1, paddingRight: 8 },
  cCamis: { width: 128, flexDirection: "row", justifyContent: "center", gap: 4 },
  cUds: { width: 32, textAlign: "right" },
  cPu: { width: 56, textAlign: "right" },
  cTot: { width: 62, textAlign: "right", fontFamily: "Helvetica-Bold" },
  nombreLinea: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 },
  sub: { color: C.gris, fontSize: 8.5, marginTop: 2, lineHeight: 1.35 },
  totales: { marginTop: 14, alignSelf: "flex-end", width: 210 },
  tFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  tTotal: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.ink, color: "#fff", borderRadius: 4, marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, fontFamily: "Helvetica-Bold", fontSize: 13 },
  notas: { marginTop: 18, backgroundColor: C.fondo, borderRadius: 4, padding: 10 },
  pie: { position: "absolute", left: 36, right: 36, bottom: 28, borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qr: { width: 58, height: 58 },
  peq: { color: C.gris, fontSize: 8, lineHeight: 1.4, maxWidth: 400 },
});

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

const textoTallas = (t: Record<string, number>) =>
  Object.entries(t).filter(([, n]) => n > 0).map(([k, n]) => `${k} × ${n}`).join("   ");

function Camiseta({ linea, vista }: { linea: PedidoLinea; vista: "delante" | "espalda" }) {
  const color = colorDe(linea.descripcion);
  return (
    <View style={{ alignItems: "center" }}>
      <Svg viewBox={SHIRT_VIEWBOX} style={{ width: 60, height: 57 }}>
        <G transform={SHIRT_MATRIX}>
          <Path d={SHIRT_BODY} fill={COLOR_FILL[color]} stroke="#1A1B1B" strokeWidth={15} />
          <Path d={SHIRT_SEAMS} stroke="#1A1B1B" strokeWidth={15} />
          <Path d={SHIRT_COLLAR} fill={COLOR_FILL[color]} stroke="#1A1B1B" strokeWidth={15} />
        </G>
        {zonasDe(linea.zonas, vista).map((z, i) => {
          const r = ZONA_RECT[z.tamano];
          return <Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#C1502E" fillOpacity={0.6} stroke="#C1502E" strokeWidth={1.5} />;
        })}
      </Svg>
      <Text style={{ fontSize: 6.5, color: C.gris, textTransform: "uppercase", marginTop: 1 }}>{vista}</Text>
    </View>
  );
}

export function Documento(d: DatosDocumento) {
  const esFactura = d.tipo === "factura";
  const subtotal = d.lineas.reduce((a, l) => a + l.precio_unitario * l.cantidad, 0);

  return (
    <Document title={`${esFactura ? "Factura" : "Presupuesto"} ${d.referencia}`} author="Camis24h">
      <Page size="A4" style={s.page}>
        <View style={s.banda} fixed>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image src={d.logoUrl} style={s.logo} />
            <View>
              <Text style={s.marca}>camis24h</Text>
              <Text style={s.marcaSub}>Camisetas personalizadas DTF · Madrid</Text>
              <Text style={s.marcaSub}>camis24h@gmail.com</Text>
            </View>
          </View>
          <View>
            <Text style={s.tipo}>{esFactura ? "FACTURA" : "PRESUPUESTO"}</Text>
            <Text style={s.tipoSub}>Nº {d.referencia}</Text>
          </View>
        </View>

        <View style={s.cuerpo}>
          <View style={s.datos}>
            <View style={s.caja}>
              <Text style={s.etiqueta}>Cliente</Text>
              <Text style={s.fuerte}>{d.cliente.nombre}</Text>
              {d.cliente.contacto ? <Text style={s.sub}>{d.cliente.contacto}</Text> : null}
            </View>
            <View style={s.caja}>
              <Text style={s.etiqueta}>Fecha</Text>
              <Text style={s.fuerte}>{d.fecha}</Text>
              {!esFactura && d.validezDias ? <Text style={s.sub}>Válido durante {d.validezDias} días</Text> : null}
            </View>
            {d.fechaEntrega ? (
              <View style={s.caja}>
                <Text style={s.etiqueta}>Entrega prevista</Text>
                <Text style={s.fuerte}>{d.fechaEntrega}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.th}>
            <Text style={s.cDesc}>Producto</Text>
            <Text style={s.cCamis}>Estampado</Text>
            <Text style={s.cUds}>Uds</Text>
            <Text style={s.cPu}>Precio</Text>
            <Text style={s.cTot}>Total</Text>
          </View>

          {d.lineas.map((l, i) => (
            <View key={i} style={s.linea} wrap={false}>
              <View style={s.cDesc}>
                <Text style={s.nombreLinea}>{l.descripcion}</Text>
                {textoTallas(l.tallas) ? <Text style={s.sub}>Tallas: {textoTallas(l.tallas)}</Text> : null}
                {l.zonas.map((z, k) => (
                  <Text key={k} style={s.sub}>
                    • {TAMANOS_ZONA[z.tamano].label} · {TAMANOS_ZONA[z.tamano].medida} ({z.vista})
                  </Text>
                ))}
              </View>
              <View style={s.cCamis}>
                {zonasDe(l.zonas, "delante").length > 0 && <Camiseta linea={l} vista="delante" />}
                {zonasDe(l.zonas, "espalda").length > 0 && <Camiseta linea={l} vista="espalda" />}
              </View>
              <Text style={s.cUds}>{l.cantidad}</Text>
              <Text style={s.cPu}>{eur(l.precio_unitario)}</Text>
              <Text style={s.cTot}>{eur(l.precio_unitario * l.cantidad)}</Text>
            </View>
          ))}

          <View style={s.totales} wrap={false}>
            <View style={s.tFila}><Text>Subtotal</Text><Text>{eur(subtotal)}</Text></View>
            {d.envio > 0 ? <View style={s.tFila}><Text>Envío</Text><Text>{eur(d.envio)}</Text></View> : null}
            {d.descuento > 0 ? <View style={s.tFila}><Text>Descuento</Text><Text>−{eur(d.descuento)}</Text></View> : null}
            <View style={s.tTotal}><Text>TOTAL</Text><Text>{eur(d.total)}</Text></View>
          </View>

          {d.notas ? (
            <View style={s.notas} wrap={false}>
              <Text style={s.etiqueta}>Notas</Text>
              <Text>{d.notas}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.pie} fixed>
          <View>
            <Text style={s.peq}>
              {esFactura
                ? "Documento comercial interno. No válido como factura fiscal hasta el alta de la actividad."
                : "Pago en efectivo o Bizum. Impresión DTF incluida en el precio. Presupuesto sujeto a la revisión final del diseño."}
            </Text>
            <Text style={[s.peq, { color: C.rust, fontFamily: "Helvetica-Bold", marginTop: 3 }]}>{d.web.replace("https://", "")}</Text>
          </View>
          <Image src={d.qrDataUrl} style={s.qr} />
        </View>
      </Page>
    </Document>
  );
}
