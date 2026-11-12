-- RAK Editing Studio: owner-only registered user directory
-- Run in Supabase SQL Editor after the visitor analytics migrations.
-- Returns only basic account profile fields; never exposes passwords or auth tokens.

create or replace function public.get_studio_registered_users()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare users_json jsonb;
begin
  if not public.is_studio_admin() then
    raise exception 'studio admin access required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'display_name', coalesce(
          nullif(u.raw_user_meta_data->>'full_name',''),
          nullif(u.raw_user_meta_data->>'name',''),
          nullif(u.raw_user_meta_data->>'display_name',''),
          ''
        ),
        'avatar_url', coalesce(
          nullif(u.raw_user_meta_data->>'avatar_url',''),
          nullif(u.raw_user_meta_data->>'picture',''),
          nullif(u.raw_user_meta_data->>'photo_url',''),
          ''
        ),
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'providers', coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)
      )
      order by u.created_at desc
    ),
    '[]'::jsonb
  )
  into users_json
  from auth.users u;

  return users_json;
end;
$$;

revoke all on function public.get_studio_registered_users() from public;
grant execute on function public.get_studio_registered_users() to authenticated;
