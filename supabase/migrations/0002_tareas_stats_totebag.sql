-- ============================================================
-- SGC24h · 0002 — tareas, fechas de cobro/entrega para estadísticas y totebags
-- Ejecutar en Supabase → SQL Editor (después de 0001).
-- ============================================================

-- Totebags como tipo de prenda
alter table public.sg_prendas drop constraint if exists sg_prendas_tipo_check;
alter table public.sg_prendas add constraint sg_prendas_tipo_check
  check (tipo in ('camiseta','sudadera','polo','totebag','consumible'));

-- Fechas para las estadísticas (cuándo se cobró y cuándo se entregó)
alter table public.sg_pedidos add column if not exists pagado_en timestamptz;
alter table public.sg_pedidos add column if not exists entregado_en timestamptz;

-- Tareas internas ("dejar algo anotado")
create table if not exists public.sg_tareas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  texto text not null,
  vence date,
  completada boolean not null default false,
  completada_en timestamptz,
  creada_por uuid default auth.uid()
);

alter table public.sg_tareas enable row level security;
drop policy if exists "sg_tareas_auth" on public.sg_tareas;
create policy "sg_tareas_auth" on public.sg_tareas for all to authenticated using (true) with check (true);

-- "A reponer" solo cuando hay un mínimo definido (con mínimo 0 todo el stock vacío saldría en rojo)
create or replace view public.sg_v_stock as
select l.id as linea_id, p.id as prenda_id, p.nombre_oficial, p.tipo, p.proveedor,
       p.gramaje, p.precio_compra, p.stock_minimo, p.activa,
       l.talla, l.color, l.cantidad,
       (l.cantidad * p.precio_compra)::numeric(10,2) as valor,
       (p.stock_minimo > 0 and l.cantidad <= p.stock_minimo) as reponer
from public.sg_stock_lineas l join public.sg_prendas p on p.id = l.prenda_id;
alter view public.sg_v_stock set (security_invoker = true);
