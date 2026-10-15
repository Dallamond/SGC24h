// Coste medio ponderado al reponer stock: mezcla lo que ya hay (a su precio) con lo comprado (a su coste, envío incluido).
// Si no hay stock o el precio anterior no estaba definido (0), el nuevo coste manda.
export function costeMedio(stockActual: number, precioActual: number, udsNuevas: number, costeUnitarioNuevo: number): number {
  if (udsNuevas <= 0) return precioActual;
  if (stockActual <= 0 || precioActual <= 0) return Math.round(costeUnitarioNuevo * 100) / 100;
  const total = stockActual * precioActual + udsNuevas * costeUnitarioNuevo;
  return Math.round((total / (stockActual + udsNuevas)) * 100) / 100;
}
