# Google login (teachers)

## 1. Supabase

1. Authentication → Providers → **Google** → Enable
2. Create OAuth client in [Google Cloud Console](https://console.cloud.google.com/):
   - Application type: Web
   - Authorized redirect URI (copy from Supabase Google provider screen):
     `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Paste **Client ID** + **Client Secret** into Supabase Google provider
4. Save

## 2. SQL

Run `supabase/auth_migration.sql` (adds `owner_user_id` on institutes).

## 3. App env

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_APP_URL` to your real domain and add it under Supabase Auth → URL configuration → Redirect URLs:
`https://yourdomain.com/auth/callback`

## 4. Flow

1. `/login` → Continue with Google
2. Google → Supabase → `/auth/callback`
3. First login creates institute (7-day trial)
4. Redirect home

## 5. Local test

```bash
npm run dev
# open http://localhost:3000/login
```
