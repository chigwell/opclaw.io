<div align="center">
  <a target="_blank" href="https://molt.tech/?utm_source=github&utm_medium=readme">
   <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=molt.tech&fontSize=50&fontAlignY=35&animation=fadeIn&fontColor=FFFFFF&descAlignY=55&descAlign=62" alt="molt.tech" width="100%" />
  </a>
</div>

This is the landing page for https://molt.tech/, used to deploy https://molt.bot/ instances remotely and privately. Each VPS includes 4 vCPU cores, 8 GB RAM, 150 GB SSD, and a 200 Mbit/s port, starting at $10/month.

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
