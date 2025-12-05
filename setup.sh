#!/bin/bash

echo "🚀 Setting up Rorun MVP..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Copy env files
echo ""
echo "📝 Creating .env.local files from examples..."

if [ ! -f "server/.env.local" ]; then
    cp server/.env.example server/.env.local
    echo "✅ Created server/.env.local"
else
    echo "⚠️  server/.env.local already exists, skipping..."
fi

if [ ! -f "mobile/.env.local" ]; then
    cp mobile/.env.example mobile/.env.local
    echo "✅ Created mobile/.env.local"
else
    echo "⚠️  mobile/.env.local already exists, skipping..."
fi

if [ ! -f "ai-service/.env.local" ]; then
    cp ai-service/.env.example ai-service/.env.local
    echo "✅ Created ai-service/.env.local"
else
    echo "⚠️  ai-service/.env.local already exists, skipping..."
fi

if [ ! -f "admin/.env.local" ]; then
    cp admin/.env.example admin/.env.local
    echo "✅ Created admin/.env.local"
else
    echo "⚠️  admin/.env.local already exists, skipping..."
fi

# Generate secrets
echo ""
echo "🔐 Generating secure secrets..."

if command -v openssl &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
    ADMIN_SECRET=$(openssl rand -base64 32)
    
    # Update server .env.local with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|your-super-secret-jwt-key-change-in-production|$JWT_SECRET|g" server/.env.local
        sed -i '' "s|change-this-in-production|$ADMIN_SECRET|g" server/.env.local
    else
        # Linux
        sed -i "s|your-super-secret-jwt-key-change-in-production|$JWT_SECRET|g" server/.env.local
        sed -i "s|change-this-in-production|$ADMIN_SECRET|g" server/.env.local
    fi
    
    echo "✅ Generated and set JWT_SECRET"
    echo "✅ Generated and set ADMIN_SECRET"
else
    echo "⚠️  OpenSSL not found. Please manually set JWT_SECRET and ADMIN_SECRET in server/.env.local"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install backend dependencies
echo "Installing server dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "⚠️  node_modules exists, skipping npm install. Run 'npm install' manually if needed."
fi
cd ..

# Install mobile dependencies
echo "Installing mobile dependencies..."
cd mobile
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "⚠️  node_modules exists, skipping npm install. Run 'npm install' manually if needed."
fi
cd ..

# Install admin dependencies
echo "Installing admin dependencies..."
cd admin
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "⚠️  node_modules exists, skipping npm install. Run 'npm install' manually if needed."
fi
cd ..

# Install AI service dependencies
echo "Installing AI service dependencies..."
cd ai-service
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "⚠️  node_modules exists, skipping npm install. Run 'npm install' manually if needed."
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo ""
echo "1. Edit server/.env.local and fill in:"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - AWS credentials (or use MinIO for local development)"
echo "   - Twilio credentials (optional - OTP will log to console in dev)"
echo "   - Firebase credentials (optional - notifications will log to console in dev)"
echo ""
echo "2. Set up your database:"
echo "   cd server"
echo "   npm run prisma:generate"
echo "   npm run prisma:migrate"
echo "   npm run prisma:seed"
echo ""
echo "3. Start the services:"
echo "   Backend:  cd server && npm run dev"
echo "   Mobile:   cd mobile && npm start"
echo "   Admin:    cd admin && npm run dev"
echo "   AI:       cd ai-service && npm run dev"
echo ""
echo "📖 For detailed setup instructions, see SETUP.md"

