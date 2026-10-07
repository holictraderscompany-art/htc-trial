# Authentication and Role Foundation

## Supabase Auth and Google OAuth

Supabase Auth is the identity foundation for HTC. Google OAuth is the required provider, but its activation requires real Google OAuth Client ID and Client Secret values managed securely in the Supabase project. No OAuth credentials or secrets are stored in this repository.

## Role model

The database enum `public.user_role` contains exactly `USER` and `FOUNDER`. Every authenticated HTC identity defaults to `USER`. The exact normalized identity `holictraderscompany@gmail.com` receives `FOUNDER` through a database-controlled authentication synchronization trigger.

Founder authority is determined from `public.user_profiles.role`, never from frontend email checks, client-provided role values, or user-editable metadata.

## Identity relationship and synchronization

`public.user_profiles.id` references `auth.users.id` with `ON DELETE CASCADE`. A database trigger creates the matching profile after an auth user is created. A second database trigger re-evaluates the role when the auth email changes. Email normalization trims whitespace and lowercases the value before comparison.

Role changes are protected by a database trigger. Normal authenticated profile updates may change only `display_name`; protected identifiers, timestamps, and role cannot be changed directly. The trusted auth synchronization function is the only role-changing path.

## RLS authorization model

RLS remains enabled on `public.user_profiles`. Authenticated users may read their own profile and update their own `display_name`. The Founder may read profiles and update only the permitted profile field. Anonymous users have no profile access or write permission. No role or identity policy accepts client-controlled values.

The `public.is_founder()` helper is a minimal `SECURITY DEFINER` function with a fixed search path and no client-controlled parameters. It reads the database role state without causing RLS recursion.

## Scope and security

T03 establishes authentication and role authorization foundation only. T04 will define API, access-control, server-action, and release behavior. T03 creates no UI, application routes, middleware, API, framework, or runtime dependencies.

OAuth secrets, service-role keys, passwords, tokens, and production credentials must never be committed. Real Google OAuth credentials must be configured in the Supabase provider settings before Google OAuth can be marked active.

The September–December 2026 trial has no lessons, open curriculum, learning modules, quizzes, Beginner curriculum, or public learning dashboard. Official curriculum begins in January 2027.
