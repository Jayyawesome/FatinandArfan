-- Dedicated storage for Fatin and Arfan; previous invitation tables are untouched.
create table public.fatin_arfan_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  attendance text not null check (attendance in ('Hadir', 'Tidak Hadir', 'Mungkin')),
  pax smallint not null check (pax between 1 and 10),
  phone text not null default '' check (char_length(phone) <= 30),
  wish text not null default '' check (char_length(wish) <= 240)
);

create index fatin_arfan_wishes_created_at_idx
  on public.fatin_arfan_rsvps (created_at desc, id desc)
  where btrim(wish) <> '';

alter table public.fatin_arfan_rsvps enable row level security;

-- Column grants protect contact details even through direct REST table requests.
revoke all on table public.fatin_arfan_rsvps from public, anon, authenticated;
grant insert (name, attendance, pax, phone, wish)
  on public.fatin_arfan_rsvps to anon, authenticated;
grant select (id, created_at, name, wish)
  on public.fatin_arfan_rsvps to anon, authenticated;

create policy fatin_arfan_guest_insert
  on public.fatin_arfan_rsvps
  for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 80
    and attendance in ('Hadir', 'Tidak Hadir', 'Mungkin')
    and pax between 1 and 10
    and char_length(phone) <= 30
    and char_length(wish) <= 240
  );

create policy fatin_arfan_guest_read_wishes
  on public.fatin_arfan_rsvps
  for select to anon, authenticated
  using (true);

create function public.submit_fatin_arfan_rsvp(
  p_name text,
  p_attendance text,
  p_pax integer,
  p_phone text default '',
  p_wish text default ''
)
returns table (id uuid, created_at timestamptz, name text, wish text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  insert into public.fatin_arfan_rsvps as response (
    name, attendance, pax, phone, wish
  )
  values (
    btrim(p_name), btrim(p_attendance), p_pax,
    btrim(coalesce(p_phone, '')), btrim(coalesce(p_wish, ''))
  )
  returning response.id, response.created_at, response.name, response.wish;
end;
$$;

create function public.list_fatin_arfan_wishes(p_limit integer default 20)
returns table (created_at timestamptz, name text, wish text)
language sql
stable
security invoker
set search_path = ''
as $$
  select response.created_at, response.name, response.wish
  from public.fatin_arfan_rsvps as response
  where btrim(response.wish) <> ''
  order by response.created_at desc, response.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

revoke all on function public.submit_fatin_arfan_rsvp(text, text, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.list_fatin_arfan_wishes(integer)
  from public, anon, authenticated;
grant execute on function public.submit_fatin_arfan_rsvp(text, text, integer, text, text)
  to anon, authenticated;
grant execute on function public.list_fatin_arfan_wishes(integer)
  to anon, authenticated;

comment on table public.fatin_arfan_rsvps is
  'Saved guest RSVPs for Fatin and Arfan. Phone, attendance and party size are private to the hosts.';
