# PayU integration (FeeManager subscription)

Branch: `feature/payu-integration`

## Purpose

Teachers pay **you** ₹499/month for FeeManager via **PayU Hosted Checkout**.
This is **not** for collecting student tuition from parents.

## Setup

1. Create merchant account at PayU India and get **Key** + **Salt** (test first).
2. Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYU_MERCHANT_KEY=your_key
PAYU_MERCHANT_SALT=your_salt
PAYU_MODE=test
PAYU_PLAN_AMOUNT=499
```

3. For local success/failure callbacks, use a tunnel (ngrok) and set `NEXT_PUBLIC_APP_URL` to that HTTPS URL so PayU can redirect back.

## Flow

1. Settings → **Pay ₹499**
2. `POST /api/payments/payu/initiate` builds hash (server-side) + form fields
3. Browser POSTs to `https://test.payu.in/_payment` (or live)
4. PayU redirects to `/api/payments/payu/success` or `/failure`
5. We validate reverse hash → redirect to `/settings?payment=success|failed`

## Still TODO before production

- [ ] Persist plan + `subscriptionEndsAt` (Supabase)
- [ ] Real institute email in initiate payload
- [ ] PayU webhook (surl can miss if user closes browser)
- [ ] Idempotent txn handling
- [ ] Live KYC / go-live on PayU dashboard

## Security

- **Salt never in client code** — only API routes
- Always verify reverse hash on success
