#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
DESC="${1:-Auto-deploy from Termux}"

echo "📦 Git commit & push"
git add .
git commit -m "$DESC" || echo "ℹ️ Nothing new"
git push origin main || echo "ℹ️ No remote or push failed (set up with: git remote add origin <url>)"

echo "🚀 Clasp push"
clasp push --force

echo "♻️ Deploy update"
clasp deploy --deploymentId "AKfycbzyRbe0-ZNEhwQ0YMBFfdyIb-CgmvqpWlIqzHvsAP_W85CC7OZCble_ztKSTdl9Z6QQsQ" --description "$DESC"

echo "✅ Done"
