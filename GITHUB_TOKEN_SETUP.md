# GitHub Authentication Setup

GitHub no longer accepts password authentication. You need to use a **Personal Access Token** instead.

## Quick Setup

1. **Generate a Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name: "Rorun Development"
   - Expiration: Choose duration (90 days recommended)
   - Select scopes: Check `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Push using the token**:
   ```bash
   cd /Users/efe/Library/CloudStorage/OneDrive-Personal/Rorun
   git push -u origin main
   ```
   - Username: `dev@hyperionixlabs.com`
   - Password: **Paste your Personal Access Token** (not your GitHub password)

## Alternative: Use SSH (More Secure)

1. **Generate SSH key**:
   ```bash
   ssh-keygen -t ed25519 -C "dev@hyperionixlabs.com"
   ```

2. **Add to GitHub**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   - Copy the output
   - Go to: https://github.com/settings/ssh/new
   - Paste and save

3. **Switch to SSH and push**:
   ```bash
   git remote set-url origin git@github.com:Dev-Hyperionixlabs/rorun.git
   git push -u origin main
   ```

## Current Status

Your code is committed locally and ready to push. Once you have a Personal Access Token, run:

```bash
git push -u origin main
```

Enter your email and the token when prompted.

