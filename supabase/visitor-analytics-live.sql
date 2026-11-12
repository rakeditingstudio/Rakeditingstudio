-- RAK Editing Studio: live visitor presence and richer owner dashboard.
-- Run AFTER visitor-analytics.sql in the same Supabase project.
-- Stores only random browser IDs, coarse device category, page path and heartbeat time.
-- No IP addresses, names, precise location, or device fingerprints.

create table if not exists public.visitor_presence (
  visitor_id uuid primary key,
  page_path text not null default '/',
  device_type text not null default 'unknown'
    check (device_type in ('mobile','desktop','tablet','unknown')),
  last_seen_at timestamptz not null default now()
);
alter table public.visitor_presence enable row level security;
revoke all on table public.visitor_presence from anon, authenticated;

create or replace function public.record_visitor_presence(
  p_visitor_id uuid,
  p_page_path text default '/',
  p_device_type text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare clean_path text; clean_device text;
begin
  if p_visitor_id is null then raise exception 'visitor id required'; end if;
  clean_path := left(coalesce(nullif(p_page_path, ''), '/'), 160);
  if clean_path !~ '^/[a-zA-Z0-9/_-]*$' then clean_path := '/'; end if;
  clean_device := lower(coalesce(p_device_type, 'unknown'));
  if clean_device not in ('mobile','desktop','tablet') then clean_device := 'unknown'; end if;
  insert into public.visitor_presence(visitor_id,page_path,device_type,last_seen_at)
  values (p_visitor_id,clean_path,clean_device,now())
  on conflict (visitor_id) do update
  set page_path=excluded.page_path,
      device_type=excluded.device_type,
      last_seen_at=now();
end;
$$;
revoke all on function public.record_visitor_presence(uuid,text,text) from public;
grant execute on function public.record_visitor_presence(uuid,text,text) to anon, authenticated;

create or replace function public.get_visitor_dashboard_stats(p_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result jsonb; safe_days integer;
begin
  if not public.is_studio_admin() then raise exception 'studio admin access required'; end if;
  safe_days := greatest(1,least(coalesce(p_days,14),30));
  select jsonb_build_object(
    'active_visitors', (select count(*) from public.visitor_presence where last_seen_at >= now()-interval '90 seconds'),
    'page_views_total', (select count(*) from public.site_visits),
    'page_views_range', (select count(*) from public.site_visits where visit_date >= current_date-(safe_days-1)),
    'unique_visitors_range', (select count(distinct visitor_id) from public.site_visits where visit_date >= current_date-(safe_days-1)),
    'registered_accounts', (select count(*) from auth.users),
    'login_events_30d', (select count(*) from public.login_events where occurred_at >= now()-interval '30 days'),
    'daily_views', coalesce((
      select jsonb_agg(jsonb_build_object('day',to_char(d.day,'DD Mon'),'views',coalesce(v.views,0)) order by d.day)
      from generate_series(current_date-(safe_days-1),current_date,interval '1 day') as d(day)
      left join (
        select visit_date,count(*) as views from public.site_visits
        where visit_date >= current_date-(safe_days-1) group by visit_date
      ) v on v.visit_date=d.day::date
    ),'[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(jsonb_build_object('page_path',p.page_path,'views',p.views) order by p.views desc)
      from (
        select page_path,count(*) as views from public.site_visits
        where visit_date >= current_date-(safe_days-1)
        group by page_path order by count(*) desc limit 8
      ) p
    ),'[]'::jsonb),
    'active_devices', jsonb_build_object(
      'mobile',(select count(*) from public.visitor_presence where last_seen_at >= now()-interval '90 seconds' and device_type='mobile'),
      'desktop',(select count(*) from public.visitor_presence where last_seen_at >= now()-interval '90 seconds' and device_type='desktop'),
      'tablet',(select count(*) from public.visitor_presence where last_seen_at >= now()-interval '90 seconds' and device_type='tablet'),
      'unknown',(select count(*) from public.visitor_presence where last_seen_at >= now()-interval '90 seconds' and device_type='unknown')
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_visitor_dashboard_stats(integer) from public;
grant execute on function public.get_visitor_dashboard_stats(integer) to authenticated;
