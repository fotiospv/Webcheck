# WebCheck QA

A small QA portfolio project that performs browser-based quality checks against public websites.

## Current V0.1 scope

The first version intentionally focuses on a small set of repeatable checks:

- target page loads
- page title exists
- HTML language is declared
- images load
- internal links are reachable
- form controls have accessible labels
- browser console errors
- failed network requests
- obvious desktop horizontal overflow
- main heading exists

Each check returns:

- `PASS`
- `FAILED`
- `SKIPPED`

## Important scope limitation

This is not a security scanner and it is not a replacement for a human QA engineer. It is designed for public, browser-accessible websites. CAPTCHA, authentication, bot protection, rate limiting, highly dynamic applications and other restrictions can affect results.

## Tech stack

- React + TypeScript + Vite
- Node.js + Express
- Playwright
- Chromium

## Run locally

Requirements:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite development server proxies API requests only if configured later; for the current development setup, use the provided Vite app and API server together.

## QA roadmap

Planned next iterations:

- dedicated test case metadata
- severity and priority for findings
- detailed defect reports
- manual investigation workflow
- API testing
- Playwright tests for WebCheck itself
- GitHub Actions CI
- test history
- improved scoring model
- production deployment
