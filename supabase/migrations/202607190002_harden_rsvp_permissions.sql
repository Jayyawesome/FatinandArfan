revoke all on table public.rsvp_submissions from anon, authenticated;

grant insert (name, attendance, pax, phone, wish, source)
  on public.rsvp_submissions to anon, authenticated;

grant select (created_at, name, attendance, pax, wish, source)
  on public.rsvp_submissions to anon, authenticated;

drop policy if exists rsvp_public_insert on public.rsvp_submissions;
create policy rsvp_public_insert
  on public.rsvp_submissions
  for insert
  to anon, authenticated
  with check (
    char_length(name) between 1 and 80
    and attendance in ('Hadir', 'Tidak Hadir', 'Mungkin')
    and pax between 1 and 10
    and char_length(phone) <= 30
    and char_length(wish) <= 240
    and source = 'Supabase RSVP API'
  );

drop policy if exists rsvp_public_read on public.rsvp_submissions;
create policy rsvp_public_read
  on public.rsvp_submissions
  for select
  to anon, authenticated
  using (true);

drop function if exists public.submit_rsvp(text, text, integer, text, text);

create function public.submit_rsvp(
  p_name text,
  p_attendance text,
  p_pax integer,
  p_phone text default '',
  p_wish text default ''
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.rsvp_submissions (
    name,
    attendance,
    pax,
    phone,
    wish,
    source
  )
  values (
    btrim(p_name),
    btrim(p_attendance),
    p_pax,
    btrim(coalesce(p_phone, '')),
    btrim(coalesce(p_wish, '')),
    'Supabase RSVP API'
  );
end;
$$;

create or replace function public.list_public_rsvps(p_limit integer default 20)
returns table (
  created_at timestamptz,
  name text,
  attendance text,
  pax integer,
  wish text,
  source text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    submission.created_at,
    submission.name,
    submission.attendance,
    submission.pax::integer,
    submission.wish,
    submission.source
  from public.rsvp_submissions as submission
  order by submission.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

revoke all on function public.submit_rsvp(text, text, integer, text, text) from public;
revoke all on function public.list_public_rsvps(integer) from public;

grant execute on function public.submit_rsvp(text, text, integer, text, text) to anon, authenticated;
grant execute on function public.list_public_rsvps(integer) to anon, authenticated;
