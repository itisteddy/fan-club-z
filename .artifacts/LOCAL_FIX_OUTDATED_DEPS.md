## restore/pre-audit-local
 D client/dist/assets/index-971fa00f.js
 D client/dist/assets/index-e3616d76.css
 D client/dist/assets/ui-25d22b63.js
 D client/dist/assets/utils-9273f6b3.js
 D client/dist/assets/vendor-3a7118c2.js
 D client/dist/favicon.svg
 D client/dist/icons/fc-logo-192.svg
 D client/dist/icons/fc-logo-512.svg
 D client/dist/index.html
 D client/dist/manifest.json
 D client/dist/manifest.webmanifest
 D client/dist/registerSW.js
 D client/dist/sw.js
 D client/dist/workbox-4c320e2c.js
 M client/public/version.json
 M client/src/lib/logger.ts
 D client/src/utils/logger.ts
?? .artifacts/HARD_RESTORE_LOG.md
?? .artifacts/LOCAL_FIX_OUTDATED_DEPS.md
?? .artifacts/files.lst
?? .artifacts/src.md5
?? pnpm-lock.yaml
v22.17.1
10.16.1
workspace: no
@fanclubz/client
{
  "@fanclubz/shared": "file:../shared",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@supabase/supabase-js": "^2.39.1",
  "zustand": "^4.4.7",
  "@tanstack/react-query": "^5.14.2",
  "wouter": "^3.0.0",
  "framer-motion": "^10.16.16",
  "tailwindcss": "^3.4.0",
  "@tailwindcss/forms": "^0.5.7",
  "@tailwindcss/typography": "^0.5.10",
  "lucide-react": "^0.303.0",
  "react-hot-toast": "^2.4.1",
  "react-hook-form": "^7.48.2",
  "@hookform/resolvers": "^3.3.2",
  "zod": "^3.22.4",
  "date-fns": "^3.0.6",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.2.0",
  "class-variance-authority": "^0.7.0",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-avatar": "^1.0.4",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-switch": "^1.0.3",
  "@radix-ui/react-toast": "^1.1.5",
  "react-intersection-observer": "^9.5.3",
  "socket.io-client": "^4.7.4"
}
{
  "@typescript-eslint/eslint-plugin": "^6.16.0",
  "@typescript-eslint/parser": "^6.16.0",
  "@types/react": "^18.2.45",
  "@types/react-dom": "^18.2.18",
  "@vitejs/plugin-react": "^4.1.1",
  "autoprefixer": "^10.4.16",
  "eslint": "^8.56.0",
  "eslint-plugin-react-hooks": "^4.6.0",
  "eslint-plugin-react-refresh": "^0.4.5",
  "postcss": "^8.4.32",
  "typescript": "^5.3.3",
  "vite": "^4.4.9",
  "vite-plugin-pwa": "^0.17.4"
}
Scope: all 5 projects
undefined
/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/server:
 ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"
undefined
undefined
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
.                                        | +138 ++++++++++++++
diff --git a/client/src/utils/pwa.ts b/client/src/utils/pwa.ts
index 997225b..0b020c8 100644
--- a/client/src/utils/pwa.ts
+++ b/client/src/utils/pwa.ts
@@ -22,8 +22,11 @@ export class PWAManager {
   }
 
   private init() {
-    // Register service worker
-    this.registerServiceWorker();
+    // dev-skip: ensure no SW registration in dev
+    if (import.meta.env.PROD) {
+      // Register service worker
+      this.registerServiceWorker();
+    }
     
     // Check if app is already installed
     this.checkInstallStatus();
diff --git a/client/vite.config.ts b/client/vite.config.ts
index 19e52c5..1b994b8 100644
--- a/client/vite.config.ts
+++ b/client/vite.config.ts
@@ -77,6 +77,7 @@ export default defineConfig({
   },
   optimizeDeps: {
     include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
+    force: true,
   },
   esbuild: {
     target: 'es2022',

> @fanclubz/client@2.0.77 dev /Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/client
> vite -- --force

 ELIFECYCLE  Command failed.
 WARN   Local package.json exists, but node_modules missing, did you mean to install?
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0  0 36979    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
HTTP/1.1 200 OK
Vary: Origin
Content-Type: application/javascript
Content-Length: 36979
Last-Modified: Sun, 14 Sep 2025 22:50:06 GMT
ETag: W/"36979-1757890206335"
Cache-Control: no-cache
Date: Sun, 14 Sep 2025 22:50:25 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Sanity: ok - All React deps serving HTTP 200
✅ FIXED: Outdated Optimize Dep 504 errors resolved
Dev server running at: http://localhost:5173/
