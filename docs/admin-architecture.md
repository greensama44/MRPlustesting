# Mega Rewards Admin and CMS: audit, architecture and plan

Status: **Phases 1 and 2 (audit and plan). No application code has been changed.**
Audited: repository at `main` (commit `132b5b9` plus local work) and the live site https://mrplustesting.vercel.app (matches the repo).

## 1. What exists today

| Area | Reality (verified in code) | Status |
|---|---|---|
| Hosting | Vercel, static HTML plus serverless functions in `api/`. No `vercel.json`, no CI, no tests. | Working |
| Public site | 11 static HTML pages, about 100 KB each. The shared MR library (accounts, cart, cursor, nav) and base CSS are **duplicated inline in every page**. | Working |
| Content | Hard-coded in HTML and inline JS arrays: giveaways `FT` `GD`, store `DP` `PD`, partners `PT`, moments `MV`, winners `WN` `QT`, tipping `SPT` `SV` `MT` `LB`, plans in `plus.html`, rewards `AC`. No content API. | Not editable without code |
| Accounts API | `register`, `login`, `logout`, `me`, `sync`, `delete`. Passwords use scrypt. Signed HttpOnly cookie, 30 days. | Working (prototype) |
| Database | **None.** One JSON file per account in a *private Vercel Blob* store, keyed by email hash. No queries, joins, transactions or constraints. | Missing |
| Media | No upload pipeline. Photos are Unsplash CDN IDs plus files committed to the repo. | Missing |
| Payments | None. Store checkout and plan changes are demo code in the browser. | Not implemented |
| Email | None (no verification, reset or notifications). | Not implemented |
| Admin, roles, MFA, audit | None. | Not implemented |
| Draws | Demo only (entries exist, no draw engine). | Not implemented |
| Sports data | None. Tipping fixtures and leaderboards are inline sample data. | Mock |
| Analytics | None. Dashboard numbers cannot exist yet without event tracking. | Missing |
| Environment | `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN` only. `.env*` is git-ignored. | OK |

## 2. Risk register (found during the audit)

| # | Severity | Finding |
|---|---|---|
| 1 | **Critical** | `api/sync` accepts the whole account document from the browser and only strips `pw`. Any logged-in member can set their own `plan`, `pts`, `entries`, `cart` and history. Plan, points, tickets and (later) draw eligibility are therefore **client-controlled, not authoritative**. |
| 2 | **Critical** | `partner.html` enquiry form shows "We will be in touch within a business day" and resets, but **sends nothing**. Real enquiries are silently lost. |
| 3 | High | Marketing opt-in on the Join form is **pre-ticked** (`<input id="jm" checked>`) and `mk:true` is the default. This is not valid express consent. |
| 4 | High | No rate limiting or lockout (only a 400 ms delay on bad logins). No email verification, no password reset. |
| 5 | High | Sessions are stateless HMAC cookies for 30 days: they cannot be revoked server-side. No CSRF token (relies on SameSite=Lax). |
| 6 | High | Read-modify-write on whole JSON documents: concurrent syncs overwrite each other. A member list, search or report would require reading every blob. |
| 7 | High | Terms, Privacy, About and Contact footer links are `#`. Competition terms and permit text do not exist anywhere. |
| 8 | Medium | Demo accounts (`alex@`, `jordan@`, `sam@`, `casey@example.com`) and their passwords are public in the README and client JS. They must be disabled in production. |
| 9 | Medium | The shared library is copy-pasted into 11 pages, so any CMS hook has to be injected 11 times unless it lives in one shared script. |

## 3. Proposed architecture

```
 Browser (public site, unchanged design)        Browser (/admin)
        |  GET /api/content  (published only)          |  session cookie + CSRF
        v                                              v
 +-------------------- Vercel serverless functions (api/) --------------------+
 |  public:  content, offers, giveaways, enquiries (POST), member API (as now) |
 |  admin :  /api/admin/*  -> auth -> RBAC check -> validate -> transaction    |
 +----------------+------------------------------+----------------------------+
                  |                              |
          Postgres (source of truth)      Vercel Blob (public: approved media;
          + append-only audit_log          private: legacy accounts until migrated)
```

Decisions (proposed, reuse existing infrastructure wherever possible):
- **Database: Postgres via the Vercel Marketplace (Neon).** The one new service. `DATABASE_URL` is added by the integration. Plain SQL migrations in `db/migrations/`, no ORM.
- **Admin UI: static HTML plus vanilla JS modules under `/admin`.** Matches the repo (no build step), reuses the brand tokens and fonts, fully responsive.
- **Admin auth:** separate `admin_users` table, scrypt (already used), **TOTP MFA** (RFC 6238, no provider needed), **server-side sessions in the database** (revocable), `SameSite=Strict` cookie, CSRF token and Origin check on every write, login rate limiting and lockout. The first Super Admin is created by a one-time bootstrap script using an environment secret. Nothing is hard-coded.
- **Permissions:** enforced in every `/api/admin/*` handler, never in the UI.
- **Public content delivery:** pages keep today's inline arrays as the **fallback and seed**, and a single small shared script overrides them with published CMS content from `/api/content` (edge-cached, stale-while-revalidate). If the API or database is down, the site renders exactly as it does today. Day one, the CMS is seeded from the current arrays so nothing changes visually.
- **Publishing workflow:** `draft` then `in review` then `approved` then `published` or `scheduled`, with immutable versions and one-click rollback to a previous published version. High-risk items need a second approver.
- **Audit:** append-only `audit_log` (database trigger blocks UPDATE and DELETE) with actor, action, entity, before and after JSON, IP and timestamp.
- **Members and points (the critical fix):** move member state into Postgres with a **points ledger** (unique idempotency key per event), server-computed plan and entitlements, and entries recorded server-side. The browser keeps a read-only cache for speed. Sequenced after the CMS core and explicitly migrated, not bolted on.

### Data model (first migration set)
`admin_users`, `admin_sessions`, `admin_mfa`, `audit_log`, `content_entries` and `content_versions` (JSONB, status, schedule), `media_assets` and `media_usages`, `giveaways` and `giveaway_revisions`, `offers` and `offer_revisions`, `partners`, `partner_enquiries`, `policy_versions` and `policy_acceptances`.
Later migrations: `members`, `points_ledger`, `entries`, `draws` (two-person approval), `winners`, `subscriptions` (once a payment provider exists), `missions`, `fixtures`.

### Roles (permission matrix)
Super Admin (all, manages admins), Website Editor (content, media), Campaign Manager (giveaways, media), Savings Manager (offers, partners), Customer Support (members read, notes, enquiries), Finance Manager (subscriptions, refunds, exports), Competition Officer (draws, winners), Analyst (read-only). Draw approval and sensitive financial changes require a **different admin** from the one who requested them.

## 4. Phased plan and what is genuinely buildable

| Phase | Scope | Verifiable here? |
|---|---|---|
| 3 Foundation | Migrations, admin auth with MFA and sessions, RBAC, audit log, dashboard shell, shared `content.js`, enquiries API (fixes risk 2) | Yes, against an in-process Postgres (PGlite) with automated tests; production DB needs your account |
| 4 Core CMS | Media library, giveaways, savings offers, website content editing, publish, schedule, rollback | Yes (same) |
| 5 Operations | Partners, enquiries inbox, policy versions and acceptances, then members and ledger migration (risks 1, 3, 5, 6), winners and fulfilment | Partly: logic and tests yes; real email, payments, sports data no |
| 6 Hardening | Rate limiting, CSP headers, backup and restore notes, Preview vs Production env separation, deployment and rollback runbook | Checklist and scripts yes; live infra no |

Cannot be real until an external service exists (the dashboard will show **"Not connected"**, never invented numbers): payments, subscriptions, refunds and revenue (no provider), email and notifications (no provider), tipping fixtures and results (no sports data source), site engagement analytics (no event tracking), store orders (checkout is demo), certified draws (needs approved rules and permits; only a backend, audited, two-person draw will be built, never a simulated one).

## 5. Needed from you
1. Create a **Postgres database** (Vercel project, Storage, Marketplace, Neon) so `DATABASE_URL` exists for Preview and Production. Until then, everything is built and tested locally.
2. Confirm who the first Super Admin is (the account is created by running a one-time script locally, never committed).
3. Confirm the legal items that gate real giveaways: competition terms, privacy policy text and any permit details.
