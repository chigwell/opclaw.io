This is a Next.js landing page, configured for static export and deployment to Cloudflare Pages via Wrangler.

## Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Build

Static export output is written to `out/`.

```bash
npm run build:cf
```

## Deploy (Cloudflare Pages)

```bash
npm run deploy:cf
```

## Notes

- `next.config.ts` sets `output: "export"` for static builds.
- `wrangler pages deploy out --project-name molt-tech-landing` is wrapped by `npm run deploy:cf`.
