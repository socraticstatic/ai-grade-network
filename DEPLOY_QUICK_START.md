# Quick Deployment Guide

## TL;DR

**Your site auto-deploys to GitHub Pages when you push to `main`.**

## Initial Setup (Do Once)

1. Go to your repo on GitHub
2. **Settings** → **Pages**
3. Under "Build and deployment" → **Source**: Select **"GitHub Actions"**
4. Done!

## Daily Workflow

```bash
# Make your changes, then:
git add .
git commit -m "Your changes"
git push origin main

# That's it! GitHub deploys automatically in 1-3 minutes.
```

## View Your Site

Your site will be at:
```
https://[your-github-username].github.io/NetBond_Advanced/
```

## Check Deployment Status

1. Go to your repo on GitHub
2. Click **Actions** tab
3. See the deployment progress

## Common Commands

```bash
# Test locally before pushing
npm run dev                    # Development server at localhost:5173

# Build and test production version locally
npm run build:gh-pages         # Build
npm run preview                # Preview at localhost:4173

# Deploy (automatic, but can do manually)
git push origin main           # Automatic deployment triggers
```

## Troubleshooting

**Changes not showing?**
- Wait 2-3 minutes for deployment
- Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check Actions tab for errors

**Build failing?**
- Check Actions tab for error details
- Fix errors, commit, and push again

## Need More Help?

See full documentation: [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md)
