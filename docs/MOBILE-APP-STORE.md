# Mobile app (App Store & Play Store)

This repo is a **Next.js** storefront (server-rendered pages, API routes, webhooks). You now have **two** mobile paths:

1. **`apps/mobile` — Expo (React Native)** — native tabs, list/detail using your public `/api/products` JSON, with cart/account/checkout opened in the in-app browser until you wire native flows.
2. **Capacitor (repo root)** — a thin **WebView** shell around the full deployed site (see below).

## Expo app (`apps/mobile`)

| Item | Notes |
|------|--------|
| **SDK** | **Expo SDK 54** — matches **Expo Go on the App Store / Play Store**. Do **not** use SDK 56 with store Expo Go; it is not published there yet. |
| Config | `apps/mobile/.env.example` → copy to `.env` and set `EXPO_PUBLIC_API_ORIGIN`. |
| Run | `npm run native:start` or `cd apps/mobile && npm start`. After dependency changes: `npx rimraf node_modules && npm install`. |
| Store build | [EAS Build](https://docs.expo.dev/build/introduction/) (`eas build`) after `eas init`. |

React Native does **not** enforce browser CORS; the app calls your REST routes directly.

## Capacitor (WebView shell)

The practical way to ship **iOS and Android store binaries** without rewriting the whole product in React Native is a **native shell (Capacitor)** that loads your **deployed HTTPS site** in a full-screen WebView—same pattern many teams use for “web-first” commerce.

## Reference projects you mentioned

The paths under `.cursor/projects/...` are **Cursor IDE metadata** (MCP descriptors, canvases). They do **not** contain the HH-AU or LetsGo application source, so this integration follows **Capacitor’s official web-to-native** workflow instead. If your real HH-AU / LetsGo code lives elsewhere (e.g. another folder under `Downloads`), open that workspace here and we can align naming, signing, or CI to match it exactly.

## What was added in this repo

| Piece | Purpose |
|--------|--------|
| `capacitor.config.ts` | App id, display name, `server.url` (your live storefront), splash defaults |
| `capacitor-www/` | Minimal static `webDir` required by Capacitor (`cap sync` copies plugins here) |
| `components/mobile/CapacitorShell.tsx` | Status bar styling when running inside the native shell |
| npm scripts | `mobile:sync`, `mobile:open:android`, `mobile:open:ios` |

The **WebView loads `CAPACITOR_SERVER_URL`**, then **`NEXT_PUBLIC_APP_URL`**, then falls back to **`https://karosale.com`**. Store builds should point at your **production** URL.

## Prerequisites

- **Node.js** (same as web app).
- **Android**: Android Studio, JDK 17, Android SDK; a physical device or emulator.
- **iOS**: **macOS with Xcode** (Apple does not allow building/signing iOS App Store IPA on Windows). You can still author the shared TS/JS and `capacitor.config.ts` on Windows; run `cap open ios` and archive on a Mac.

## One-time native project generation

From the repo root (after `npm install`):

```bash
npx cap add android
npx cap add ios
```

Then whenever you change Capacitor config or add/remove plugins:

```bash
npm run mobile:sync
```

Open IDEs:

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

## Environment variables

Set in your shell (or `.env` **only** for local `cap` CLI—**do not** commit secrets):

| Variable | Meaning |
|----------|---------|
| `CAPACITOR_SERVER_URL` | HTTPS origin the app opens (e.g. `https://www.csrorganics.com`) |
| `CAPACITOR_ALLOW_CLEARTEXT` | `true` only if you intentionally use `http://` (e.g. LAN dev) |

Example before sync:

```bash
set CAPACITOR_SERVER_URL=https://your-production-domain.com
npm run mobile:sync
```

On Unix:

```bash
CAPACITOR_SERVER_URL=https://your-production-domain.com npm run mobile:sync
```

## Store readiness checklist (high level)

### Shared

1. **Unique `appId`** in `capacitor.config.ts` (`com.csrorganics.store` today)—must match the IDs you register in Apple / Google consoles (change if already taken).
2. **Privacy policy & support URL** on the live site; link them in both store listings.
3. **Auth & payments**: OAuth and third-party checkout (e.g. Razorpay) must be tested **inside the WebView**; fix cookie `SameSite`, redirect URLs, and any “blocked pop-up” flows.
4. **Content-Security-Policy** on the Next app must allow your payment and analytics domains (already tuned for Razorpay / PostHog in `next.config.ts`—revisit if you add hosts).

### Google Play

1. Play Console app, signing key (Play App Signing), **Data safety** form.
2. **Target API level** requirements: bump in Android Studio / Gradle when Play mandates a newer SDK.
3. **AAB** build from Android Studio (Build → Generate Signed Bundle).
4. Internal testing track → production.

### Apple App Store

1. Apple Developer Program, **App ID** matching `appId`, provisioning profiles.
2. **Privacy manifest** (required for new SDKs): add or adjust in Xcode as Apple requires for linked binaries.
3. **App Transport Security**: production site must be **HTTPS** with valid TLS.
4. Archive in Xcode → **TestFlight** → App Review.

## Optional hardening (later)

- **Universal Links / App Links** so `https://your-domain/...` opens the app when installed.
- **Push notifications** (FCM + APNs) via a Capacitor push plugin—requires backend topics and store disclosures.
- **Offline / bundled** mode is **not** applicable to this architecture unless you move to a static export or a separate native UI; the live Next server remains the source of truth.

## QA smoke test on device

1. Deploy web to staging/production with `NEXT_PUBLIC_APP_URL` correct.
2. `CAPACITOR_SERVER_URL=<that same origin> npm run mobile:sync`
3. Run the Android or iOS project on a device: browse shop, sign in, add to cart, complete a **test** payment in Razorpay’s test mode if applicable.

This path gets you **real store listings** with a **single web codebase**; full “native rewrite” in React Native would be a separate multi-month project.
