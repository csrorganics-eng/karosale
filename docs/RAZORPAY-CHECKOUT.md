# Razorpay checkout (end-to-end)

This app uses **two** Razorpay secrets:

| Secret | Used for |
|--------|----------|
| `RAZORPAY_KEY_SECRET` | Creating orders, verifying the **payment** signature in `/api/orders/verify-payment` (HMAC of `order_id|payment_id`) |
| `RAZORPAY_WEBHOOK_SECRET` | Verifying **webhook** payloads in `POST /api/webhooks/razorpay` (HMAC of the **raw JSON body**) |

Updating `RAZORPAY_WEBHOOK_SECRET` in `.env.local` only affects **webhooks**. It must match the secret shown for **that specific webhook URL** in the Razorpay dashboard (test vs live mode each have their own keys and webhook secrets).

## 1. Dashboard setup

1. Open [Razorpay Dashboard](https://dashboard.razorpay.com/) (use **Test mode** for local / preview).
2. Go to **Account & Settings** (gear) → **Webhooks** — direct link pattern: `https://dashboard.razorpay.com/app/webhooks` (path may vary slightly by account version).
3. **Add new webhook URL:**  
   `https://<your-public-host>/api/webhooks/razorpay`  
   For local dev, use a tunnel (e.g. [ngrok](https://ngrok.com/), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)) unless you only rely on client-side `verify-payment` (webhooks will not reach localhost).
4. **Active events** (minimum supported by this repo):
   - `payment.captured` — marks order paid, fires Inngest (`ORDER_PLACED`, `ORDER_PAYMENT_CAPTURED`), karma redemption.
   - `payment.failed` — sets `payment_status` to `failed`.
   - `payment.refunded` — full refund: order `refunded`, affiliate commission reversal (partial refunds are logged and skipped for automatic order updates).
5. After saving, copy the **Webhook Secret** into `RAZORPAY_WEBHOOK_SECRET` in `.env.local` (or Vercel env) and **restart** `next dev` / redeploy.

## 2. Other env vars (checkout)

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — [API keys](https://dashboard.razorpay.com/app/keys)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — **must be the same Key ID** as `RAZORPAY_KEY_ID` (same mode: both test `rzp_test_*` or both live `rzp_live_*`). If the public key and server key differ, Checkout.js will not complete payments against orders created on the server.

## Cart and coupons (online vs COD)

For **Cash on Delivery**, the cart is cleared and coupon usage is recorded when the order is created.

For **Razorpay (and other non-COD methods)**, the cart and coupon redemption stay **unchanged until payment is captured**. Then `POST /api/orders/verify-payment` or the `payment.captured` webhook runs `finalizeDeferredCheckoutAfterCapture`, which clears the cart and records coupon usage. That way a failed or abandoned Razorpay attempt does not empty the bag or burn a one-time coupon.

## 3. Inngest

`payment.captured` (webhook or `verify-payment`) sends Inngest events. Set `INNGEST_EVENT_KEY` per `docs/DEPLOY.md` or server logs will show delivery failures.

## 4. Health check

`GET /api/health` includes `hasRazorpayWebhookSecret` so you can confirm the server process picked up `RAZORPAY_WEBHOOK_SECRET`.

## 5. Affiliate payouts (separate)

Affiliate **payout** webhooks use `POST /api/affiliate/webhook/razorpay` and **`RAZORPAY_PAYOUT_WEBHOOK_SECRET`** — not `RAZORPAY_WEBHOOK_SECRET`.
