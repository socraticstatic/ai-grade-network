# GitHub Pages Deployment Guide

This guide explains how to deploy this application to GitHub Pages using GitHub Actions.

## Prerequisites

- A GitHub account
- This repository pushed to GitHub
- Node.js and npm installed locally

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings"
3. In the left sidebar, click on "Pages"
4. Under "Source", select "GitHub Actions"

### 2. Push Your Code

Push your code to the `main` branch (or your default branch). The GitHub Action will automatically:

1. Install dependencies
2. Build the production version of your app
3. Deploy it to the `gh-pages` branch

### 3. View Your Site

Your site will be available at:
`https://<your-username>.github.io/att-netbond-sdci/`

## Manual Deployment

If you need to deploy manually:

```bash
# Install dependencies
npm install

# Build for GitHub Pages
npm run build:gh-pages

# Deploy to GitHub Pages
npx gh-pages -d dist
```

## Custom Domain (Optional)

To use a custom domain:

1. Create a `CNAME` file in the `public` directory with your domain
2. Configure your DNS settings to point to GitHub Pages
3. In GitHub repository settings, go to Pages and add your custom domain

## Troubleshooting

- If the page is blank, check the browser console for 404 errors
- Ensure the `base` in `vite.config.ts` matches your repository name
- Check GitHub Actions workflow runs for any build errors
