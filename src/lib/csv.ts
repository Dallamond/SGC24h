// CSV pensado para Excel en español: separador «;», decimales con coma, BOM UTF-8 y saltos CRLF.
function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "number") s = String(v).replace(".", ",");
  else if (typeof v === "boolean") s = v ? "sí" : "no";
  else if (typeof v === "object") s = JSON.stringify(v); // jsonb: tallas, zonas…
  else s = String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCsv(filas: Record<string, unknown>[], columnas?: string[]): string {
  const cols = columnas ?? [...new Set(filas.flatMap((f) => Object.keys(f)))];
  const lineas = [cols.join(";"), ...filas.map((f) => cols.map((c) => celda(f[c])).join(";"))];
  return "﻿" + lineas.join("\r\n") + "\r\n";
}
