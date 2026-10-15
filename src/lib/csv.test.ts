import { describe, expect, it } from "vitest";
import { aCsv } from "./csv";

describe("aCsv", () => {
  it("usa ; como separador, coma decimal y BOM", () => {
    const csv = aCsv([{ a: "x", b: 18.5, c: true }], ["a", "b", "c"]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿a;b;c\r\nx;18,5;sí\r\n");
  });

  it("escapa comillas, separadores y saltos de línea", () => {
    const csv = aCsv([{ t: 'dijo "hola"; adiós\nfin' }], ["t"]);
    expect(csv).toContain('"dijo ""hola""; adiós\nfin"');
  });

  it("serializa jsonb y deja vacíos los null", () => {
    const csv = aCsv([{ tallas: { S: 2 }, nota: null }], ["tallas", "nota"]);
    expect(csv).toContain('"{""S"":2}";');
    expect(csv.endsWith(";\r\n")).toBe(true);
  });

  it("deduce las columnas si no se indican", () => {
    expect(aCsv([{ a: 1 }, { b: 2 }]).split("\r\n")[0]).toBe("﻿a;b");
  });
});
