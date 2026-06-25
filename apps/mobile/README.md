# CSR Organics — Native Shopper App

Standalone **React Native (Expo)** app for shoppers. It talks to your **Next.js API** (`/api/*`) with JWT auth — it does **not** open the website in a browser for shopping.

## Architecture

| Layer | Role |
|-------|------|
| `apps/mobile` | Native UI (Expo SDK 54) |
| `app/api/*` + `lib/*` | Backend (same deployment as the web store) |
| `POST /api/auth/mobile/*` | Email/password login & register → JWT |
| `Authorization: Bearer` | Mobile session on all protected routes |
| `X-Cart-Session` | Guest cart (replaces browser cookie) |

## Features (native)

- Home (banner, categories, bestsellers)
- Shop & product detail
- Search
- Cart (add, update qty, remove)
- Sign in / register
- Checkout (addresses, coupons, COD)
- Orders list & detail
- Wishlist
- Account & Karma summary

## Setup

```bash
cd apps/mobile
cp .env.example .env
# EXPO_PUBLIC_API_ORIGIN = your API server (LAN IP:3000 for local dev, or production URL)
npm install
npm start
```

Run the **Next.js server** separately (`npm run dev` at repo root) when using a local API origin.

## Store release

1. **Expo SDK 54** — works with Expo Go for development.
2. **EAS Build** (`eas build`) for App Store / Play Store binaries.
3. **Razorpay** — COD works in Expo Go; card/UPI needs `react-native-razorpay` in a production build (next step).

## Not in v1 (can add next)

- Phone OTP login (API exists; needs mobile token wiring)
- Google sign-in
- Subscriptions UI
- Product reviews on PDP
- Push notifications
- Affiliate portal
