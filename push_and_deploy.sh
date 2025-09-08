#!/data/data/com.termux/files/usr/bin/bash
# push_and_deploy.sh — auto Git commit + push + Apps Script deploy

set -euo pipefail

# ── CONFIG ──
DEPLOYMENT_ID="AKfycbzyRbe0-ZNEhwQ0YMBFfdyIb-CgmvqpWlIqzHvsAP_W85CC7OZCble_ztKSTdl9Z6QQsQ"
DESC="${1:-Auto-deploy from Termux}"
# ─────────────

# Detect current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check clasp login
if [[ ! -f "$HOME/.clasprc.json" ]]; then
  echo "⚠️ You are not logged in to clasp. Opening login flow..."
  clasp login --no-localhost
fi

echo "📦 Git commit & push"
git add .
git commit -m "$DESC" || echo "ℹ️ Nothing new"
git push origin "$BRANCH" || echo "ℹ️ No remote set (use: git remote add origin <url>)"

echo "🚀 Clasp push"
clasp push --force

echo "♻️ Deploy update"
clasp deploy --deploymentId "$DEPLOYMENT_ID" --description "$DESC"

echo "✅ Deployment successful"
echo "🌍 Web app available at:"
echo "   https://script.google.com/macros/s/$DEPLOYMENT_ID/exec"
