# GitHub Repository Setup Guide

This guide will help you push Reddit Copilot to GitHub.

## Initial Setup

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it: `reddit-copilot` (or your preferred name)
4. Description: "AI-Powered Reddit Marketing Automation Platform"
5. Choose Public or Private
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### 2. Connect Local Repository to GitHub

```bash
# Navigate to project directory
cd "D:\Reddit copilot"

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/reddit-copilot.git

# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/reddit-copilot.git
```

### 3. Stage and Commit Files

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: Reddit Copilot - AI-Powered Reddit Marketing Automation Platform"

# Push to GitHub
git branch -M main
git push -u origin main
```

## What Gets Committed

### ✅ Included Files
- All source code (`app/`, `components/`, `lib/`)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Documentation (`README.md`, `CONTRIBUTING.md`, etc.)
- Chrome extension source code
- Database migrations (`supabase_migration.sql`)
- Build scripts

### ❌ Excluded Files (via .gitignore)
- `node_modules/` - Dependencies
- `.next/` - Next.js build output
- `chrome-extension/build/` - Built extension
- `chrome-extension/dist/` - Distribution ZIPs
- `.env*` - Environment variables
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

## Repository Structure on GitHub

```
reddit-copilot/
├── .github/
│   └── workflows/
│       └── build.yml          # CI/CD workflow
├── app/                        # Next.js app
├── components/                 # React components
├── lib/                        # Utilities
├── chrome-extension/           # Extension source
│   ├── content.js
│   ├── popup.js
│   ├── manifest.json
│   └── ...
├── .gitignore                  # Git ignore rules
├── .gitattributes              # Git attributes
├── README.md                   # Main documentation
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── supabase_migration.sql      # Database schema
```

## GitHub Repository Settings

### Recommended Settings

1. **Description**: "AI-Powered Reddit Marketing Automation Platform with Chrome Extension"
2. **Topics**: Add relevant tags:
   - `reddit`
   - `automation`
   - `ai`
   - `marketing`
   - `nextjs`
   - `chrome-extension`
   - `supabase`
   - `gemini`

3. **Features to Enable:**
   - ✅ Issues
   - ✅ Projects
   - ✅ Wiki (optional)
   - ✅ Discussions (optional)

### Branch Protection (for main branch)

1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

## Environment Variables Setup

### GitHub Secrets (for CI/CD)

If using GitHub Actions, add these secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_AI_API_KEY`

**Settings → Secrets and variables → Actions → New repository secret**

## Release Management

### Creating Releases

1. **Update version in `package.json` and `chrome-extension/manifest.json`**
2. **Create a tag:**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

3. **Create GitHub Release:**
   - Go to Releases → "Draft a new release"
   - Choose the tag
   - Add release notes
   - Attach `chrome-extension/dist/reddit-copilot-extension-v1.0.0.zip`

## Common Commands

```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin main

# Create and switch to new branch
git checkout -b feature/new-feature

# Pull latest changes
git pull origin main

# View commit history
git log --oneline
```

## Troubleshooting

### Authentication Issues
- Use Personal Access Token instead of password
- Or set up SSH keys for GitHub

### Large Files
- Ensure `.gitignore` is working
- Check file sizes before committing
- Use Git LFS for large files if needed

### Merge Conflicts
- Pull latest changes before pushing
- Resolve conflicts manually
- Test after merging

## Next Steps After Pushing

1. ✅ Add repository description and topics
2. ✅ Enable Issues and Discussions
3. ✅ Set up branch protection rules
4. ✅ Add collaborators (if needed)
5. ✅ Create initial issues for known bugs/features
6. ✅ Set up GitHub Pages (if needed for documentation)

## Support

If you encounter issues:
- Check GitHub documentation
- Review `.gitignore` to ensure files aren't accidentally committed
- Verify remote URL is correct: `git remote -v`

