# Database Foundation

PostgreSQL, managed through Supabase, is the future HTC database foundation. T02 establishes only the minimum application-independent core data structure required for later foundation work.

## T02 scope

The current core table is `public.user_profiles` with only these fields:

- `id` — UUID primary key, not null
- `display_name` — nullable text
- `created_at` — non-null `timestamptz`, default `now()`
- `updated_at` — non-null `timestamptz`, default `now()`

A PostgreSQL trigger keeps `updated_at` current on row updates. No sample data is created.

## Migration policy

Database changes are represented by versioned migrations. T02 uses `supabase/migrations/20260925_core_data_foundation.sql`. Migrations must remain deterministic, reviewable, and limited to their approved task scope.

## RLS baseline

Row Level Security is enabled on `public.user_profiles`. T02 creates no access policies. This intentional deny-by-default baseline remains until authentication and authorization are defined by later tasks.

## Task separation

T03 defines authentication and role architecture. T04 defines API and access-control behavior. T02 does not connect `user_profiles` to `auth.users`, implement authentication, assign roles, or implement authorization.

## Security baseline

No secrets, credentials, passwords, tokens, email fields, role fields, or provider fields are stored by this foundation. Service-role credentials and database passwords must never be committed or exposed. Future access must be server-side and least-privilege; RLS policies must be reviewed when introduced.

T02 does not implement application features, UI, APIs, runtime code, frameworks, dependencies, deployment, or CI/CD.
