<p align="center">
  <img src="public/favicon.svg" alt="Airlock logo" width="96" height="96" />
</p>

# Airlock site

The marketing site for [Airlock](https://github.com/dotbrains/airlock) — a
single-page Vite + React + TypeScript app, terminal/dark theme, no runtime
dependencies beyond React.

It is standalone: it lives in the `site/` subdirectory and is **not** part of
the Bun monorepo workspace. Use `npm` here.

## Develop

```sh
cd site
npm install
npm run dev        # http://localhost:5173
```

## Build

```sh
npm run build      # type-checks (tsc) then bundles to dist/
npm run preview    # serve the production build locally
```

The build is multi-page: the landing page (`index.html`) and the docs page
(`docs.html`).

## Deploy to Vercel

This app lives in the `site/` subdirectory, so point Vercel at that directory:

1. In Vercel, **New Project** → import `dotbrains/airlock`.
2. Set **Root Directory** to `site`.
3. Framework preset auto-detects **Vite** (build `npm run build`, output `dist`).
4. Deploy.

Or from the CLI:

```sh
cd site
npx vercel            # first run links/creates the project
npx vercel --prod     # promote to production
```

### Custom domain

Add the domain in the Vercel project's **Domains** settings and point its DNS
at Vercel (an `A`/`CNAME` record per Vercel's instructions). No code change
needed.

## Editing content

All copy lives in [`src/data.ts`](src/data.ts) — browsers, the trace-surface
table, the two entry points, grants, config, install snippets, the deploy
matrix, and the session-lifecycle terminal. Layout is in
[`src/App.tsx`](src/App.tsx) (landing) and [`src/Docs.tsx`](src/Docs.tsx)
(docs); the interactive request builder is
[`src/SessionBuilder.tsx`](src/SessionBuilder.tsx); the theme is
[`src/index.css`](src/index.css).
