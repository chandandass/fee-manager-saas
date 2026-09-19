# Supabase setup (FeeManager)

## Practice we follow

- **Supabase** = database for institutes / students / fees
- **Next.js API** = PayU hash, verify payment, activate plan (service role)
- Client never gets `SUPABASE_SERVICE_ROLE_KEY`

## Steps

1. Create project at supabase.com
2. SQL Editor → paste and run `supabase/schema.sql`
3. `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

4. Install client:

```bash
npm install @supabase/supabase-js
```

5. Restart `npm run dev`

## After PayU success

- Verifies hash (Next API)
- Updates `institutes.plan = basic` + `subscription_ends_at` in Supabase
- Logs row in `payment_events`
- Sets JWT cookie

Plan survives server restart.

## Next migrations

- [ ] Supabase StudentRepository / FeeRepository / BatchRepository
- [ ] Point `createRepositories()` fully at Supabase
- [ ] Auth + tighten RLS (remove dev open policies)
