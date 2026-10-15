# SGC24h — estado

Sistema de gestión interno de Camis24h (inventario, presupuestos, pedidos). Hoja de ruta: `Sistema de Gestión MVP.md` en la vault.
Supabase propio, en otra cuenta distinta a la de la web (no comparten BD).

## Hecho
- Base: Next 15 + Supabase (auth) + Tailwind, paleta de Camis24h. Esquema en `supabase/migrations/0001_init.sql`.
- Precios (`src/lib/pricing.ts`) con recargo por zona del primer diseño, con tests.
- Inventario: valor en stock, a reponer, alta de prenda, pantalla Planchar (−1/−2 atómico con rastro).
- Clientes: lista, alta, ficha con notas e historial.
- Presupuestos: formulario con precio en vivo, corrección manual, borrador local, prendas fuera de inventario.
- PDF de presupuesto en el navegador (logo, tallas, estampados, QR) con test.
- Tablero de pedidos: posible → aprobado → diseño → producción → listo → entregado, pagado, DTF recogido, descartar.

## Puesta en marcha
1. Supabase → SQL Editor → ejecutar `supabase/migrations/0001_init.sql`.
2. Authentication → crear usuarios (Lucas, Nasser) y desactivar el registro público.
3. `.env.local` (y variables en Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. `npm install && npm run dev`

## Siguiente
- Cargar el stock real (pendiente: lista de Nasser).
- Enlazar planchado con la tarjeta del pedido (descuento exacto + beneficio real).
- Fase 2: facturas, gastos con foto, exportar a CSV.
