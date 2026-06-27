#!/usr/bin/env bash
# Vercel production build for the Plynth monorepo.
#
# One Vercel project serves all three SPAs from path prefixes:
#   /broker/  /lender/  /admin/   (+ a portal-chooser at /)
# Each app's vite `base` is set to its prefix; vercel.json rewrites
# /<app>/:path* -> /<app>/index.html for client-side routing.
#
# This lives in a script (not inline in vercel.json) because Vercel
# caps buildCommand at 256 chars.
set -euo pipefail

pnpm install --frozen-lockfile
pnpm -r build

rm -rf dist-vercel
mkdir -p dist-vercel
cp -r apps/broker/dist dist-vercel/broker
cp -r apps/lender/dist dist-vercel/lender
cp -r apps/admin/dist  dist-vercel/admin
cp public/index.html   dist-vercel/index.html
cp public/robots.txt   dist-vercel/robots.txt
cp public/sitemap.xml  dist-vercel/sitemap.xml
