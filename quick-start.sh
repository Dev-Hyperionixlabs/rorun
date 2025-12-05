#!/bin/bash

echo "🚀 Rorun MVP - Quick Start"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting services with Docker Compose..."
cd server
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "📦 Installing backend dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "  - API Server: http://localhost:3000"
echo "  - API Docs: http://localhost:3000/api"
echo ""
echo "Next steps:"
echo "  1. Start the API: cd server && npm run dev"
echo "  2. Test the API: curl http://localhost:3000/health"
echo "  3. View database: npm run prisma:studio"
echo ""
echo "📖 See TESTING.md for detailed testing instructions"

