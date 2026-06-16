# Plan: Account Settings + Admin User CRUD + Account-button polish

> **Status:** Ready for implementation (intended for a step-by-step model, e.g. Haiku).
> **Scope:** P0 — Account Settings page (`/account-settings`), Admin user CRUD API,
> replace the menu "Home Page" link, and polish the account button (logged-out "⋯",
> logged-in icon).

---

## Current state (verified against the codebase)

- **Auth store** — `packages/ui-kit/src/auth/useSharedAuthStore.ts` exposes `currentUser`,
  `isAuthenticated`, `isRestored`, `accessToken`. Token is real from the API, but **fake**
  (`fallback_<id>_<ts>`) in offline fallback mode.
- **`SharedUserMenu.tsx`** — avatar trigger already shows initials (not the username). Menu has
  a hardcoded **"Home Page"** item, an optional Account Settings item behind an unused
  `showAccountSettings` prop + `onAccountSettings` callback (no route today), and Log In/Out.
- **API** — `/auth/login`, `/auth/me` (stubbed; does **not** load the user from the DAL),
  `/auth/logout`. `decode_token()` exists in `routers/auth.py` but there is **no reusable auth
  dependency and no admin guard**. `routers/admin.py` endpoints are currently **unprotected**.
- **DAL** — read-only user methods exist (`get_users`, `get_user_by_id`, `get_user_by_email`,
  `get_credential_by_username`, `update_credential_login`). **No create/update/delete/set-password.**
- **`apps/web`** — single-route app (`src/app/page.tsx` + `components/LandingLoginGate.tsx`).
  Login already happens at the landing gate, so removing "Log In" from the menu is safe.
- **No `repositories/` dir** despite the CLAUDE.md mention. `admin.py` already branches
  `MockService` vs `DatabaseService` inline using `dal.session` — that is the established write
  pattern and it **avoids the `db_service` god class** (which `CLAUDE.md` forbids extending).

---

## Decisions baked in

- **`/account-settings` lives in `apps/web`** (the hub). Calculator apps reach it via a new
  `vercel.json` redirect. One route; admins see an extra "User Management" panel on the same
  page (matches the P0 spec "admin gets user list").
- **Login stays on the web landing gate** (`LandingLoginGate`). The logged-out account button
  becomes a "**⋯**" menu with only a Docs link — no login regression because login is at the
  landing.
- **Write-path stays out of `db_service`** (CLAUDE.md hard rule). New backend logic goes in a
  dedicated module branching Mock/DB inline, exactly like `admin.py` already does.
- **Admin CRUD requires the real API.** In fallback/offline mode tokens are fake and there is no
  server — the admin panel must show a "backend required" state, not silently fail.

### Two decisions locked for this build

- **User delete = soft delete** → set `status = "inactive"` (use `SoftDeleteMixin`). Never hard-delete.
- **Logged-out "⋯" Docs link = relative `/docs`** (resolved by each app's `vercel.json` redirect),
  so it works the same from every app domain.

---

## Phase 1 — Backend: reusable auth dependency + admin guard

**File:** new `services/api/app/auth_deps.py`

- `get_token_payload(creds = Depends(HTTPBearer())) -> dict` — wraps `decode_token`. Move
  `decode_token` here and re-import it in `routers/auth.py`, or import from `auth.py` (avoid a
  circular import — moving it here is cleaner).
- `async def get_current_user(payload = Depends(get_token_payload), dal: DAL) -> dict` — loads the
  real user via `dal.get_user_by_id(payload["sub"])`; 401 if missing/inactive. Normalize ORM-vs-dict
  access the same way `auth.py` login does (`hasattr(...)`).
- `async def require_admin(user = Depends(get_current_user))` — 403 unless `user["role"] == "admin"`.

Also fix `/auth/me` in `routers/auth.py` to use `get_current_user` so it returns a real user
instead of the `"Authenticated User"` stub.

**Acceptance:** `GET /auth/me` with a valid token returns the real user; with no/expired token → 401.

## Phase 2 — Backend: user-admin write module

**File:** new `services/api/app/services/user_admin.py` (plain async functions, branch Mock/DB like `admin.py`)

- `list_users(dal)` → reuse `dal.get_users()`.
- `create_user(dal, data)` → insert `User` + `Credential` (bcrypt hash via the existing `bcrypt`
  helper pattern in `auth.py`); enforce unique email/username; default `role="engineer"`,
  `status="active"`.
- `update_user(dal, user_id, data)` → patch name/initials/email/role/status.
- `delete_user(dal, user_id)` → **soft delete** (`status="inactive"`).
- `set_password(dal, user_id, new_password)` → update `Credential.password_hash` (bcrypt).
- `change_own_password(dal, user_id, current_password, new_password)` → verify current with
  `verify_password`, then `set_password`.

For `DatabaseService` use `dal.session` + SQLAlchemy `select/insert/update` (see `admin.py`
`export_mock_data`). For `MockService` mutate `dal._data["users"]` / `dal._data["credentials"]`.

**Acceptance:** call each in mock mode (no DB) and confirm `dal._data["users"]` mutates.

## Phase 3 — Backend: users router

**File:** new `services/api/app/routers/users.py`, registered in `routers/__init__.py`.

| Method | Path | Guard | Action |
|--------|------|-------|--------|
| GET | `/users` | `require_admin` | `list_users` |
| POST | `/users` | `require_admin` | `create_user` |
| PATCH | `/users/{id}` | `require_admin` | `update_user` (role assignment here) |
| DELETE | `/users/{id}` | `require_admin` | `delete_user` (soft) |
| PATCH | `/users/me` | `get_current_user` | update own name/initials |
| POST | `/users/me/password` | `get_current_user` | `change_own_password` |

Pydantic schemas: `UserCreate`, `UserUpdate`, `SelfUpdate`, `PasswordChange`. Reuse the
`UserResponse` shape from `auth.py`.

**Acceptance:** with an admin token, full CRUD round-trips via `/docs`; with an engineer token,
`/users` → 403 but `/users/me` works.

## Phase 4 — Frontend: authed fetch helper + admin client

**File:** new `packages/ui-kit/src/auth/apiFetch.ts` (export from `auth/index.ts`)

- `authedFetch(path, init, apiBaseUrl)` — pulls `accessToken` from the store snapshot, sets
  `Authorization: Bearer …`, throws on 401/403.
- `isFallbackSession()` — token starts with `fallback_`; lets the UI disable admin actions offline.
- Thin client fns: `fetchUsers`, `createUser`, `updateUser`, `deleteUser`, `updateMyProfile`,
  `changeMyPassword`.

**Acceptance:** logged in as admin against local API (`:8000`), `fetchUsers()` returns the list.

## Phase 5 — Frontend: rework `SharedUserMenu.tsx`

1. **Logged out →** render a `MoreVert` ("⋯") `IconButton` instead of the avatar; menu contains a
   single **Docs** item (`docsHref` prop, link only — feature "implement later"). No Login item.
2. **Logged in →** keep the avatar trigger (already an icon with initials). Confirm no caller renders
   the username as text next to it; remove if found. *(Covers "use the icon instead of user name.")*
3. Replace the hardcoded **"Home Page"** item with **"Account Settings"** → links to
   `accountSettingsHref`. If `currentUser.role === "admin"`, add a second **"User Management"** item
   → `${accountSettingsHref}?tab=admin`.
4. New props: `accountSettingsHref`, `docsHref`. Drop the now-unused
   `showAccountSettings` / `onAccountSettings` (or keep for back-compat).

**Acceptance:** toggling auth swaps ⋯ ↔ avatar; admin sees both menu items, engineer sees only
Account Settings.

## Phase 6 — Frontend: `/account-settings` page in `apps/web`

**File:** new `apps/web/src/app/account-settings/page.tsx` (+ small components)

- **Profile section (all users):** form for name/initials (`PATCH /users/me`) and a password-change
  form (`POST /users/me/password`).
- **Admin section (`role === 'admin'`, `?tab=admin`):** user table with create/edit/delete + role
  dropdown (`engineer | lead | approver | division_manager | admin | viewer`) wired to the Phase-4
  client. Show a disabled "backend required" banner if `isFallbackSession()`.
- Guard: if `isRestored && !isAuthenticated` → redirect to `/` (landing gate handles login).

**Acceptance:** profile edit persists across reload; admin can create → edit → deactivate a user.

## Phase 7 — Wiring & docs

- Add a `/account-settings` redirect to **every app's `vercel.json`** pointing at
  `process-engineering-suite-web.vercel.app/account-settings` (web's own file omits it).
- Update the `SharedUserMenu` callers in all `TopToolbar.tsx` to pass `accountSettingsHref` and
  `docsHref`.
- Add an Alembic migration only if any `User`/`Credential` column changes (none expected — schema
  already supports this).
- Update `pes-web-dna.md` §3.0a (menu states) and §14.2 (new redirect row).

**Acceptance:** from a calculator app domain, clicking Account Settings lands on the web page;
logged-out shows ⋯ → Docs.

---

## Build order (each step compiles & is verifiable before the next)

`P1 → P2 → P3` (backend, test via `/docs`) → `P4` (client) → `P5` (menu, visual) → `P6` (page) →
`P7` (wiring/docs).

## Files touched (summary)

**New**
- `services/api/app/auth_deps.py`
- `services/api/app/services/user_admin.py`
- `services/api/app/routers/users.py`
- `packages/ui-kit/src/auth/apiFetch.ts`
- `apps/web/src/app/account-settings/page.tsx` (+ components)

**Modified**
- `services/api/app/routers/auth.py` (fix `/auth/me`, possibly move `decode_token`)
- `services/api/app/routers/__init__.py` (register users router)
- `packages/ui-kit/src/auth/index.ts` (export `apiFetch`)
- `packages/ui-kit/src/auth/SharedUserMenu.tsx`
- all `apps/*/src/components/TopToolbar.tsx` (pass new props)
- all `apps/*/vercel.json` (add `/account-settings` redirect)
- `pes-web-dna.md`
