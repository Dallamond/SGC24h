// Descuento automático de stock cuando un pedido llega a "Listo".
// La parte pura (planificar) se prueba aparte; la parte con base de datos está debajo.

export interface LineaNecesidad {
  prenda_id: string | null;
  color: string | null;
  tallas: Record<string, number>;
}

export interface LineaStock {
  id: string;
  prenda_id: string;
  talla: string;
  color: string;
  cantidad: number;
}

export interface PlanDescuento {
  movimientos: { linea_id: string; unidades: number }[];
  faltas: string[]; // avisos para la lista de tareas
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function planificarDescuento(lineas: LineaNecesidad[], stock: LineaStock[]): PlanDescuento {
  const disponible = new Map(stock.map((s) => [s.id, s.cantidad]));
  const acumulado = new Map<string, number>();
  const faltas: string[] = [];

  for (const l of lineas) {
    if (!l.prenda_id || !l.color) {
      faltas.push("una línea sin prenda o color de inventario (no se ha descontado)");
      continue;
    }
    for (const [talla, n] of Object.entries(l.tallas)) {
      if (n <= 0) continue;
      const s = stock.find((x) => x.prenda_id === l.prenda_id && norm(x.color) === norm(l.color) && x.talla === talla);
      if (!s) {
        faltas.push(`${n} × ${l.color} ${talla} (no existe esa línea en el inventario)`);
        continue;
      }
      const hay = disponible.get(s.id) ?? 0;
      const quitar = Math.min(n, hay);
      if (quitar > 0) {
        disponible.set(s.id, hay - quitar);
        acumulado.set(s.id, (acumulado.get(s.id) ?? 0) + quitar);
      }
      if (quitar < n) faltas.push(`${n - quitar} × ${l.color} ${talla} (faltaban en el stock)`);
    }
  }

  return { movimientos: [...acumulado].map(([linea_id, unidades]) => ({ linea_id, unidades })), faltas };
}

export interface Prevision { nombre: string; color: string; talla: string; necesito: number; hay: number; falta: number }

// Mira los pedidos en curso (aún sin descontar) y avisa de lo que faltará en el stock cuando lleguen a «Listo».
export function preverFaltas(lineas: LineaNecesidad[], stock: (LineaStock & { nombre_oficial: string })[]): Prevision[] {
  const necesito = new Map<string, number>();
  for (const l of lineas) {
    if (!l.prenda_id || !l.color) continue;
    for (const [talla, n] of Object.entries(l.tallas)) {
      if (n <= 0) continue;
      const s = stock.find((x) => x.prenda_id === l.prenda_id && norm(x.color) === norm(l.color) && x.talla === talla);
      if (s) necesito.set(s.id, (necesito.get(s.id) ?? 0) + n);
    }
  }
  return [...necesito]
    .map(([id, n]) => {
      const s = stock.find((x) => x.id === id)!;
      return { nombre: s.nombre_oficial, color: s.color, talla: s.talla, necesito: n, hay: s.cantidad, falta: Math.max(0, n - s.cantidad) };
    })
    .filter((p) => p.falta > 0)
    .sort((a, b) => b.falta - a.falta);
}
