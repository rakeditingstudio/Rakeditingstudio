# RAK Editing Studio — Visitor Analytics Setup

This change adds privacy-conscious visitor counts and a private owner dashboard. It does not identify anonymous people.

## What is measured

- Page views, deduplicated per random browser ID + day + page.
- Approximate unique browser IDs over the last 30 days.
- Registered account count.
- Login events and distinct accounts that logged in during the last 30 days.

The browser ID is a random UUID stored in localStorage. No IP addresses, names, device fingerprints, precise location, or anonymous email addresses are collected. A browser/profile is counted separately; clearing browser storage or changing browsers can create a new visitor ID. These are estimates, not a person-level identity system. There is no live-presence feature.

## Setup

1. Open the existing Supabase project used by the live RAK site.
2. Open **SQL Editor** and run the complete contents of `supabase/visitor-analytics.sql`.
3. Sign in to the live website with the Google/RAK account that should own the dashboard.
4. In Supabase SQL Editor, run the following statement to grant owner access to that account (replace the email with the exact email used to sign in):
   ```sql
   insert into public.studio_admins (user_id)
   select id from auth.users where lower(email) = lower('YOUR_OWNER_EMAIL')
   on conflict (user_id) do nothing;
   ```
5. Open `https://rakeditingstudio.github.io/Rakeditingstudio/owner-analytics.html` while signed in.

## Security

- Only accounts explicitly listed in `studio_admins` can read raw visit/login events or call the dashboard statistics function.
- Anonymous visitors can only call the visit-recording function; they cannot read the visit table.
- The frontend uses the existing Supabase publishable key. Never add a service-role key, OAuth secret, password, or private credential to the repository.
- Test the dashboard with the owner account and a normal account. A normal account must receive an access-denied message.
- Do not expose the owner email or raw visitor UUIDs on public pages.

## Deployment

The website files are served by GitHub Pages after this branch is merged into `main`. The SQL migration must be run in Supabase separately; merging the code alone does not activate database recording.
