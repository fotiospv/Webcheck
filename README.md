# Webcheck

Webcheck runs a set of both automated and manual (with guidance) checks on a public website and reports potential quality issues. 

Automated tests check things such as page loading, broken images and links, accessibility basics, browser errors, failed requests, and page structure.
Manual tests are about visual clarity and things easier to "catch" with human eyes.

Results can be:
- PASS — the check completed successfully.
- FAILED — a potential issue was detected.
- SKIPPED — the check does not apply or was skipped intentionally.

## Run locally

Requires Node.js 20+.

```bash
npm install
npx playwright install chromium
npm run dev