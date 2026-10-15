"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

const LINKS = [
  { href: "/inventario", label: "Inventario" },
  { href: "/inventario/planchar", label: "Planchar" },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  if (path.startsWith("/login")) return null;

  const salir = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          camis24h <span className="text-rust">gestión</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("rounded-lg px-3 py-1.5", path === l.href ? "bg-rust text-white" : "hover:bg-ink/5")}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={salir} className="ml-2 px-2 py-1.5 text-ink/50 hover:text-rust">
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
