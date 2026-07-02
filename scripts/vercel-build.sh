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
cp -r apps/broker/dist  dist-vercel/broker
cp -r apps/lender/dist  dist-vercel/lender
cp -r apps/admin/dist   dist-vercel/admin
cp -r apps/seoteam/dist dist-vercel/seoteam
cp public/index.html   dist-vercel/index.html
cp public/robots.txt   dist-vercel/robots.txt
# NOTE: sitemap.xml is no longer a static file — it is served dynamically by
# api/sitemap.ts (rewritten from /sitemap.xml in vercel.json) so newly published
# blog posts appear without a redeploy. A physical dist-vercel/sitemap.xml would
# shadow that rewrite, so do NOT copy public/sitemap.xml here.
