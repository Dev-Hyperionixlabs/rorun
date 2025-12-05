#!/bin/bash

echo "🔧 Setting up GitHub access for Dev-Hyperionixlabs repository..."
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Check if already a git repository
if [ -d ".git" ]; then
    echo "✅ Git repository already initialized"
else
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Check current remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -n "$CURRENT_REMOTE" ]; then
    echo ""
    echo "⚠️  Current remote origin: $CURRENT_REMOTE"
    read -p "Do you want to change it to Dev-Hyperionixlabs/rorun? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Keeping existing remote. Exiting."
        exit 0
    fi
fi

# Ask user for preferred method
echo ""
echo "Choose your preferred GitHub access method:"
echo "1) HTTPS (easier, requires Personal Access Token)"
echo "2) SSH (more secure, requires SSH key setup)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    # HTTPS setup
    echo ""
    echo "📝 Setting up HTTPS remote..."
    echo ""
    echo "⚠️  You'll need a GitHub Personal Access Token:"
    echo "   1. Go to: https://github.com/settings/tokens"
    echo "   2. Generate new token (classic)"
    echo "   3. Select 'repo' scope"
    echo "   4. Copy the token"
    echo ""
    read -p "Press Enter when you have your token ready..."
    
    git remote add origin https://github.com/Dev-Hyperionixlabs/rorun.git
    echo "✅ HTTPS remote added"
    echo ""
    echo "When you push, use your Personal Access Token as the password"
    
elif [ "$choice" == "2" ]; then
    # SSH setup
    echo ""
    echo "🔐 Setting up SSH remote..."
    
    # Check if SSH key exists
    if [ -f ~/.ssh/id_ed25519.pub ] || [ -f ~/.ssh/id_rsa.pub ]; then
        echo "✅ SSH key found"
        
        # Test GitHub connection
        echo "Testing GitHub SSH connection..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo "✅ SSH connection to GitHub successful"
            git remote add origin git@github.com:Dev-Hyperionixlabs/rorun.git
            echo "✅ SSH remote added"
        else
            echo "❌ SSH connection failed"
            echo ""
            echo "To set up SSH:"
            echo "1. Generate key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
            echo "2. Add to GitHub: https://github.com/settings/ssh/new"
            echo "3. Copy your public key: cat ~/.ssh/id_ed25519.pub"
            exit 1
        fi
    else
        echo "❌ No SSH key found"
        echo ""
        read -p "Do you want to generate an SSH key now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter your email: " email
            ssh-keygen -t ed25519 -C "$email"
            eval "$(ssh-agent -s)"
            ssh-add ~/.ssh/id_ed25519
            echo ""
            echo "✅ SSH key generated!"
            echo ""
            echo "📋 Copy this public key and add it to GitHub:"
            echo "   https://github.com/settings/ssh/new"
            echo ""
            cat ~/.ssh/id_ed25519.pub
            echo ""
            read -p "Press Enter after adding the key to GitHub..."
            
            # Test connection
            if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
                git remote add origin git@github.com:Dev-Hyperionixlabs/rorun.git
                echo "✅ SSH remote added"
            else
                echo "❌ SSH connection still failing. Please check your setup."
                exit 1
            fi
        else
            echo "Switching to HTTPS method..."
            git remote add origin https://github.com/Dev-Hyperionixlabs/rorun.git
            echo "✅ HTTPS remote added (you'll need a Personal Access Token)"
        fi
    fi
else
    echo "❌ Invalid choice"
    exit 1
fi

# Verify remote
echo ""
echo "📋 Current remote configuration:"
git remote -v

echo ""
echo "✅ GitHub setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure the repository exists at: https://github.com/Dev-Hyperionixlabs/rorun"
echo "2. Add and commit your files:"
echo "   git add ."
echo "   git commit -m 'Initial commit: Rorun MVP'"
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "If the repository doesn't exist, create it first at:"
echo "https://github.com/organizations/Dev-Hyperionixlabs/repositories/new"

