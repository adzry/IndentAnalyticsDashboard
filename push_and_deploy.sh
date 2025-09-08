#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
DESC="${1:-Auto-deploy from Termux}"

echo "📂 Syncing repo..."
git pull origin main

echo "📦 Git commit & push"
git add .
git commit -m "$DESC" || echo "ℹ️ Nothing new"
git push origin main || echo "ℹ️ No remote or push failed (set up with: git remote add origin <url>)"

echo "🚀 Clasp push (force sync of src/)"
clasp push --force

echo "♻️ Deploy update"
clasp deploy --deploymentId "AKfycbza0D6YakMQZ0Y1wcYqIIdyTAaIyboFfcztVWEdUTnIaeLbXeqE3rZ9GhVGp3Y9OZ23hQ" --description "$DESC"

echo "✅ Deployment successful"
