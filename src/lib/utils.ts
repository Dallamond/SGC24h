export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
