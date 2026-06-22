# CSR Organics — native app (Expo)

True **React Native** UI using the same Next.js backend via public JSON routes (`/api/products`, `/api/products/[slug]`).

## Quick start

```bash
cd apps/mobile
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_ORIGIN to your Next server (e.g. http://192.168.1.10:3000 or production HTTPS)
npm install
npm start
```

From the monorepo root you can run:

- `npm run native:start`
- `npm run native:android`
- `npm run native:ios`

## What works today

- **Home** — brand + link to full storefront in the browser.
- **Shop** — product list from the API; tap opens **native product detail**.
- **Cart / Account** — open the existing web flows in the browser (session + Razorpay unchanged).

## Store builds

Use [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/): `npm i -g eas-cli`, `eas login`, `eas build:configure`, then `eas build --platform all`. You still need Apple Developer and Google Play Console setup.
