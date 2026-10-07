-- Read every saved wish in bounded pages without granting access to private RSVP fields.
-- The previous list function remains available for older invitation deployments.
create function public.list_fatin_arfan_wishes_page(
  p_limit integer default 101,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (id uuid, created_at timestamptz, name text, wish text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required together.' using errcode = '22023';
  end if;

  return query
  select response.id, response.created_at, response.name, response.wish
  from public.fatin_arfan_rsvps as response
  where btrim(response.wish) <> ''
    and (
      p_before_created_at is null
      or (response.created_at, response.id) < (p_before_created_at, p_before_id)
    )
  order by response.created_at desc, response.id desc
  limit least(greatest(coalesce(p_limit, 101), 1), 101);
end;
$$;

revoke all on function public.list_fatin_arfan_wishes_page(integer, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.list_fatin_arfan_wishes_page(integer, timestamptz, uuid)
  to anon, authenticated;

comment on function public.list_fatin_arfan_wishes_page(integer, timestamptz, uuid) is
  'Public guest wishes only, newest first. Tuple cursors preserve timestamp precision and same-time ordering.';
