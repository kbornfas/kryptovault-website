#!/bin/bash

echo "🚀 KryptoVault Deployment Script"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found. Creating from example..."
    cp .env.production.example .env.production
    echo ""
    echo "📝 Please edit .env.production with your production values:"
    echo "   - Set a strong DB_PASSWORD"
    echo "   - Set a strong JWT_SECRET (32+ characters)"
    echo "   - Set your FRONTEND_URL"
    echo ""
    read -p "Press enter when you're ready to continue..."
fi

echo ""
echo "🏗️  Building Docker images..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🚀 Starting services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start services. Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📍 Your application is now running:"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost:3000"
echo "   Database: localhost:5432"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update app:       git pull && docker-compose up -d --build"
echo ""
echo "🔐 Don't forget to:"
echo "   1. Set up SSL/HTTPS for production"
echo "   2. Configure your firewall"
echo "   3. Set up regular backups"
echo "   4. Create an admin user"
echo ""
