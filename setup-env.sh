#!/bin/bash

echo "🔧 Setting up database environment for this project..."
echo ""
echo "📋 Steps to complete:"
echo "1. Go to your Render dashboard: https://dashboard.render.com"
echo "2. Click on your database: 'product-conflicts-db'"
echo "3. Go to the 'Info' tab"
echo "4. Copy the 'Internal Database URL'"
echo "5. Paste it below (it should look like: postgresql://user:password@host:port/database)"
echo ""
echo "Enter your database connection string:"
read -r DATABASE_URL

# Update the .env.local file
echo "export DATABASE_URL=\"$DATABASE_URL\"" > .env.local

echo ""
echo "✅ Environment variable set successfully!"
echo "📁 Stored in: .env.local (project-specific)"
echo ""
echo "🚀 Now you can run: npm run setup-db"
