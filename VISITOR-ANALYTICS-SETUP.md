# RAK Editing Studio — Live Visitor Analytics Upgrade

This upgrade adds approximate live presence, a daily page-view chart, popular pages, and coarse active-device categories to the private owner dashboard.

## What it collects
- A random browser UUID already used by the visit counter.
- Current page path and a heartbeat timestamp (sent every 30 seconds).
- A coarse browser-reported device category: mobile, desktop, tablet, or unknown.
- Aggregated daily page views and popular pages.

It does not collect IP addresses, names, precise location, device fingerprints, or visitor identities. “Live” means a browser heartbeat was received in the last 90 seconds; it is an estimate and may count one browser profile as one visitor.

## Apply the database upgrade
1. Open the existing RAK Editing Studio Supabase project.
2. Open SQL Editor → New Query.
3. Copy the complete contents of `supabase/visitor-analytics-live.sql` from this branch.
4. Run it once. This is an additive upgrade; it does not delete the existing analytics tables or owner allow-list.
5. Open `owner-analytics.html` while signed in with the authorized owner account.

## Deploy
Merge the pull request into `main`. GitHub Pages then publishes the updated dashboard and heartbeat script. The SQL migration is separate and must be run manually in Supabase.

## Privacy and security
- Only the existing studio-admin allow-list can read dashboard aggregates.
- Anonymous/authenticated visitors can only update presence through the restricted RPC; they cannot read the presence table.
- The frontend uses only the existing Supabase publishable key. Never put a service-role key or OAuth secret in the website.
