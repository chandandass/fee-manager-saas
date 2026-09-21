# Google login (teachers)

## Fix for tokens in URL hash

If you land on `/login?error=auth#access_token=...`:

1. Pull latest code (client `/auth/callback` handles hash)
2. Supabase → Authentication → URL configuration:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** `http://localhost:3000/auth/callback`
3. Try login again — should end on Home

Optional: open the long URL once; new login page auto-forwards hash to `/auth/callback`.

## Setup checklist

1. Run `supabase/auth_migration.sql`
2. Enable Google provider (Client ID + Secret)
3. Google Cloud redirect: `https://<ref>.supabase.co/auth/v1/callback`
4. App redirect: `http://localhost:3000/auth/callback`
5. `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY`
