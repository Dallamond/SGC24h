-- ============================================================
-- SGC24h · 0003 — descuento automático de stock por pedido + adjuntos (mockups)
-- Ejecutar en Supabase → SQL Editor (después de 0002).
-- ============================================================

-- Color de cada línea (para saber qué línea de stock restar) y marca de "stock ya descontado"
alter table public.sg_pedido_lineas add column if not exists color text;
alter table public.sg_pedidos add column if not exists stock_descontado boolean not null default false;

-- Imágenes adjuntas a un pedido (mockups, referencias del cliente…)
create table if not exists public.sg_pedido_adjuntos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid not null references public.sg_pedidos(id) on delete cascade,
  path text not null,          -- ruta dentro del bucket "adjuntos"
  nombre text
);

alter table public.sg_pedido_adjuntos enable row level security;
drop policy if exists "sg_pedido_adjuntos_auth" on public.sg_pedido_adjuntos;
create policy "sg_pedido_adjuntos_auth" on public.sg_pedido_adjuntos for all to authenticated using (true) with check (true);

-- Bucket privado para las imágenes (se sirven con URL firmada)
insert into storage.buckets (id, name, public) values ('adjuntos', 'adjuntos', false)
  on conflict (id) do nothing;

drop policy if exists "adjuntos_select_auth" on storage.objects;
drop policy if exists "adjuntos_insert_auth" on storage.objects;
drop policy if exists "adjuntos_delete_auth" on storage.objects;
create policy "adjuntos_select_auth" on storage.objects for select to authenticated using (bucket_id = 'adjuntos');
create policy "adjuntos_insert_auth" on storage.objects for insert to authenticated with check (bucket_id = 'adjuntos');
create policy "adjuntos_delete_auth" on storage.objects for delete to authenticated using (bucket_id = 'adjuntos');

-- Tipos de línea: prenda (nuestra), solo_estampado (la prenda la trae el cliente) y servicio (digitalización, diseño…)
alter table public.sg_pedido_lineas add column if not exists tipo text not null default 'prenda';
alter table public.sg_pedido_lineas drop constraint if exists sg_pedido_lineas_tipo_check;
alter table public.sg_pedido_lineas add constraint sg_pedido_lineas_tipo_check
  check (tipo in ('prenda','solo_estampado','servicio'));
