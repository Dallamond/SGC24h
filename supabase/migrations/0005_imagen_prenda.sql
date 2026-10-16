-- ============================================================
-- SGC24h · 0005 — imagen por modelo de prenda (inventario)
-- Ejecutar en Supabase → SQL Editor (después de 0004).
-- Las fotos se guardan en el bucket privado "adjuntos", carpeta prendas/.
-- ============================================================
alter table public.sg_prendas add column if not exists imagen_path text;
