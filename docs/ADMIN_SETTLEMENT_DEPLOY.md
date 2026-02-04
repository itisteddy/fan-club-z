# Deploy Admin Settlement Fix (resolve 400)

See also: **Landing page deploys** — `docs/VERCEL_LANDING_DEPLOY.md`

To fix the **400 Bad Request** on admin “Settle prediction” in production:

## 1. Deploy the fix

- **Merge/push your branch to `main`** (with the admin settlement changes).
- **Frontend (main app):** The CD workflow deploys the **client** to Vercel (project id from `VERCEL_PROJECT_ID`). That update includes the fixed admin payload and UI.
- **Backend (Render):** If Render is connected to this repo, it will auto-deploy on push to `main`. If not, open [Render Dashboard](https://dashboard.render.com) → **fan-club-z** → **Manual Deploy** → **Deploy latest commit**.

## 2. Backend env (Render)

Admin routes need `ADMIN_API_KEY` on Render; otherwise you get **401**, not 400.

- In Render: **fan-club-z** → **Environment** → ensure **ADMIN_API_KEY** is set (same value you enter in the admin UI “admin key”).
- Optional: **ADMIN_USER_IDS** (comma-separated user UUIDs) so logged-in admins can call admin APIs without the key.

## 3. After deploy

- Open **Admin** → **Predictions** → a **closed** prediction → click **Settle: [option]**.
- You should see success and the settle block disappear, or a clear error (with `requestId` in toast/logs).
- If you still see 400, check Render logs for `[Admin/Settlement]` (requestId, validation rule, message).

## Summary

| What                | Where                         | How                        |
|---------------------|--------------------------------|----------------------------|
| Settlement fix      | This repo (client + server)   | Already in code            |
| Main app frontend   | Vercel (main app project)     | CD on push to `main`       |
| Backend             | Render (fan-club-z)           | Auto-deploy on push or manual |
| Admin auth          | Render env                    | Set `ADMIN_API_KEY`        |
