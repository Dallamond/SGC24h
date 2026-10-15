-- ============================================================
-- SGC24h — Sistema de gestión de Camis24h · esquema inicial (fase 1)
-- Ejecutar en Supabase → SQL Editor. Todas las tablas llevan prefijo
-- "sg_" para convivir sin choques con las de la web (catalogo, pedidos…).
-- Acceso: solo usuarios autenticados (Lucas + Nasser). Sin acceso público.
-- ============================================================

-- ── Clientes ──
create table if not exists public.sg_clientes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  contacto text,                       -- teléfono o usuario de Vinted/Instagram
  zona text,
  canal text check (canal in ('vinted','instagram','contacto','web','otro')),
  notas text
);

-- ── Inventario: modelo de prenda + una línea de stock por talla/color ──
create table if not exists public.sg_prendas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre_oficial text not null,        -- el de la etiqueta del proveedor
  tipo text not null check (tipo in ('camiseta','sudadera','polo','consumible')),
  proveedor text,
  tienda text,
  gramaje int,
  precio_compra numeric(8,2) not null check (precio_compra >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  activa boolean not null default true
);

create table if not exists public.sg_stock_lineas (
  id uuid primary key default gen_random_uuid(),
  prenda_id uuid not null references public.sg_prendas(id) on delete cascade,
  talla text not null default 'U',     -- 'U' = única (consumibles)
  color text not null default 'único',
  cantidad int not null default 0 check (cantidad >= 0),
  unique (prenda_id, talla, color)
);

-- Libro de movimientos: cada cambio de stock deja rastro (quién, cuándo, por qué).
create table if not exists public.sg_stock_movimientos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  linea_id uuid not null references public.sg_stock_lineas(id) on delete cascade,
  delta int not null check (delta <> 0),
  motivo text not null check (motivo in ('entrada','planchado','ajuste','devolucion')),
  pedido_id uuid,                      -- se enlaza al pedido cuando existe (fase pedidos)
  usuario uuid default auth.uid(),
  nota text
);

-- Cambia el stock y anota el movimiento en una sola transacción.
-- Si la cantidad quedara negativa, el check de sg_stock_lineas aborta todo.
create or replace function public.sg_mover_stock(
  p_linea uuid, p_delta int, p_motivo text,
  p_pedido uuid default null, p_nota text default null
) returns int
language plpgsql
as $$
declare nueva int;
begin
  update public.sg_stock_lineas set cantidad = cantidad + p_delta
    where id = p_linea returning cantidad into nueva;
  if nueva is null then raise exception 'Línea de stock no encontrada'; end if;
  insert into public.sg_stock_movimientos (linea_id, delta, motivo, pedido_id, nota)
    values (p_linea, p_delta, p_motivo, p_pedido, p_nota);
  return nueva;
end $$;

-- Vista de trabajo: stock con su valor en euros y flag de reposición.
create or replace view public.sg_v_stock as
select l.id as linea_id, p.id as prenda_id, p.nombre_oficial, p.tipo, p.proveedor,
       p.gramaje, p.precio_compra, p.stock_minimo, p.activa,
       l.talla, l.color, l.cantidad,
       (l.cantidad * p.precio_compra)::numeric(10,2) as valor,
       (l.cantidad <= p.stock_minimo) as reponer
from public.sg_stock_lineas l join public.sg_prendas p on p.id = l.prenda_id;

-- ── Pedidos (el presupuesto es un pedido en estado 'posible') ──
create table if not exists public.sg_pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,   -- C24H-0001
  created_at timestamptz not null default now(),
  cliente_id uuid references public.sg_clientes(id) on delete set null,
  estado text not null default 'posible'
    check (estado in ('posible','aprobado','diseno','produccion','listo','entregado','descartado')),
  dtf_recogido boolean not null default false,  -- ¿ya está la impresión DTF recogida?
  fecha_entrega date,
  envio numeric(8,2) not null default 0,
  descuento numeric(8,2) not null default 0,
  total numeric(10,2) not null default 0,
  pagado boolean not null default false,
  metodo_pago text check (metodo_pago in ('efectivo','bizum')),
  anticipo numeric(8,2) not null default 0,
  validez_dias int not null default 15,
  origen text not null default 'manual' check (origen in ('manual','web')),
  web_pedido_id uuid,                           -- enlace al pedido de la web, si vino de ahí
  notas text
);

create table if not exists public.sg_pedido_lineas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.sg_pedidos(id) on delete cascade,
  prenda_id uuid references public.sg_prendas(id) on delete set null,
  descripcion text not null,
  tallas jsonb not null default '{}'::jsonb,    -- {"S":2,"M":1}
  cantidad int not null check (cantidad >= 1),
  zonas jsonb not null default '[]'::jsonb,     -- [{tamano, vista}]
  precio_unitario numeric(8,2) not null,
  precio_calculado numeric(8,2) not null,       -- lo que propuso el sistema (para ver cuánto se corrigió a mano)
  coste_unitario numeric(8,2)                   -- foto del precio de compra al crear la línea
);

-- ============================================================
-- RLS: solo autenticados, todo permitido (equipo de dos personas).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['sg_clientes','sg_prendas','sg_stock_lineas',
                           'sg_stock_movimientos','sg_pedidos','sg_pedido_lineas']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_auth" on public.%1$I', t);
    execute format('create policy "%1$s_auth" on public.%1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter view public.sg_v_stock set (security_invoker = true);
