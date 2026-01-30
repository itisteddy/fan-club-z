# Render build failure: npm ENOENT / cache

If the Render build fails with:

```text
npm error enoent Invalid response body while trying to fetch https://registry.npmjs.org/fs-minipass: ENOENT: no such file or directory, stat '.../content-v2/sha512/...'
```

that’s usually a **corrupt or missing npm cache** on Render.

## Fix 1: Clear build cache (fastest)

1. In **Render Dashboard** → your **fan-club-z** service.
2. Open **Settings** (or **Environment**).
3. Find **Build & Deploy** (or **Build**).
4. Use **Clear build cache** / **Clear cache and redeploy**, then trigger a new deploy.

## Fix 2: Use the updated build command

`render.yaml` is set to clear the npm cache before install:

```yaml
buildCommand: cd .. && npm cache clean --force && npm install --legacy-peer-deps && npm run build:server
```

If you **override the build command** in the Render dashboard, make sure it either:

- Matches the command above (run from repo root: `cd ..` then `npm cache clean --force && npm install --legacy-peer-deps && npm run build:server`), or  
- Starts with `npm cache clean --force &&` before `npm install`.

**Note:** If your dashboard shows something like `npm install --include=dev && npm run build:server`, that runs from the **server** directory (Render `rootDir: server`). To match the repo layout and avoid cache issues, use the full command from **repo root** as in `render.yaml`.

## Fix 3: Pin Node version (optional)

If problems continue, pin Node to an LTS version (e.g. 20) in Render:

- **Dashboard** → **Environment** → add `NODE_VERSION` = `20` (or `22`), or  
- In the repo root `package.json`, set `"engines": { "node": "20.x" }` and redeploy.
