import { describe, expect, it } from "vitest";
import { costeMedio } from "./compra";

describe("costeMedio", () => {
  it("pondera por unidades", () => {
    expect(costeMedio(10, 6, 10, 8)).toBe(7);
    expect(costeMedio(30, 6.44, 20, 5.15)).toBe(5.92);
  });
  it("sin stock o sin precio previo manda el coste nuevo", () => {
    expect(costeMedio(0, 6, 10, 8)).toBe(8);
    expect(costeMedio(5, 0, 10, 8)).toBe(8);
  });
  it("sin unidades nuevas no cambia", () => {
    expect(costeMedio(5, 6, 0, 8)).toBe(6);
  });
});
