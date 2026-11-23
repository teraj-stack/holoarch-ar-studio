#!/usr/bin/env zsh
cd "$(dirname "$0")"
export NODE_ENV=production
export PORT=3003
echo "Uruchamiam HoloArch AR Studio na http://localhost:3003 ..."
exec npx tsx server.ts
