# Plan: Fix login session not inheriting across hosts (AWS + Vercel)

## Problem

After login on the landing page, navigating into a sub-app (pump, psv, vessels, …) lands the
user on a page that thinks they are **not** authenticated — the new `AuthGuard` finds an empty
session and redirects back to `/`.

## Root cause

The shared session is persisted in **`localStorage`** under key `pes-shared-auth-storage`
(`packages/ui-kit/src/auth/useSharedAuthStore.ts`). `localStorage` is **partitioned per browser
origin** (scheme + host + port). The session is therefore only visible to the exact origin that
wrote it.

Today the apps are reachable on **multiple origins**, so the session cannot be seen across them:

- **Vercel:** every app is its own deployment/origin
  (`process-engineering-suite-web.vercel.app`, `pes-pump-calculation.vercel.app`,
  `pes-psv-suite.vercel.app`, …). Each `apps/*/vercel.json` uses **302 `redirects`** to bounce
  the browser between these origins. Login happens on the `web` origin; the sub-app origin starts
  with empty `localStorage`.
- **AWS (real target):** the `web` app *can* reverse-proxy sub-apps via the `rewrites()` already
  defined in `apps/web/next.config.ts`, which would keep one origin — **but** that wiring is
  currently broken on AWS (see "AWS findings" below), so sub-apps are reached on separate hosts.

It works **locally** only because `web`'s `rewrites()` keep everything on `http://localhost:3000`
— a single origin.

> Note: `*.vercel.app` is on the Public Suffix List, so a shared `Domain=.vercel.app` cookie is
> **not** possible. Cross-subdomain cookies only become an option under a custom apex domain.

## Guiding principle

The `localStorage` session model is fine. It only breaks when the browser sees **more than one
origin**. **The fix on every lane is to collapse to a single browser-visible origin.** No auth
rewrite is required for that to work.

---

## Lane 1 — AWS Docker / ECS (real production target)

**Goal:** every app served under **one hostname** (e.g. `https://eng-suite.gcme.co.th`), so the
browser only ever sees one origin and `localStorage` is shared automatically.

### AWS findings (must fix regardless)

1. **`DEPLOY_TARGET` vs `DEPLOYMENT_ENV` mismatch.** `apps/web/next.config.ts` reads
   `process.env.DEPLOY_TARGET`, but the ECS task defs set `DEPLOYMENT_ENV=aws`
   (`infra/aws/task-definitions/web.json`). On AWS `deployTarget` falls back to `"local"`, so the
   rewrite origins resolve to `http://localhost:3xxx` — wrong inside Fargate.
2. **Sub-app URL env vars unset on AWS.** `PUMP_URL`, `PSV_URL`, … are not provided in the AWS web
   task def, so even with the target fixed there are no real upstreams configured.

### Approach (recommended: ALB path-based routing = true single origin)

1. **Single front door.** Put one **ALB (or CloudFront)** in front of all ECS services under one
   hostname, with **path-based routing**:
   - `/psv/*` → psv target group
   - `/pump-calculation/*` → pump target group
   - `/network-editor/*`, `/design-agents/*`, `/<each>-calculation/*` → respective target groups
   - `/` (everything else) → web target group
   - `/auth/*`, `/calculations/*`, `/calculate/*` → api target group (port 8000)
   This makes **all** apps same-origin. No redirects, no rewrites, no cross-origin hop.
2. **Each sub-app keeps its `basePath`** (already set, e.g. `/psv`, `/pump-calculation`) so the ALB
   path prefixes line up with what each Next.js app expects.
3. **Set CORS / auth API origin.** `NEXT_PUBLIC_AUTH_API_URL` points at the same hostname
   (`https://eng-suite.gcme.co.th`) since `/auth/*` is routed to the api service by the ALB.
   Add the hostname to `CORS_ALLOWED_ORIGINS` for the api service.

   *Alternative if an ALB rule set is undesirable:* keep the **web app as the single proxy** —
   fix finding #1 (`DEPLOY_TARGET=vercel`-style behavior, i.e. make web use rewrites on AWS) and
   #2 (point `PUMP_URL` etc. at internal **service-discovery DNS** like
   `http://pump.pes.local:3000`). Browser still only sees the web origin. Downside: all sub-app
   traffic flows through the web container.

### AWS work items

- [ ] Decide ALB path-routing (preferred) vs web-app-proxy.
- [ ] If ALB: author listener rules per path prefix → target groups; register each ECS service.
- [ ] If web-proxy: reconcile `DEPLOY_TARGET`/`DEPLOYMENT_ENV` in `next.config.ts` and task defs;
      set `*_URL` env vars to internal DNS in `web.json`.
- [ ] Set `NEXT_PUBLIC_AUTH_API_URL` to the single hostname; add it to api `CORS_ALLOWED_ORIGINS`.
- [ ] Smoke test: login on `/`, navigate to `/psv` and `/pump-calculation`, confirm session sticks.

---

## Lane 2 — Vercel (secondary / preview lane)

**Goal:** keep the browser on the `web` origin so `localStorage` is shared, by **proxying instead
of redirecting**.

### Approach

1. **Stop the cross-origin redirects.** Remove the sub-app `redirects` from each
   `apps/*/vercel.json` that bounce the browser to `pes-*.vercel.app`. Those 302s are what move the
   user off the `web` origin.
2. **Rely on `web`'s existing `rewrites()`.** `apps/web/next.config.ts` already proxies
   `/<app>/:path*` to each app's Vercel origin transparently — the browser URL stays
   `process-engineering-suite-web.vercel.app/...`. One origin → session shared.
3. **Keep the standalone sub-app `redirects` for `/` only.** Each sub-app's `vercel.json` already
   redirects bare `/` back to web; that's fine (direct hits to a sub-app origin bounce home). With
   the `AuthGuard`, a direct unauthenticated hit to a sub-app origin redirects to `/` → web login.
4. **Verify Vercel proxy cost/latency** is acceptable (all sub-app traffic routes through the web
   deployment). Acceptable for a preview lane; AWS is the real target.

### Vercel work items

- [ ] Trim cross-origin sub-app `redirects` from every `apps/*/vercel.json` (keep `/` → web and
      `/account-settings` → web).
- [ ] Confirm `web/next.config.ts` rewrites cover every app path (they do today).
- [ ] Set `NEXT_PUBLIC_AUTH_API_URL` for the web project to the deployed API origin; ensure that
      origin is in the api `CORS_ALLOWED_ORIGINS`.
- [ ] Smoke test on Vercel: login, deep-link into each app under the web origin, confirm session.

---

## Shared hardening (both lanes)

- [ ] Keep a **single storage key** (`pes-shared-auth-storage`) and a single `AuthGuard.homeHref`
      (`/`) — both already in place.
- [ ] `AuthGuard` already restores the session before deciding; no change needed once origin is
      unified.
- [ ] Document the single-origin requirement in `pes-web-dna.md` and
      `docs/ENVIRONMENT_VARIABLES.md` so future apps don't reintroduce a second origin.

## Future option (only if apps must live on separate subdomains)

If a custom apex domain is adopted with per-app subdomains (`pump.gcme.co.th`, …) and single-origin
proxying is undesirable, migrate the session from `localStorage` to a cookie scoped
`Domain=.gcme.co.th; Secure; SameSite=Lax` (ideally `httpOnly`, set by `/auth/login`). This is the
only way to share across distinct subdomains and is **not** needed if Lane 1's single-origin front
door is adopted.

## Out of scope

- Replacing the fallback (offline) auth path.
- Real RBAC/server-side authorization (separate effort).
