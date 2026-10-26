# Invento web app

Vite, React, TypeScript, Tailwind CSS and TanStack Query. It talks only to the gateway (`VITE_API_URL`, default `http://localhost:4000/api/v1`; copy `.env.example` to `.env.local` to change it).

```
npm install
npm run dev          # http://localhost:5173
npm test
npm run lint
npm run build        # static files in dist/
npm run icons        # regenerate the logo, favicon and app icons in public/
```

Start the whole system (with Postgres and Redis) from the `backend/` repository: `python run.py --all`.

The mark is an isometric box generated from one definition by `scripts/make-icons.mjs`. The Terms and Privacy pages describe what the software does and need your organization's own legal review before launch.

This repository has no Dockerfile or web-server config on purpose: the deployment team adds them (it builds to static files).
