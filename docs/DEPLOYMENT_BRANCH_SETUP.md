# Setting Production Branch in Vercel and Render

**Goal:** Configure production deployments to use `release/web-stable` branch only, preventing iOS changes from breaking web production.

---

## Vercel Configuration

### Step 1: Access Project Settings
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **Fan Club Z** project (or the project name you're using)
3. Click on the **Settings** tab (gear icon in the top navigation)

### Step 2: Navigate to Git Settings
1. In the left sidebar, click **Git**
2. You'll see a section called **Production Branch**

### Step 3: Change Production Branch
1. In the **Production Branch** dropdown, you'll see the current branch (likely `main`)
2. Click the dropdown and select **`release/web-stable`**
   - If `release/web-stable` doesn't appear in the list, you need to push the branch first:
     ```bash
     git push origin release/web-stable
     ```
   - Then refresh the Vercel page and the branch should appear

### Step 4: Save Changes
1. Click **Save** (or the changes may auto-save)
2. You should see a confirmation message

### Step 5: Verify
1. Go to the **Deployments** tab
2. Check that the latest production deployment (if any) shows it's from `release/web-stable`
3. Future deployments will automatically use `release/web-stable` for production

### Step 6: Preview Deployments (Optional)
- Other branches (like `main` or `release/ios-store`) will still create **Preview Deployments**
- These are safe to test without affecting production
- You can access preview deployments via the Deployments tab

---

## Render Configuration

### Step 1: Access Your Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on your **web service** (the one that serves your production web app)
   - This might be named something like "fan-club-z" or "fanclubz-web"

### Step 2: Open Service Settings
1. In the service page, click on **Settings** in the left sidebar
2. Scroll down to the **Build & Deploy** section

### Step 3: Change Branch
1. Find the **Branch** field (under Build & Deploy)
2. The current value is likely `main`
3. Change it to: **`release/web-stable`**
   - Type it directly or select from dropdown if available

### Step 4: Save Changes
1. Scroll to the bottom of the Settings page
2. Click **Save Changes** button
3. Render will show a confirmation

### Step 5: Trigger Manual Deploy (Optional)
1. After saving, you may want to trigger a manual deploy to verify
2. Go to the **Manual Deploy** section (or **Events** tab)
3. Click **Deploy latest commit** and select `release/web-stable`
4. This ensures production is running from the stable branch

### Step 6: Verify
1. Go to the **Events** tab
2. Check the latest deployment shows it's from `release/web-stable` branch
3. Future automatic deployments will use `release/web-stable`

---

## Important Notes

### Before You Change the Branch

**Make sure `release/web-stable` branch exists and is pushed:**
```bash
# Check if branch exists locally
git branch -a | grep release/web-stable

# If it doesn't exist remotely, push it
git push origin release/web-stable
```

### After Changing the Branch

1. **Monitor the first deployment** from `release/web-stable` to ensure it works correctly
2. **Check production** after deployment:
   - [ ] Web login works
   - [ ] Predictions load
   - [ ] Wallet displays correctly
   - [ ] No new errors in console

### What Happens to Other Branches?

- **`main` branch**: Will still create preview deployments (Vercel) or can be configured as a separate service (Render)
- **`release/ios-store` branch**: Can be used for iOS-specific preview builds, but will never deploy to production web

### Rollback Plan

If something goes wrong after switching branches:

1. **Quick rollback**: Change the production branch back to `main` temporarily
2. **Proper rollback**: Use the rollback procedure in `docs/RELEASE_WORKFLOW.md`:
   ```bash
   # Reset release/web-stable to a known good commit
   git checkout release/web-stable
   git reset --hard web-stable-2026-01-23
   git push origin release/web-stable --force
   ```
   Then trigger a new deployment

---

## Troubleshooting

### "Branch not found" in Vercel/Render
- **Solution**: Push the branch to remote first:
  ```bash
  git push origin release/web-stable
  ```
- Then refresh the Vercel/Render page

### "Deployment failed" after switching
- Check the deployment logs in Vercel/Render
- Verify `release/web-stable` has all necessary files
- Ensure build commands work on that branch

### "Production still deploying from main"
- Double-check the branch setting was saved
- Clear browser cache and refresh
- Check if there are multiple services/projects (you might have updated the wrong one)

---

## Verification Checklist

After completing both configurations:

- [ ] Vercel Production Branch = `release/web-stable`
- [ ] Render Branch = `release/web-stable`
- [ ] Both branches exist in remote repository
- [ ] Latest production deployment shows `release/web-stable` as source
- [ ] Production web app still works correctly
- [ ] Preview deployments from other branches still work (optional)

---

## Next Steps

Once production is locked to `release/web-stable`:

1. All future web production deployments will come from `release/web-stable` only
2. iOS work in `release/ios-store` cannot accidentally break production
3. You can safely iterate on iOS without affecting web users
4. Follow the merge policy in `docs/RELEASE_WORKFLOW.md` when updating `release/web-stable`
