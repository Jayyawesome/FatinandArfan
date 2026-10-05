create extension if not exists pgcrypto;

create table if not exists public.rsvp_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  attendance text not null check (attendance in ('Hadir', 'Tidak Hadir', 'Mungkin')),
  pax smallint not null check (pax between 1 and 10),
  phone text not null default '' check (char_length(phone) <= 30),
  wish text not null default '' check (char_length(wish) <= 240),
  source text not null default 'Supabase RSVP API'
);

create index if not exists rsvp_submissions_created_at_idx
  on public.rsvp_submissions (created_at desc);

alter table public.rsvp_submissions enable row level security;

revoke all on table public.rsvp_submissions from anon, authenticated;

create or replace function public.submit_rsvp(
  p_name text,
  p_attendance text,
  p_pax integer,
  p_phone text default '',
  p_wish text default ''
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
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
  )
  returning rsvp_submissions.id, rsvp_submissions.created_at;
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
security definer
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

comment on table public.rsvp_submissions is
  'Durable RSVP responses for the Fatin and Arfan wedding invitation.';
