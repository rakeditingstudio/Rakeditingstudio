-- RAK Editing Studio: privacy-conscious visitor analytics
-- Run this migration in Supabase SQL Editor. No IP addresses, names, or fingerprints are collected.

create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.studio_admins enable row level security;
revoke all on table public.studio_admins from anon, authenticated;

create or replace function public.is_studio_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.studio_admins where user_id = auth.uid());
$$;
revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_admin() to authenticated;

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  visit_date date not null default current_date,
  page_path text not null default '/',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (visitor_id, visit_date, page_path)
);
alter table public.site_visits add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.site_visits enable row level security;
drop policy if exists "site_visits_admin_read" on public.site_visits;
create policy "site_visits_admin_read" on public.site_visits
for select to authenticated using (public.is_studio_admin());

create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now()
);
alter table public.login_events enable row level security;
drop policy if exists "login_events_admin_read" on public.login_events;
create policy "login_events_admin_read" on public.login_events
for select to authenticated using (public.is_studio_admin());

create or replace function public.record_site_visit(p_visitor_id uuid, p_page_path text default '/')
returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
declare clean_path text;
begin
  if p_visitor_id is null then raise exception 'visitor id required'; end if;
  clean_path := left(coalesce(nullif(p_page_path, ''), '/'), 160);
  if clean_path !~ '^/[a-zA-Z0-9/_-]*$' then clean_path := '/'; end if;
  insert into public.site_visits(visitor_id, visit_date, page_path, user_id)
  values (p_visitor_id, current_date, clean_path, auth.uid())
  on conflict (visitor_id, visit_date, page_path)
  do update set user_id = coalesce(excluded.user_id, site_visits.user_id);
end;
$$;
revoke all on function public.record_site_visit(uuid, text) from public;
grant execute on function public.record_site_visit(uuid, text) to anon, authenticated;

create or replace function public.record_login_event()
returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  insert into public.login_events(user_id) values (auth.uid());
end;
$$;
revoke all on function public.record_login_event() from public;
grant execute on function public.record_login_event() to authenticated;

create or replace function public.get_visitor_dashboard_stats()
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not public.is_studio_admin() then raise exception 'studio admin access required'; end if;
  select jsonb_build_object(
    'page_views_total', (select count(*) from public.site_visits),
    'page_views_30d', (select count(*) from public.site_visits where visit_date >= current_date - 29),
    'unique_visitors_30d', (select count(distinct visitor_id) from public.site_visits where visit_date >= current_date - 29),
    'registered_accounts', (select count(*) from auth.users),
    'login_events_30d', (select count(*) from public.login_events where occurred_at >= now() - interval '30 days'),
    'logged_in_accounts_30d', (select count(distinct user_id) from public.login_events where occurred_at >= now() - interval '30 days')
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_visitor_dashboard_stats() from public;
grant execute on function public.get_visitor_dashboard_stats() to authenticated;
