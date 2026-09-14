# GitHub Pages Automated Deployment Guide

This project is configured for **automatic deployment to GitHub Pages**. Every time you push changes to the `main` branch, your site will automatically build and deploy.

## Quick Setup

### 1. Enable GitHub Pages (One-Time Setup)

1. Go to your GitHub repository
2. Click **Settings** → **Pages** (in the sidebar)
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
4. Save the settings

That's it! The automated workflow is already configured.

### 2. Repository Settings

Your repository name determines the URL structure. Based on the current configuration:

- **Repository Name**: `NetBond_Advanced`
- **Your Site URL**: `https://[your-username].github.io/NetBond_Advanced/`

If you want to change the repository name:
1. Go to **Settings** → **General**
2. Update the repository name
3. Update the base path in `package.json`:
   ```json
   "build:gh-pages": "vite build --base=/[NEW_REPO_NAME]/ --mode production"
   ```

## How It Works

### Automated Workflow

The `.github/workflows/gh-pages.yml` workflow automatically:

1. **Triggers on**:
   - Every push to the `main` branch
   - Manual trigger via Actions tab
   - Skips deployment for markdown-only changes

2. **Build Process**:
   - Checks out your code
   - Sets up Node.js 20.x
   - Caches dependencies for faster builds
   - Installs dependencies
   - Builds the production bundle
   - Uploads build artifacts

3. **Deployment**:
   - Deploys to GitHub Pages
   - Provides deployment URL
   - Shows build summary in Actions tab

### Build Configuration

The project uses Vite with production optimizations:

```json
"build:gh-pages": "vite build --base=/NetBond_Advanced/ --mode production"
```

This ensures all assets load correctly with the proper base path.

## Making Changes and Deploying

### Standard Workflow

1. **Make your changes** locally in your code editor
2. **Test locally** (optional):
   ```bash
   npm run dev
   ```
3. **Build and test production build** (optional):
   ```bash
   npm run build:gh-pages
   npm run preview
   ```
4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
5. **Automatic deployment happens**:
   - GitHub Actions detects the push
   - Builds your project
   - Deploys to GitHub Pages
   - Usually takes 1-3 minutes

### Monitoring Deployments

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You'll see the deployment workflow running
4. Click on a workflow run to see detailed logs
5. Once complete, visit your site URL to see the changes

### Manual Deployment

If you want to trigger a deployment manually:

1. Go to **Actions** tab
2. Click "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## Troubleshooting

### Changes Not Appearing?

1. **Check workflow status**:
   - Go to Actions tab
   - Look for failed workflows (red X)
   - Click to see error details

2. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

3. **Verify GitHub Pages is enabled**:
   - Settings → Pages
   - Source should be "GitHub Actions"

4. **Check build logs**:
   - Actions tab → Latest workflow run
   - Look for build errors

### Build Failures?

Common issues:

1. **TypeScript errors**: Fix type errors in your code
2. **Missing dependencies**: Run `npm install` and commit `package-lock.json`
3. **Environment variables**: Ensure no required env vars are missing

### Site Shows 404?

1. **Verify base path** matches repository name in `package.json`
2. **Check repository settings** for correct GitHub Pages source
3. **Wait a few minutes** for initial deployment to propagate

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── gh-pages.yml      # Automated deployment workflow
├── src/                       # Source code
├── dist/                      # Built files (auto-generated, ignored by git)
├── package.json               # Project configuration
├── vite.config.ts            # Build configuration
└── GITHUB_PAGES_SETUP.md     # This file
```

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Add a `CNAME` file to the `public/` directory:
   ```
   yourdomain.com
   ```
2. Configure DNS settings at your domain provider
3. Enable custom domain in GitHub Settings → Pages

### Environment Variables

For environment-specific configurations:

1. Create `.env.production` for production-only vars
2. Ensure sensitive data is NOT committed
3. Use GitHub Secrets for sensitive values if needed

### Optimization

The build is already optimized with:
- Code splitting
- Tree shaking
- Minification
- Gzip compression
- PWA support
- Asset optimization

### Build Scripts

Available npm scripts:

```bash
npm run dev              # Local development server
npm run build            # Standard production build
npm run build:gh-pages   # Build for GitHub Pages (correct base path)
npm run preview          # Preview production build locally
npm run test             # Run tests
```

## Getting Help

If you encounter issues:

1. Check the **Actions** tab for error messages
2. Review **build logs** for specific errors
3. Ensure all dependencies are installed
4. Verify GitHub Pages is properly enabled
5. Check that your base path matches your repository name

## Summary

**You're all set!** Just push your changes to the `main` branch and GitHub will automatically build and deploy your site. No manual deployment steps needed.

Your workflow:
1. Code → Commit → Push
2. ☕ Wait 1-3 minutes
3. ✅ Changes are live!

Check the Actions tab anytime to monitor deployments.
