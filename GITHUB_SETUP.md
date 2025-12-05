# GitHub Setup Guide - Dev-Hyperionixlabs

This guide will help you set up access to the Dev-Hyperionixlabs GitHub repository.

## Option 1: Clone Existing Repository

If the repository already exists and you want to clone it:

```bash
# Clone the repository
git clone https://github.com/Dev-Hyperionixlabs/rorun.git
# or if using SSH
git clone git@github.com:Dev-Hyperionixlabs/rorun.git

# Navigate into the directory
cd rorun
```

## Option 2: Initialize This Project and Push to GitHub

If you want to push this current Rorun project to the Dev-Hyperionixlabs repository:

### Step 1: Initialize Git (if not already done)

```bash
cd /Users/efe/Library/CloudStorage/OneDrive-Personal/Rorun

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Rorun MVP setup"
```

### Step 2: Set Up GitHub Access

#### A. Using HTTPS (Easier for beginners)

1. **Create Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name (e.g., "Rorun Development")
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Add Remote and Push**:
   ```bash
   # Add remote repository
   git remote add origin https://github.com/Dev-Hyperionixlabs/rorun.git
   
   # When prompted for password, use your Personal Access Token (not your GitHub password)
   git push -u origin main
   ```

#### B. Using SSH (More secure, recommended)

1. **Check if you have SSH keys**:
   ```bash
   ls -al ~/.ssh
   ```
   Look for `id_rsa.pub` or `id_ed25519.pub`

2. **Generate SSH key (if you don't have one)**:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default file location
   # Enter a passphrase (optional but recommended)
   ```

3. **Add SSH key to ssh-agent**:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

4. **Copy your public key**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the entire output
   ```

5. **Add SSH key to GitHub**:
   - Go to GitHub → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Title: "MacBook" (or your computer name)
   - Key: Paste your public key
   - Click "Add SSH key"

6. **Test SSH connection**:
   ```bash
   ssh -T git@github.com
   ```
   You should see: "Hi Dev-Hyperionixlabs! You've successfully authenticated..."

7. **Add Remote and Push**:
   ```bash
   # Add remote repository
   git remote add origin git@github.com:Dev-Hyperionixlabs/rorun.git
   
   # Push to GitHub
   git push -u origin main
   ```

### Step 3: Create Repository on GitHub (if it doesn't exist)

If the repository doesn't exist yet:

1. Go to https://github.com/organizations/Dev-Hyperionixlabs/repositories/new
   (Or https://github.com/new if it's your personal account)

2. Repository name: `rorun`
3. Description: "Rorun MVP - Tax compliance tool for Nigerian SMEs"
4. Choose: Private or Public
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

7. Then follow Step 2 above to push your code

## Option 3: Add Existing Project to Existing Repository

If the repository already exists and has some files:

```bash
cd /Users/efe/Library/CloudStorage/OneDrive-Personal/Rorun

# Add remote
git remote add origin https://github.com/Dev-Hyperionixlabs/rorun.git
# or for SSH:
git remote add origin git@github.com:Dev-Hyperionixlabs/rorun.git

# Fetch existing content
git fetch origin

# If repository has a main branch, merge it
git pull origin main --allow-unrelated-histories

# Resolve any conflicts if they occur, then:
git add .
git commit -m "Merge with remote repository"

# Push your code
git push -u origin main
```

## Verify Setup

Check your remote configuration:

```bash
git remote -v
```

Should show:
```
origin  https://github.com/Dev-Hyperionixlabs/rorun.git (fetch)
origin  https://github.com/Dev-Hyperionixlabs/rorun.git (push)
```

## Common Issues

### Issue: Permission Denied
**Solution**: Make sure you have access to the Dev-Hyperionixlabs organization, or the repository is public

### Issue: Repository Not Found
**Solution**: 
- Check the repository name is correct
- Verify you have access to the Dev-Hyperionixlabs organization
- Create the repository on GitHub first if it doesn't exist

### Issue: Authentication Failed
**Solution**:
- For HTTPS: Use Personal Access Token, not password
- For SSH: Make sure you added the SSH key to GitHub
- Test connection: `ssh -T git@github.com`

## Next Steps After Setup

1. **Set up branch protection** (if you're the admin):
   - Go to repository → Settings → Branches
   - Add rule for `main` branch
   - Require pull request reviews

2. **Set up GitHub Actions** (CI/CD):
   - Create `.github/workflows/ci.yml`
   - Automate tests and deployments

3. **Add collaborators**:
   - Repository → Settings → Collaborators
   - Add team members

4. **Create development workflow**:
   ```bash
   # Create and switch to development branch
   git checkout -b development
   git push -u origin development
   ```

## Quick Commands Reference

```bash
# Check status
git status

# Add files
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View remote
git remote -v

# Remove remote (if needed)
git remote remove origin
```

