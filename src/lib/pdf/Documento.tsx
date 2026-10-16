import { Document, G, Image, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { TAMANOS_ZONA } from "@/lib/pricing";
import { COLOR_FILL, SHIRT_BODY, SHIRT_COLLAR, SHIRT_MATRIX, SHIRT_SEAMS, SHIRT_VIEWBOX, ZONA_RECT, colorDe, zonasDe } from "@/lib/shirt";
import type { PedidoLinea } from "@/lib/types";
import { desglosarLinea } from "@/lib/desglose";

export interface DatosDocumento {
  tipo: "presupuesto" | "factura" | "recibo";
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
  pagos?: { fecha: string; metodo: string; importe: number }[]; // cobros registrados (recibo)
  imagenes?: string[]; // mockups / referencias (data URLs)
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
const eurSigno = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${eur(Math.abs(n))}`;

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
  const esRecibo = d.tipo === "recibo";
  const esFactura = d.tipo === "factura";
  const nombreDoc = esRecibo ? "Recibo" : esFactura ? "Factura" : "Presupuesto";
  const pagado = (d.pagos ?? []).reduce((a, p) => a + p.importe, 0);
  const pendiente = Math.max(0, Math.round((d.total - pagado) * 100) / 100);
  const subtotal = d.lineas.reduce((a, l) => a + l.precio_unitario * l.cantidad, 0);

  return (
    <Document title={`${nombreDoc} ${d.referencia}`} author="Camis24h">
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
            <Text style={s.tipo}>{nombreDoc.toUpperCase()}</Text>
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
              {!esFactura && !esRecibo && d.validezDias ? <Text style={s.sub}>Válido durante {d.validezDias} días</Text> : null}
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
                {esRecibo && desglosarLinea(l).length > 0 ? (
                  <View style={{ marginTop: 5, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: C.linea }}>
                    <Text style={[s.etiqueta, { marginBottom: 2 }]}>Cómo se compone el precio por unidad</Text>
                    {desglosarLinea(l).map((r, k) => (
                      <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: C.gris, flex: 1, paddingRight: 6 }}>{r.concepto}</Text>
                        <Text style={{ fontSize: 8 }}>{r.importe === null ? "incluido" : k === 0 ? eur(r.importe) : eurSigno(r.importe)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
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

          {esRecibo ? (
            <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }} wrap={false}>
              <View style={[s.caja, { flex: 2 }]}>
                <Text style={s.etiqueta}>Pagos recibidos</Text>
                {(d.pagos ?? []).length ? (d.pagos ?? []).map((p, i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                    <Text>{p.fecha} · {p.metodo}</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{eur(p.importe)}</Text>
                  </View>
                )) : <Text style={s.sub}>Sin pagos registrados</Text>}
              </View>
              <View style={[s.caja, { alignItems: "center", justifyContent: "center", backgroundColor: pendiente > 0 ? "#fdf0d5" : "#dfeadf" }]}>
                <Text style={[s.fuerte, { fontSize: 15, color: pendiente > 0 ? "#8a5a00" : "#2f5a3d" }]}>{pendiente > 0 ? "PENDIENTE" : "PAGADO"}</Text>
                <Text style={s.sub}>{pendiente > 0 ? `Faltan ${eur(pendiente)}` : `${eur(pagado)} cobrados`}</Text>
              </View>
            </View>
          ) : null}

          {d.notas ? (
            <View style={s.notas} wrap={false}>
              <Text style={s.etiqueta}>Notas</Text>
              <Text>{d.notas}</Text>
            </View>
          ) : null}

          {d.imagenes?.length ? (
            <View style={{ marginTop: 18 }} wrap={false}>
              <Text style={s.etiqueta}>Mockup / referencias</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {d.imagenes.map((src, i) => (
                  <Image key={i} src={src} style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 4 }} />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={s.pie} fixed>
          <View>
            <Text style={s.peq}>
              {esRecibo
                ? "Justificante de pago de Camis24h. Documento informativo sin validez fiscal."
                : esFactura
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
