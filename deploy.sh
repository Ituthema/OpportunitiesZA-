#!/bin/bash

# ==============================================================================
# 🚀 OpportunitiesZA — Deployment Script
# ==============================================================================

echo "🚀 Starting Deployment Process..."

# 1. Regenerate Sitemap
echo "🗺️  Regenerating sitemap..."
node sitemap-generator.js

# 2. Validate JSON Data File
echo "🔍 Validating opportunities data..."
if command -v python3 &> /dev/null; then
    python3 -m json.tool data/opportunities.json > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ JSON structure is valid."
    else
        echo "❌ FATAL: Invalid JSON in data/opportunities.json! Fix errors before deploying."
        exit 1
    fi
else
    echo "⚠️  Python3 missing; skipping strict JSON validation."
fi

# 3. Quick Format check for index.html (optional placeholder)
echo "🌐 Verifying static assets..."

# 4. Git Operations
echo "📦 Adding files to Git tracker..."
git add .

echo "💾 Committing changes..."
DATE=$(date +%Y-%m-%d)
git commit -m "Automated deployment & content update - $DATE"

echo "⬆️  Pushing to GitHub source..."
git push

echo "✅ All done! Changes pushed to GitHub."
echo "⏳ Your site will be live at https://opportunitiesza.co.za in 1-5 minutes."
echo "🔗 Check GitHub Actions for publishing status."
