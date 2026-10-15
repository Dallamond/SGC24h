# SGC24h — estado

Sistema de gestión interno de Camis24h (inventario, presupuestos, pedidos). Hoja de ruta: `Sistema de Gestión MVP.md` en la vault.

## Hecho (15/10/2026)
- Next 15 + Supabase (auth) + Tailwind, misma paleta que la web Camis24h.
- `supabase/migrations/0001_init.sql`: clientes, prendas, líneas de stock, libro de movimientos, pedidos y líneas (tablas `sg_*`).
- `src/lib/pricing.ts` con recargo por zona del primer diseño + 6 tests.
- Login, inventario (valor en stock, a reponer), alta de prenda, pantalla Planchar (-1/-2 atómico con rastro).

## Puesta en marcha
1. Supabase → SQL Editor → ejecutar `supabase/migrations/0001_init.sql`.
2. `cp .env.example .env.local` y rellenar URL + anon key.
3. Crear usuarios en Authentication y desactivar el registro público.
4. `npm install && npm run dev`

## Siguiente
Clientes → presupuesto (formulario + PDF) → tablero de pedidos → enlazar planchado con pedido.
