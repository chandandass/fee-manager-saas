# PayU integration (FeeManager subscription)

Branch: `feature/payu-integration`  
Price: **₹249 / month**

## Purpose

Teachers pay **you** for FeeManager via PayU Hosted Checkout.  
Not for collecting student tuition from parents.

## Setup

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
PAYU_MERCHANT_KEY=...
PAYU_MERCHANT_SALT=...
PAYU_MODE=test
PAYU_PLAN_AMOUNT=249
```

### Test vs real (live)

| | Test | Live (real money) |
|--|------|-------------------|
| Keys | Test key/salt from PayU | **Live** key/salt after KYC |
| `PAYU_MODE` | `test` | `live` |
| URL | test.payu.in | secure.payu.in |
| Money | Fake / sandbox | Real UPI/cards |

**Code path is the same.** Switch env to live only after PayU approves go-live.

Local callbacks: use ngrok HTTPS as `NEXT_PUBLIC_APP_URL`.

## Flow

1. Settings → **Pay ₹249**
2. Server hash → POST to PayU
3. Success/failure → verify reverse hash → Settings banner

## Production checklist

- [ ] PayU KYC complete
- [ ] Live key + salt in host secrets (Vercel/etc.)
- [ ] `PAYU_MODE=live`
- [ ] Public HTTPS app URL
- [ ] Persist plan in DB on success
- [ ] Webhook as backup
