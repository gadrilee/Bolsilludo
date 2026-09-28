# ADR-E: Authentication Strategy

## Context
We need a robust authentication system that integrates seamlessly with PostgreSQL and supports our Row-Level Security (RLS) requirements for multi-tenant budget workspaces.

## Options
1. **(Recommended)** **Supabase Auth**: Use the integrated Supabase Authentication service.
2. **Auth.js (NextAuth)**: Use the community-standard Next.js authentication library.

## Proposed Decision: Option 1
We will use **Supabase Auth**.
- **Why**: Since we are utilizing Supabase for managed PostgreSQL, Supabase Auth natively binds user UUIDs to PostgreSQL session variables. This allows us to write strict, database-level Row-Level Security (RLS) policies (`auth.uid() = user_id`) effortlessly. It significantly reduces backend boilerplate and hardens our security posture directly at the data layer.
