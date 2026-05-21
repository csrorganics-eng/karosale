# How to Release Karosale for QA Testing

For developers — about 5 minutes per release.

## Step 1: Push your code

```bash
git add .
git commit -m "Phase 1: Core shop complete"
git push origin feature/phase-1-foundation
```

## Step 2: Wait for Vercel

Vercel builds automatically (~3 minutes). Confirm a green check on GitHub.

## Step 3: Copy the preview URL

1. Open [vercel.com](https://vercel.com) → your project → **Deployments**
2. Copy the **Preview** URL for your branch  
   Example: `https://karosale-phase-1-abc123.vercel.app`

Set preview env vars (see `.env.preview.example`). Run migrations on preview DB if needed:

```bash
npm run db:migrate
npm run seed
```

## Step 4: Notify QA

WhatsApp template:

> Hi [QA Name], Phase 1 is ready for testing! 🌿  
> Preview URL: [URL]  
> Credentials: see `docs/qa-checklist-phase1.md`  
> Checklist: [Google Doc link]  
> Report bugs: [Google Form link]  
> Please finish by [DATE].

## Step 5: Fix and redeploy

Push fixes to the same branch → new preview URL → ask QA to retest failed items.

## Step 6: Merge to production

When all checklist items pass:

```bash
git checkout main
git merge feature/phase-1-foundation
git push origin main
```

Production deploys automatically. Run `npm run smoke` against production.
