# SGC24h — estado

Sistema de gestión interno de Camis24h (inventario, presupuestos, pedidos). Hoja de ruta: `Sistema de Gestión MVP.md` en la vault.
Supabase propio, en otra cuenta distinta a la de la web (no comparten BD).

## Hecho (v6 · 16/10/2026)
- Versión móvil: barra inferior (Inicio, Pedidos, Planchar, Stock, Más), pestañas de estado en Pedidos, Inicio compacto.
- Foto por modelo de prenda en Inventario (cámara/galería) y al crear prenda. Migración `0005_imagen_prenda.sql` (ejecutar antes de usar fotos).
- Calculadora (`/calculadora`): prenda del inventario + medidas DTF → coste de producción, tarifa oficial, mínimo por margen y precio recomendado. Parámetros editables (lámina 10 €/5.500 cm², aprovechamiento 85 %, planchado 0,50 €, margen 50 %).

## Hecho (v2 · 15/10/2026 noche)
- Inicio con KPIs (vendido, cobrado, por cobrar, beneficio estimado, aceptación), ventas 6 meses, entregas, mejores clientes, tareas e inventario.
- Tareas con fecha límite y completar. Tablero a ancho completo sin scroll horizontal.
- Inventario agrupado por modelo con recuento editable, precio y mínimo; botón «Cargar catálogo base» (camisetas 220/190, sudaderas, polos, totebags).
- PDF maquetado con cabecera, datos, camisetas con las zonas de estampado (delante/espalda) y totales.
- Migraciones `0002_tareas_stats_totebag.sql` y `0003_stock_auto_adjuntos.sql` (ejecutar antes de desplegar).
- v5: cobros parciales/anticipos (sg_pagos), gastos con foto de ticket, compras de stock con coste medio, historial de movimientos, buscador y avisos de retraso en el tablero, Compartir PDF y app instalable. Migración `0004_pagos_gastos.sql`.
- v4: copias de seguridad (ZIP con CSV + JSON en /copias), editar y duplicar pedidos (recalcula el stock si ya estaba descontado).
- v3: botón verde «Planchar» (desplegable) en barra, inicio e inventario; descuento automático de stock al pasar un pedido a «Listos» (reversible); KPI camisetas vendidas; líneas «solo estampado» y «servicio»; imágenes adjuntas (mockups) en pedido y PDF; logo blanco en cabecera del PDF; botón «Cargar recuento del 15/10».

## Hecho (v1)
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
