"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PlancharBoton } from "@/components/PlancharBoton";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/tareas", label: "Tareas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/inventario", label: "Inventario" },
  { href: "/calculadora", label: "Calculadora" },
  { href: "/gastos", label: "Gastos" },
  { href: "/copias", label: "Copias" },
];

// Secundarias: en el móvil viven dentro de «Más».
const MAS = LINKS.filter((l) => ["/calculadora", "/tareas", "/clientes", "/gastos", "/copias"].includes(l.href));

const activo = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

const Icono = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICONOS = {
  inicio: "M3 11l9-8 9 8M5 10v10h14V10",
  pedidos: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  inventario: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  mas: "M5 12h.01M12 12h.01M19 12h.01",
  planchar: "M5 3v7a7 7 0 0014 0V3M5 3h14M9 21h6",
};

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [mas, setMas] = useState(false);
  useEffect(() => setMas(false), [path]);
  if (path.startsWith("/login")) return null;

  const salir = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const tab = (href: string, label: string, icono: keyof typeof ICONOS) => (
    <Link href={href} className={cn("group flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition active:scale-90", activo(path, href) ? "text-rust" : "text-ink/45")}>
      <span className={cn("transition-transform duration-300", activo(path, href) && "-translate-y-0.5 scale-110")}><Icono d={ICONOS[icono]} /></span>
      {label}
    </Link>
  );
  const masActivo = MAS.some((l) => activo(path, l.href));

  return (
    <>
      {/* Cabecera: en escritorio con todos los enlaces, en móvil solo la marca */}
      <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            camis24h <span className="text-rust">gestión</span>
          </Link>
          <nav className="hidden flex-wrap items-center justify-end gap-1 text-sm font-semibold md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={cn("rounded-xl px-3 py-1.5 transition duration-200", activo(path, l.href) ? "bg-rust text-white shadow-sm shadow-rust/30" : "hover:bg-ink/5")}>
                {l.label}
              </Link>
            ))}
            <PlancharBoton className="ml-2 !py-1.5" />
            <button onClick={salir} className="ml-1 px-2 py-1.5 text-ink/50 hover:text-rust">
              Salir
            </button>
          </nav>
        </div>
      </header>

      {/* Móvil: barra inferior con Planchar en el centro */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.06] bg-paper/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Principal">
        <div className="flex items-end px-1">
          {tab("/", "Inicio", "inicio")}
          {tab("/pedidos", "Pedidos", "pedidos")}
          <div className="flex flex-1 justify-center pb-2">
            <PlancharBoton className="-mt-5 !h-14 !w-14 animate-pulse-ring !rounded-full !p-0 shadow-lg" icono={<Icono d={ICONOS.planchar} />} />
          </div>
          {tab("/inventario", "Stock", "inventario")}
          <button onClick={() => setMas((v) => !v)} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", mas || masActivo ? "text-rust" : "text-ink/45")}>
            <Icono d={ICONOS.mas} />
            Más
          </button>
        </div>
      </nav>

      {mas && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-label="Más">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMas(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-ink/10 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <ul className="divide-y divide-ink/5">
              {MAS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={cn("block py-3.5 text-lg font-semibold", activo(path, l.href) && "text-rust")}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button onClick={salir} className="block w-full py-3.5 text-left text-lg font-semibold text-ink/50">
                  Salir
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
